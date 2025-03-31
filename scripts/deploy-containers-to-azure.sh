#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Check if the required environment variables are set
AZURE_APP_ENV_NAME="${AZURE_APP_ENV_NAME:?Exception: Missing AZURE_APP_ENV_NAME}"
AZURE_DOMAIN_NAME="${AZURE_DOMAIN_NAME:?Exception: Missing AZURE_DOMAIN_NAME}"
AZURE_LOCATION="${AZURE_LOCATION:?Exception: Missing AZURE_LOCATION}"
AZURE_TLS_SECRET_NAME="${AZURE_TLS_SECRET_NAME:?Exception: Missing AZURE_TLS_SECRET_NAME}"
AZURE_APP_NAME="${AZURE_APP_NAME:?Exception: Missing AZURE_APP_NAME}"

# Set variables for AKS deployment
AZURE_ACI_SUBNET_NAME="$AZURE_APP_ENV_NAME-aci-subnet"
AZURE_AKS_NAME="$AZURE_APP_ENV_NAME-k8s"
AZURE_BROWSERLESS_SERVICE_NAME="$AZURE_APP_NAME-service"
AZURE_CONTAINER_NAME="$AZURE_APP_NAME"
AZURE_DEPLOYMENT_NAME="$AZURE_APP_NAME"
AZURE_HTTP_INGRESS_IP_NAME="$AZURE_APP_ENV_NAME-http-ingress-ip"
AZURE_WS_INGRESS_IP_NAME="$AZURE_APP_ENV_NAME-ws-ingress-ip"
AZURE_NSG_NAME="$AZURE_APP_ENV_NAME-nsg"
AZURE_RESOURCE_GROUP="$AZURE_APP_ENV_NAME-resource-group"
AZURE_SUBNET_NAME="$AZURE_APP_ENV_NAME-subnet"
AZURE_VNET_NAME="$AZURE_APP_ENV_NAME-vnet"
DOCKER_IMAGE_NAME="ghcr.io/aident-ai/open-cuak-browserless"
DOCKER_IMAGE_TAG="latest"

# Optional: override the domain names for WS
AZURE_WS_DOMAIN_NAME="${AZURE_WS_DOMAIN_NAME:-ws.${AZURE_DOMAIN_NAME}}"

# Export variables for envsubst in YAML files
export AZURE_BROWSERLESS_SERVICE_NAME
export AZURE_DEPLOYMENT_NAME
export AZURE_APP_NAME
export AZURE_CONTAINER_NAME
export AZURE_DOMAIN_NAME
export AZURE_WS_DOMAIN_NAME
export AZURE_TLS_SECRET_NAME
export AZURE_HTTP_INGRESS_IP_NAME
export AZURE_WS_INGRESS_IP_NAME
export AZURE_RESOURCE_GROUP
export DOCKER_IMAGE_NAME
export DOCKER_IMAGE_TAG
export REUSED_CERT_NAME
export REUSED_SECRET_NAME

# Optionally, a timestamp for revision purposes
FORCE_REVISION_TIMESTAMP=$(date +%s)

# Function to handle script errors
handle_error() {
  echo "ERROR: Deployment failed at line $1"
  exit 1
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# Function to check if we've hit Let's Encrypt rate limits
detect_rate_limit() {
  if kubectl get order -A 2>/dev/null | grep -q "rateLimited"; then
    echo "Let's Encrypt rate limit detected."
    return 0
  fi
  return 1
}

# Function to find and reuse a valid certificate
find_valid_certificate() {
  echo "Checking for valid certificates to reuse..."

  # First: Check if we need to check for certificates with alternate domains
  local DOMAINS_TO_CHECK=("${AZURE_DOMAIN_NAME}" "${AZURE_WS_DOMAIN_NAME}")
  local LEGACY_DOMAINS=()

  # If we detect we've migrated from browserless.aident.ai to browser.aident.ai
  if [[ "${AZURE_DOMAIN_NAME}" == "browser.aident.ai" ]]; then
    echo "Domain migration detected (from browserless.aident.ai to browser.aident.ai)"
    LEGACY_DOMAINS+=("browserless.aident.ai" "ws.browserless.aident.ai")
  fi

  # First: Check certificate objects in the cluster
  local CERT_LIST=$(kubectl get certificate -o 'custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,SECRET:.spec.secretName' --sort-by=.metadata.creationTimestamp 2>/dev/null | tac || echo "")

  if [ -n "$CERT_LIST" ] && [ "$CERT_LIST" != "No resources found" ]; then
    local CERT_NAMES=$(echo "$CERT_LIST" | grep -v "NAME" | awk '{print $1}')

    for CERT_NAME in $CERT_NAMES; do
      local SECRET_NAME=$(kubectl get certificate "$CERT_NAME" -o jsonpath='{.spec.secretName}' 2>/dev/null || echo "")
      if [ -n "$SECRET_NAME" ] && check_valid_certificate_secret "$SECRET_NAME"; then
        return 0
      fi
    done
  fi

  # Second: Check TLS secrets directly
  local SECRET_LIST=$(kubectl get secrets --field-selector type=kubernetes.io/tls -o name 2>/dev/null || echo "")
  if [ -n "$SECRET_LIST" ]; then
    for SECRET in $SECRET_LIST; do
      local SECRET_NAME=$(echo "$SECRET" | sed 's|^secret/||')
      if check_valid_certificate_secret "$SECRET_NAME"; then
        return 0
      fi
    done
  fi

  # Third: Check all secrets for valid certificate data
  local ALL_SECRETS=$(kubectl get secrets -o name 2>/dev/null | grep -v "default-token" || echo "")
  if [ -n "$ALL_SECRETS" ]; then
    for SECRET in $ALL_SECRETS; do
      local SECRET_NAME=$(echo "$SECRET" | sed 's|^secret/||')
      # Only check secrets with certificate data
      if kubectl get secret "$SECRET_NAME" -o jsonpath='{.data.tls\.crt}' &>/dev/null &&
        kubectl get secret "$SECRET_NAME" -o jsonpath='{.data.tls\.key}' &>/dev/null; then
        if check_valid_certificate_secret "$SECRET_NAME"; then
          return 0
        fi
      fi
    done
  fi

  # If we have legacy domains and we've hit rate limits, try checking for certificates with old domains
  if [ ${#LEGACY_DOMAINS[@]} -gt 0 ] && detect_rate_limit; then
    echo "Checking for certificates with legacy domains due to rate limiting..."
    for SECRET in $(kubectl get secrets --field-selector type=kubernetes.io/tls -o name 2>/dev/null || echo ""); do
      local SECRET_NAME=$(echo "$SECRET" | sed 's|^secret/||')
      if extract_and_reissue_certificate "$SECRET_NAME"; then
        return 0
      fi
    done
  fi

  echo "No valid certificates found to reuse"
  return 1
}

# Helper function to extract certificate from one domain and reissue for another
extract_and_reissue_certificate() {
  local SECRET="$1"
  echo "Checking if secret $SECRET can be reused for the new domain..."

  # Get the certificate data
  local CERT_DATA=$(kubectl get secret "$SECRET" -o jsonpath='{.data.tls\.crt}' 2>/dev/null || echo "")
  local KEY_DATA=$(kubectl get secret "$SECRET" -o jsonpath='{.data.tls\.key}' 2>/dev/null || echo "")

  if [ -z "$CERT_DATA" ] || [ -z "$KEY_DATA" ]; then
    return 1
  fi

  # Create a new secret for the new domains
  echo "Creating a temporary secret for the new domains..."
  kubectl create secret tls "${AZURE_TLS_SECRET_NAME}-temp" \
    --cert <(echo "$CERT_DATA" | base64 --decode) \
    --key <(echo "$KEY_DATA" | base64 --decode) \
    --dry-run=client -o yaml | kubectl apply -f -

  # Create a certificate object referencing this secret but for the new domains
  echo "Creating certificate for new domains using the extracted key..."
  cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${AZURE_TLS_SECRET_NAME}
spec:
  secretName: ${AZURE_TLS_SECRET_NAME}
  dnsNames:
  - ${AZURE_DOMAIN_NAME}
  - ${AZURE_WS_DOMAIN_NAME}
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF

  # Update ingress to use this certificate temporarily
  export AZURE_TLS_SECRET_NAME

  return 0
}

# Helper function to check if a secret contains a valid certificate for our domains
check_valid_certificate_secret() {
  local SECRET="$1"

  # Verify secret exists
  if ! kubectl get secret "$SECRET" &>/dev/null; then
    return 1
  fi

  # Get domains from certificate
  local SECRET_DOMAINS=""

  # Try annotations first
  SECRET_DOMAINS=$(kubectl get secret "$SECRET" -o jsonpath='{.metadata.annotations.cert-manager\.io/alt-names}' 2>/dev/null || echo "")

  # If no domains in annotations, try certificate data
  if [ -z "$SECRET_DOMAINS" ] && command -v openssl &>/dev/null; then
    local CERT_DATA=$(kubectl get secret "$SECRET" -o jsonpath='{.data.tls\.crt}' 2>/dev/null || echo "")
    if [ -n "$CERT_DATA" ]; then
      local TEMP_CERT="/tmp/cert_extract_${SECRET}.pem"
      echo "$CERT_DATA" | base64 --decode >"$TEMP_CERT" 2>/dev/null

      if [ -f "$TEMP_CERT" ] && [ -s "$TEMP_CERT" ]; then
        # Extract SANs or CN
        SECRET_DOMAINS=$(openssl x509 -noout -text -in "$TEMP_CERT" 2>/dev/null | grep -A1 "Subject Alternative Name" | grep "DNS:" | sed 's/DNS://g; s/,/,/g' | tr -d ' ' || echo "")
        if [ -z "$SECRET_DOMAINS" ]; then
          SECRET_DOMAINS=$(openssl x509 -noout -subject -in "$TEMP_CERT" 2>/dev/null | grep -o "CN = [^,]*" | cut -d= -f2 | tr -d ' ' || echo "")
        fi

        # Check expiration
        if ! openssl x509 -noout -checkend 0 -in "$TEMP_CERT" 2>/dev/null; then
          echo "Certificate is expired"
          rm -f "$TEMP_CERT" 2>/dev/null || true
          return 1
        fi

        rm -f "$TEMP_CERT" 2>/dev/null || true
      else
        return 1
      fi
    else
      return 1
    fi
  fi

  if [ -z "$SECRET_DOMAINS" ]; then
    return 1
  fi

  # Check if the certificate covers both required domains
  local MAIN_DOMAIN_FOUND=0
  local WS_DOMAIN_FOUND=0

  if echo "$SECRET_DOMAINS" | grep -E "(^|,)${AZURE_DOMAIN_NAME}(,|$)" >/dev/null; then
    MAIN_DOMAIN_FOUND=1
  fi

  if echo "$SECRET_DOMAINS" | grep -E "(^|,)${AZURE_WS_DOMAIN_NAME}(,|$)" >/dev/null; then
    WS_DOMAIN_FOUND=1
  fi

  if [ "$MAIN_DOMAIN_FOUND" -eq 1 ] && [ "$WS_DOMAIN_FOUND" -eq 1 ]; then
    echo "✅ Found valid TLS secret $SECRET covering all required domains"
    export AZURE_TLS_SECRET_NAME="$SECRET"

    # Create a certificate object if it doesn't exist
    if ! kubectl get certificate -o jsonpath='{.items[?(@.spec.secretName=="'"$SECRET"'")].metadata.name}' 2>/dev/null | grep -q .; then
      echo "Creating certificate object for existing secret..."
      export REUSED_CERT_NAME="reused-$(echo "$SECRET" | sed 's/[^a-zA-Z0-9]/-/g')-cert"
      export REUSED_SECRET_NAME="$SECRET"

      if [ -f "k8s/reused-certificate.yaml" ]; then
        cat k8s/reused-certificate.yaml | envsubst | kubectl apply -f -
      else
        # Create a basic certificate object
        cat <<EOF | envsubst | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${REUSED_CERT_NAME}
spec:
  secretName: ${REUSED_SECRET_NAME}
  dnsNames:
  - ${AZURE_DOMAIN_NAME}
  - ${AZURE_WS_DOMAIN_NAME}
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF
      fi
    fi

    # Update ingress configurations to use this certificate
    update_ingress_resources "$SECRET"
    return 0
  fi

  return 1
}

# Helper function to update ingress resources to use a specific certificate
update_ingress_resources() {
  local SECRET="$1"

  # Update HTTP ingress
  if kubectl get ingress "${AZURE_APP_NAME}-http-ingress" &>/dev/null; then
    kubectl patch ingress "${AZURE_APP_NAME}-http-ingress" --type=json \
      -p "[{\"op\": \"replace\", \"path\": \"/spec/tls/0/secretName\", \"value\": \"$SECRET\"}]" 2>/dev/null || {
      kubectl delete ingress "${AZURE_APP_NAME}-http-ingress" --ignore-not-found
      [ -f "k8s/ingress-http.yaml" ] && cat k8s/ingress-http.yaml | envsubst | kubectl apply -f -
    }
  fi

  # Update WebSocket ingress
  if kubectl get ingress "${AZURE_APP_NAME}-ws-ingress" &>/dev/null; then
    kubectl patch ingress "${AZURE_APP_NAME}-ws-ingress" --type=json \
      -p "[{\"op\": \"replace\", \"path\": \"/spec/tls/0/secretName\", \"value\": \"$SECRET\"}]" 2>/dev/null || {
      kubectl delete ingress "${AZURE_APP_NAME}-ws-ingress" --ignore-not-found
      [ -f "k8s/ingress-ws.yaml" ] && cat k8s/ingress-ws.yaml | envsubst | kubectl apply -f -
    }
  fi

  # Restart ingress controller to pick up changes
  kubectl rollout restart deployment -n ingress-nginx ingress-nginx-controller 2>/dev/null || true
  kubectl rollout status deployment -n ingress-nginx ingress-nginx-controller --timeout=120s 2>/dev/null || true
}

# Function to create a self-signed certificate as a fallback when rate-limited
create_self_signed_certificate() {
  echo "Creating self-signed certificate as fallback due to rate limiting..."

  # Create a temporary directory
  local TEMP_DIR=$(mktemp -d)

  # Generate a private key
  openssl genrsa -out "$TEMP_DIR/tls.key" 2048

  # Create a config file for the certificate
  cat >"$TEMP_DIR/openssl.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${AZURE_DOMAIN_NAME}

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${AZURE_DOMAIN_NAME}
DNS.2 = ${AZURE_WS_DOMAIN_NAME}
EOF

  # Generate a certificate
  openssl req -x509 -new -nodes -key "$TEMP_DIR/tls.key" \
    -sha256 -days 90 -out "$TEMP_DIR/tls.crt" \
    -config "$TEMP_DIR/openssl.cnf"

  # Create the secret
  kubectl create secret tls "${AZURE_TLS_SECRET_NAME}" \
    --cert="$TEMP_DIR/tls.crt" \
    --key="$TEMP_DIR/tls.key" \
    --dry-run=client -o yaml | kubectl apply -f -

  # Create a dummy certificate object to track this
  cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${AZURE_TLS_SECRET_NAME}
  annotations:
    cert-manager.io/self-signed: "true"
    cert-manager.io/alt-names: "${AZURE_DOMAIN_NAME},${AZURE_WS_DOMAIN_NAME}"
spec:
  secretName: ${AZURE_TLS_SECRET_NAME}
  dnsNames:
  - ${AZURE_DOMAIN_NAME}
  - ${AZURE_WS_DOMAIN_NAME}
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF

  # Clean up
  rm -rf "$TEMP_DIR"

  echo "Created self-signed certificate. IMPORTANT: This is temporary and not secure!"
  echo "You will need to run this script again after Let's Encrypt rate limits expire."

  return 0
}

# Apply certificate with intelligent reuse logic
apply_certificate() {
  local cert_file=$1
  echo "Managing certificates with reuse prioritization..."

  # First try to find and reuse an existing valid certificate
  if find_valid_certificate; then
    echo "Using existing valid certificate - skipping certificate creation"
    return 0
  fi

  # Check if we're currently rate-limited
  if detect_rate_limit; then
    echo "⚠️ Let's Encrypt rate limit detected. Attempting to use a temporary solution..."

    # Try to create a self-signed certificate as fallback
    if [ -x "$(command -v openssl)" ]; then
      if create_self_signed_certificate; then
        return 0
      fi
    fi

    echo "WARNING: Rate limited and could not create a fallback certificate"
    echo "You may need to wait until the rate limit expires (usually 1 week)"
    return 1
  fi

  # Not rate-limited, try to apply the certificate normally
  echo "No valid existing certificates found, attempting to create a new one..."
  local CERT_RESULT=$(cat "$cert_file" | envsubst | kubectl apply -f - 2>&1)

  if echo "$CERT_RESULT" | grep -q "rateLimited\|too many certificates\|rate limit"; then
    echo "⚠️ Rate limit detected, attempting more thorough search for valid certificates..."
    # Try one more time with more intensive search
    if find_valid_certificate; then
      echo "Successfully found and reusing a valid certificate"
      return 0
    else
      # Try to create a self-signed certificate as fallback
      if [ -x "$(command -v openssl)" ]; then
        if create_self_signed_certificate; then
          return 0
        fi
      fi

      echo "WARNING: Rate limited and could not find a valid certificate to reuse"
      echo "You may need to wait until the rate limit expires"
      # Continue with a warning
      return 1
    fi
  else
    echo "Certificate creation initiated without rate limiting"
    echo "$CERT_RESULT"
    return 0
  fi
}

# Replace apply_certificate_with_rate_limit_check with the new function
# This ensures backward compatibility
apply_certificate_with_rate_limit_check() {
  apply_certificate "$1"
}

##################################
#  1. Create Resource Group      #
##################################
RG_EXISTS=$(az group exists --name $AZURE_RESOURCE_GROUP)
if [ "$RG_EXISTS" != "true" ]; then
  echo "Resource group $AZURE_RESOURCE_GROUP does not exist. Creating..."
  az group create --name $AZURE_RESOURCE_GROUP --location $AZURE_LOCATION
else
  echo "Resource group $AZURE_RESOURCE_GROUP already exists."
fi

################################
#  2. Create VNet and Subnets  #
################################
# Create VNet if it doesn't exist
VNET_EXISTS=$(az network vnet show -g $AZURE_RESOURCE_GROUP -n $AZURE_VNET_NAME --query name -o tsv 2>/dev/null || echo "")
if [ -z "$VNET_EXISTS" ]; then
  echo "Creating VNet..."
  az network vnet create \
    --name $AZURE_VNET_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION \
    --address-prefixes 10.0.0.0/16
fi

# Create subnet for AKS nodes if it doesn't exist
SUBNET_EXISTS=$(az network vnet subnet show -g $AZURE_RESOURCE_GROUP --vnet-name $AZURE_VNET_NAME -n $AZURE_SUBNET_NAME --query name -o tsv 2>/dev/null || echo "")
if [ -z "$SUBNET_EXISTS" ]; then
  echo "Creating subnet $AZURE_SUBNET_NAME for AKS nodes..."
  az network vnet subnet create \
    --name $AZURE_SUBNET_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --vnet-name $AZURE_VNET_NAME \
    --address-prefixes 10.0.1.0/24
fi

# Create dedicated ACI subnet for Virtual Nodes if it doesn't exist
ACI_SUBNET_EXISTS=$(az network vnet subnet show -g $AZURE_RESOURCE_GROUP --vnet-name $AZURE_VNET_NAME -n $AZURE_ACI_SUBNET_NAME --query name -o tsv 2>/dev/null || echo "")
if [ -z "$ACI_SUBNET_EXISTS" ]; then
  echo "Creating ACI subnet $AZURE_ACI_SUBNET_NAME for Virtual Nodes..."
  az network vnet subnet create \
    --name $AZURE_ACI_SUBNET_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --vnet-name $AZURE_VNET_NAME \
    --address-prefixes 10.0.2.0/24
fi

#############################
#  3. Create NSG and Rules  #
#############################
NSG_EXISTS=$(az network nsg show -g $AZURE_RESOURCE_GROUP -n $AZURE_NSG_NAME --query name -o tsv 2>/dev/null || echo "")
if [ -z "$NSG_EXISTS" ]; then
  echo "Creating NSG $AZURE_NSG_NAME..."
  az network nsg create --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_NSG_NAME
fi

echo "Attaching NSG $AZURE_NSG_NAME to subnet $AZURE_SUBNET_NAME..."
az network vnet subnet update \
  --resource-group $AZURE_RESOURCE_GROUP \
  --vnet-name $AZURE_VNET_NAME \
  --name $AZURE_SUBNET_NAME \
  --network-security-group $AZURE_NSG_NAME

# Create NSG rules for the required ports
for port in 50000 3000 443 80; do
  RULE_NAME="Allow-Port-${port}"
  if ! az network nsg rule show --resource-group $AZURE_RESOURCE_GROUP --nsg-name $AZURE_NSG_NAME --name $RULE_NAME &>/dev/null; then
    echo "Creating NSG rule for port $port..."
    az network nsg rule create \
      --resource-group $AZURE_RESOURCE_GROUP \
      --nsg-name $AZURE_NSG_NAME \
      --name $RULE_NAME \
      --priority $((100 + port)) \
      --direction Inbound \
      --access Allow \
      --protocol Tcp \
      --source-address-prefix '*' \
      --source-port-range '*' \
      --destination-port-range $port
  else
    echo "NSG rule $RULE_NAME already exists"
  fi
done

#########################################
#  4. Create AKS Cluster in the Subnet  #
#########################################
SUBNET_ID=$(az network vnet subnet show --resource-group $AZURE_RESOURCE_GROUP \
  --vnet-name $AZURE_VNET_NAME --name $AZURE_SUBNET_NAME --query id -o tsv)

AKS_EXISTS=$(az aks show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_AKS_NAME --query name -o tsv 2>/dev/null || echo "")
if [ -z "$AKS_EXISTS" ]; then
  echo "Creating AKS cluster $AZURE_AKS_NAME in subnet $SUBNET_ID..."
  az aks create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $AZURE_AKS_NAME \
    --node-count 1 \
    --enable-addons monitoring \
    --generate-ssh-keys \
    --vnet-subnet-id $SUBNET_ID \
    --network-plugin azure \
    --service-cidr 172.16.0.0/16 \
    --dns-service-ip 172.16.0.10
else
  echo "AKS cluster $AZURE_AKS_NAME already exists"
fi

# Enable Virtual Node add-on (serverless Kubernetes via ACI)
echo "Checking if Virtual Node add-on is already enabled..."
VIRTUAL_NODE_ENABLED=$(az aks show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_AKS_NAME \
  --query 'addonProfiles.aciConnectorLinux.enabled' -o tsv)
if [ "$VIRTUAL_NODE_ENABLED" != "true" ]; then
  echo "Enabling Virtual Node add-on for AKS cluster $AZURE_AKS_NAME..."
  az aks enable-addons \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $AZURE_AKS_NAME \
    --addons virtual-node \
    --subnet-name $AZURE_ACI_SUBNET_NAME
else
  echo "Virtual Node add-on is already enabled for AKS cluster $AZURE_AKS_NAME"
fi

# Get credentials to manage the cluster
az aks get-credentials --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_AKS_NAME

########################################
#  5. Deploy Application to AKS (K8s)  #
########################################
SERVICE_ERROR=false
DEPLOYMENT_ERROR=false

# Reserve a static public IP for ingress
echo "Creating static public IP for HTTP ingress..."
az network public-ip create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $AZURE_HTTP_INGRESS_IP_NAME \
  --sku Standard \
  --allocation-method static \
  --location $AZURE_LOCATION

HTTP_INGRESS_IP=$(az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_HTTP_INGRESS_IP_NAME --query ipAddress -o tsv)
echo "Reserved static public IP for HTTP: $HTTP_INGRESS_IP"

echo "Creating static public IP for WebSocket ingress..."
az network public-ip create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $AZURE_WS_INGRESS_IP_NAME \
  --sku Standard \
  --allocation-method static \
  --location $AZURE_LOCATION

WS_INGRESS_IP=$(az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_WS_INGRESS_IP_NAME --query ipAddress -o tsv)
echo "Reserved static public IP for WebSocket: $WS_INGRESS_IP"

# Validate all required YAML files exist before proceeding
echo "Validating required YAML configuration files..."
MISSING_FILES=false
for file in k8s/certificate.yaml k8s/cluster-issuer.yaml k8s/ingress-http.yaml k8s/ingress-ws.yaml k8s/acme-solver.yaml k8s/service-internal.yaml k8s/deployment.yaml k8s/cert-manager-config.yaml; do
  if [ ! -f "$file" ]; then
    echo "Error: Required file $file not found"
    MISSING_FILES=true
  fi
done

if [ "$MISSING_FILES" = true ]; then
  echo "Error: One or more required configuration files are missing. Aborting deployment."
  exit 1
fi
echo "All required configuration files found."

# Add a section before the certificate creation to handle domain transitions
if [ -f "k8s/certificate.yaml" ]; then
  echo "Preparing certificate configuration for domains:"
  echo "- Main domain: ${AZURE_DOMAIN_NAME}"
  echo "- WebSocket domain: ${AZURE_WS_DOMAIN_NAME}"

  # Check if we're changing domain names
  DOMAIN_CHANGED=false
  CURRENT_CERTS=$(kubectl get certificates -o jsonpath='{.items[*].spec.dnsNames}' 2>/dev/null || echo "")

  if echo "$CURRENT_CERTS" | grep -q "browserless.aident.ai" && [[ "${AZURE_DOMAIN_NAME}" != "browserless.aident.ai" ]]; then
    echo "⚠️ Domain transition detected: browserless.aident.ai → ${AZURE_DOMAIN_NAME}"
    DOMAIN_CHANGED=true
  fi

  if $DOMAIN_CHANGED; then
    echo "Handling domain transition carefully to avoid rate limits..."

    # First check if we can reuse a certificate with the new domain name
    if ! find_valid_certificate && detect_rate_limit; then
      echo "Creating a temporary self-signed certificate to bridge the transition..."
      if [ -x "$(command -v openssl)" ]; then
        create_self_signed_certificate
      else
        echo "WARNING: Could not create self-signed certificate (openssl not available)"
        echo "You may experience certificate errors until Let's Encrypt rate limits expire"
      fi
    fi
  fi
fi

# Prepare and apply deployment manifest
echo "Preparing deployment manifest..."
export DOCKER_IMAGE_NAME DOCKER_IMAGE_TAG FORCE_REVISION_TIMESTAMP AZURE_BROWSERLESS_SERVICE_NAME
export CONTAINER_CMD="/app/server/scripts/start-ws-server.sh --prod --cloud"
export VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID
cat k8s/deployment.yaml | envsubst >deployment.yaml
echo "Applying deployment manifest..."
kubectl apply -f deployment.yaml || {
  echo "Error applying deployment manifest"
  DEPLOYMENT_ERROR=true
}

# Apply internal ClusterIP service for browserless
echo "Applying internal ClusterIP service..."
export AZURE_BROWSERLESS_SERVICE_NAME
cat k8s/service-internal.yaml | envsubst | kubectl apply -f - || {
  echo "Error applying internal service manifest"
  SERVICE_ERROR=true
}

if [ "$DEPLOYMENT_ERROR" != true ] && [ "$SERVICE_ERROR" != true ]; then
  echo "Waiting for deployment to complete..."
  DEPLOYMENT_NAME=$(kubectl get deployments -o jsonpath='{.items[0].metadata.name}')
  kubectl rollout status deployment/$DEPLOYMENT_NAME --timeout=300s || {
    echo "Deployment rollout timed out after 5 minutes"
    DEPLOYMENT_ERROR=true
  }
  echo "Verifying all pods are running..."
  PODS_READY=false
  for i in {1..30}; do
    # Check only pods belonging to the browserless deployment
    NOT_READY=$(kubectl get pods -l app=$AZURE_APP_NAME | grep -v NAME | grep -v Running | grep -v Completed | wc -l)
    if [ "$NOT_READY" -eq 0 ]; then
      PODS_READY=true
      break
    fi
    echo "Waiting for pods to be ready... (attempt $i/30)"
    echo "Non-ready pods:"
    kubectl get pods -l app=$AZURE_APP_NAME | grep -v NAME | grep -v Running | grep -v Completed
    sleep 10
  done
  if [ "$PODS_READY" != "true" ]; then
    echo "Not all pods are in Running state after 5 minutes"
    DEPLOYMENT_ERROR=true
  fi
fi

#########################
#  Final Status Report  #
#########################
if [ "$DEPLOYMENT_ERROR" = true ] || [ "$SERVICE_ERROR" = true ]; then
  echo "AKS deployment completed with errors. Check the logs above for details."
  exit 1
else
  echo "AKS deployment complete and verified."
  echo "Setting up HTTPS access for your service..."
fi

############################
#  6. Connectivity Tests   #
############################
echo "Running connectivity tests..."
echo "Checking service details:"
kubectl get service $AZURE_BROWSERLESS_SERVICE_NAME
echo "Checking service endpoints:"
kubectl get endpoints -n default
echo "Testing internal connectivity to browserless service:"
kubectl run -i --tty --rm curl-test --image=curlimages/curl --restart=Never -- curl -v http://$AZURE_BROWSERLESS_SERVICE_NAME:3000
echo "External connectivity will be through ingress controller with HTTPS"
echo "External connectivity tests will be performed after HTTPS setup"

############################
#  7. Configure HTTPS      #
############################
echo "Setting up HTTPS configuration..."

# Add Helm repositories for NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update

# Create dedicated namespace for ingress if it doesn't exist
kubectl create namespace ingress-nginx 2>/dev/null || true

# Add better cert-manager configuration and ensure the right certificate chain
echo "Applying cert-manager configuration..."
if [ ! -f "k8s/cert-manager-config.yaml" ]; then
  echo "Error: Required file k8s/cert-manager-config.yaml not found"
  exit 1
fi
cat k8s/cert-manager-config.yaml | envsubst | kubectl apply -f -

# Assign Network Contributor role to the AKS managed identity to allow it to manage network resources
echo "Checking if Network Contributor role is already assigned to AKS managed identity..."
AKS_PRINCIPAL_ID=$(az aks show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_AKS_NAME --query "identity.principalId" -o tsv)
if [ -n "$AKS_PRINCIPAL_ID" ]; then
  echo "Found AKS managed identity principal ID: $AKS_PRINCIPAL_ID"

  # Check if role is already assigned
  ROLE_EXISTS=$(az role assignment list --assignee "$AKS_PRINCIPAL_ID" --role "Network Contributor" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_RESOURCE_GROUP" \
    --query "[].roleDefinitionName" -o tsv 2>/dev/null || echo "")

  if [ -n "$ROLE_EXISTS" ]; then
    echo "Network Contributor role is already assigned to AKS managed identity. Skipping..."
  else
    echo "Assigning Network Contributor role to AKS managed identity..."
    az role assignment create \
      --assignee "$AKS_PRINCIPAL_ID" \
      --role "Network Contributor" \
      --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_RESOURCE_GROUP" \
      --only-show-errors

    echo "Waiting 60 seconds for RBAC propagation..."
    sleep 60
  fi
else
  echo "Warning: Could not find AKS managed identity principal ID. Network operations may fail."
fi

# Remove any existing ingress releases
EXISTING_RELEASES=$(helm list -n ingress-nginx -q | grep -E 'ingress-nginx|ingress-nginx-http|ingress-nginx-ws' || true)
if [ -n "$EXISTING_RELEASES" ]; then
  echo "Found existing ingress releases. Uninstalling them to avoid conflicts..."
  helm list -n ingress-nginx -q | grep -E 'ingress-nginx|ingress-nginx-http|ingress-nginx-ws' | xargs -r helm uninstall -n ingress-nginx
fi

# Create single public IP for the ingress controller
echo "Creating static public IP for ingress controller..."
# Check if the IP already exists
EXISTING_IP=$(az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_HTTP_INGRESS_IP_NAME --query ipAddress -o tsv 2>/dev/null || echo "")

if [ -n "$EXISTING_IP" ]; then
  echo "Using existing static IP: $EXISTING_IP"
  INGRESS_IP=$EXISTING_IP
else
  # Create a new static IP if it doesn't exist
  az network public-ip create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $AZURE_HTTP_INGRESS_IP_NAME \
    --sku Standard \
    --allocation-method static \
    --location $AZURE_LOCATION

  INGRESS_IP=$(az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_HTTP_INGRESS_IP_NAME --query ipAddress -o tsv)
  echo "Reserved new static public IP for ingress: $INGRESS_IP"
fi

# Check current DNS records for the domain to see if they match our ingress IP
echo "Checking current DNS records for $AZURE_DOMAIN_NAME..."
DNS_IP=""
if command -v dig &>/dev/null; then
  # Use dig if available (more reliable)
  DNS_IP=$(dig +short $AZURE_DOMAIN_NAME | grep -v '\.$' | head -n1 || echo "")
elif command -v nslookup &>/dev/null; then
  # Fallback to nslookup if dig is not available
  DNS_IP=$(nslookup $AZURE_DOMAIN_NAME | grep -A2 'Name:' | grep 'Address:' | tail -n1 | awk '{print $2}' || echo "")
fi

if [ -n "$DNS_IP" ]; then
  if [ "$DNS_IP" != "$INGRESS_IP" ]; then
    echo "WARNING: DNS record for $AZURE_DOMAIN_NAME currently points to $DNS_IP"
    echo "This differs from the current ingress IP ($INGRESS_IP)"
    echo "You will need to update your DNS records after this deployment"
  else
    echo "DNS record for $AZURE_DOMAIN_NAME already correctly points to $INGRESS_IP"
  fi
else
  echo "Could not determine current DNS settings for $AZURE_DOMAIN_NAME"
  echo "Make sure to set up DNS records to point to $INGRESS_IP after deployment"
fi

# Also check WebSocket domain
WS_DOMAIN="ws.$AZURE_DOMAIN_NAME"
echo "Checking current DNS records for $WS_DOMAIN..."
WS_DNS_IP=""
if command -v dig &>/dev/null; then
  WS_DNS_IP=$(dig +short $WS_DOMAIN | grep -v '\.$' | head -n1 || echo "")
elif command -v nslookup &>/dev/null; then
  WS_DNS_IP=$(nslookup $WS_DOMAIN | grep -A2 'Name:' | grep 'Address:' | tail -n1 | awk '{print $2}' || echo "")
fi

if [ -n "$WS_DNS_IP" ]; then
  if [ "$WS_DNS_IP" != "$INGRESS_IP" ]; then
    echo "WARNING: DNS record for $WS_DOMAIN currently points to $WS_DNS_IP"
    echo "This differs from the current ingress IP ($INGRESS_IP)"
    echo "You will need to update your DNS records after this deployment"
  else
    echo "DNS record for $WS_DOMAIN already correctly points to $INGRESS_IP"
  fi
else
  echo "Could not determine current DNS settings for $WS_DOMAIN"
  echo "Make sure to set up DNS records to point to $INGRESS_IP after deployment"
fi

# Install a single NGINX ingress controller
echo "Installing NGINX Ingress Controller..."
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.loadBalancerIP=$INGRESS_IP \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=$AZURE_RESOURCE_GROUP \
  --set controller.service.externalTrafficPolicy=Local \
  --set controller.config.proxy-body-size="0" \
  --set controller.config.proxy-read-timeout="3600" \
  --set controller.config.proxy-send-timeout="3600" \
  --set controller.config.proxy-connect-timeout="60" \
  --set controller.config.use-forwarded-headers="true" \
  --set controller.config.ssl-protocols="TLSv1.2 TLSv1.3" \
  --set controller.config.ssl-ciphers="ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384" \
  --set controller.config.ssl-session-tickets="false" \
  --set controller.config.ssl-session-timeout="1h" || {
  echo "Error: Ingress controller installation failed."
  exit 1
}

echo "Waiting for NGINX Ingress Controller to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=300s -n ingress-nginx || {
  echo "Timed out waiting for NGINX Ingress Controller to be ready"
  echo "Continuing anyway, but HTTPS setup might not complete successfully"
}

echo "Waiting for NGINX Ingress admission webhook to be ready..."
for i in {1..30}; do
  if kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io ingress-nginx-admission &>/dev/null; then
    echo "Admission webhook found"
    break
  fi
  echo "Waiting for admission webhook to be ready... (attempt $i/30)"
  sleep 10
done

echo "Getting ingress controller IP..."
INGRESS_CONTROLLER_IP=""
for i in {1..30}; do
  INGRESS_CONTROLLER_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  if [ -n "$INGRESS_CONTROLLER_IP" ]; then
    echo "Found ingress controller IP: $INGRESS_CONTROLLER_IP"
    break
  fi
  echo "Waiting for ingress controller IP to be assigned... (attempt $i/30)"
  sleep 10
done

if [ -z "$INGRESS_CONTROLLER_IP" ]; then
  echo "Warning: Could not find ingress controller IP after multiple attempts. Using the reserved IP."
  INGRESS_CONTROLLER_IP=$INGRESS_IP
elif [ "$INGRESS_CONTROLLER_IP" != "$INGRESS_IP" ]; then
  echo "Warning: Ingress controller IP ($INGRESS_CONTROLLER_IP) doesn't match the reserved IP ($INGRESS_IP)."
  echo "Using the actual ingress controller IP for further configuration."
  INGRESS_IP=$INGRESS_CONTROLLER_IP
fi

# Check if cert-manager is already installed
if ! kubectl get namespace cert-manager &>/dev/null ||
  [ "$(kubectl get deployment -n cert-manager --no-headers 2>/dev/null | wc -l)" -eq 0 ]; then
  # If namespace exists but is empty, remove it to allow clean install
  if kubectl get namespace cert-manager &>/dev/null; then
    echo "cert-manager namespace exists but has no deployments. Reinstalling cert-manager..."
    kubectl delete namespace cert-manager
    # Wait for namespace deletion to complete
    for i in {1..30}; do
      if ! kubectl get namespace cert-manager &>/dev/null; then
        break
      fi
      echo "Waiting for cert-manager namespace deletion... (attempt $i/30)"
      sleep 5
    done
  else
    echo "Installing cert-manager..."
  fi

  # Install cert-manager
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml || {
    echo "Failed to install cert-manager"
    exit 1
  }
  echo "Waiting for cert-manager to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=cert-manager --timeout=120s || { echo "Timed out waiting for cert-manager to be ready"; }
  echo "Waiting for cert-manager webhook to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=webhook --timeout=120s || { echo "Timed out waiting for cert-manager webhook to be ready"; }
else
  echo "cert-manager is already installed with deployments"
fi

# Ensure cert-manager webhook service exists (needed for certificate creation)
if ! kubectl get service cert-manager-webhook -n cert-manager &>/dev/null; then
  echo "Creating cert-manager webhook service..."
  # First check the actual name of the webhook deployment
  WEBHOOK_DEPLOYMENT=$(kubectl get deployment -n cert-manager -l app=webhook -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [ -z "$WEBHOOK_DEPLOYMENT" ]; then
    echo "Error: Could not find cert-manager webhook deployment."
    echo "Available deployments in cert-manager namespace:"
    kubectl get deployments -n cert-manager
    exit 1
  fi

  echo "Found webhook deployment: $WEBHOOK_DEPLOYMENT"
  kubectl expose deployment $WEBHOOK_DEPLOYMENT --name=cert-manager-webhook --namespace=cert-manager --port=443 --target-port=10250 || {
    echo "Error: Failed to create cert-manager webhook service."
    exit 1
  }
else
  echo "Cert-manager webhook service already exists."
fi

# Add a more robust check for cert-manager webhook readiness
echo "Ensuring cert-manager webhook has available endpoints..."
WEBHOOK_READY=false
for i in {1..60}; do
  ENDPOINTS=$(kubectl get endpoints cert-manager-webhook -n cert-manager -o jsonpath='{.subsets[0].addresses}' 2>/dev/null || echo "")
  if [ -n "$ENDPOINTS" ]; then
    echo "Cert-manager webhook endpoints are ready."
    WEBHOOK_READY=true
    break
  fi
  echo "Waiting for cert-manager webhook endpoints to be available... (attempt $i/60)"
  sleep 5
done

if [ "$WEBHOOK_READY" != "true" ]; then
  echo "Error: Cert-manager webhook endpoints not available after 5 minutes."
  echo "Restarting cert-manager pods to recover..."
  kubectl rollout restart deployment -n cert-manager cert-manager cert-manager-cainjector cert-manager-webhook

  # Wait again after restart
  echo "Waiting for cert-manager pods to restart..."
  kubectl rollout status deployment -n cert-manager cert-manager cert-manager-cainjector cert-manager-webhook --timeout=300s

  # Check again for webhook readiness
  echo "Checking webhook endpoints again after restart..."
  for i in {1..30}; do
    ENDPOINTS=$(kubectl get endpoints cert-manager-webhook -n cert-manager -o jsonpath='{.subsets[0].addresses}' 2>/dev/null || echo "")
    if [ -n "$ENDPOINTS" ]; then
      echo "Cert-manager webhook endpoints are now ready after restart."
      WEBHOOK_READY=true
      break
    fi
    echo "Still waiting for cert-manager webhook endpoints... (attempt $i/30)"
    sleep 10
  done

  if [ "$WEBHOOK_READY" != "true" ]; then
    echo "Error: Cert-manager webhook still not ready after restart. Exiting."
    exit 1
  fi
fi

if ! kubectl get clusterissuer letsencrypt-prod &>/dev/null; then
  echo "Creating ClusterIssuer for Let's Encrypt..."
  export ACME_EMAIL="${ACME_EMAIL:-your-email@example.com}"
  if [ "$ACME_EMAIL" = "your-email@example.com" ]; then
    echo "WARNING: Using default email for Let's Encrypt. Set ACME_EMAIL to your email."
  fi

  # Apply the ClusterIssuer from the standalone file
  cat k8s/cluster-issuer.yaml | envsubst | kubectl apply -f -
else
  echo "ClusterIssuer letsencrypt-prod already exists"
  # Update the ClusterIssuer to ensure proper chain configuration
  kubectl patch clusterissuer letsencrypt-prod --type=merge -p '{"spec":{"acme":{"solvers":[{"http01":{"ingress":{"class":"nginx","podTemplate":{"spec":{"nodeSelector":{"kubernetes.io/os":"linux"}}}}}}]}}}'
fi

# -------------------------
# Apply multi-domain certificate configuration
# -------------------------
echo "Cleaning up any outdated certificates..."
# Check and remove certificates other than the one we want
kubectl get certificate 2>/dev/null | grep -v "^NAME" | grep -v "${AZURE_TLS_SECRET_NAME}" | awk '{print $1}' | xargs -r kubectl delete certificate || true

# Instead of deleting existing certificate, use apply to update it if it exists
echo "Creating/updating multi-domain TLS certificate configuration..."
export AZURE_APP_NAME AZURE_BROWSERLESS_SERVICE_NAME AZURE_DOMAIN_NAME AZURE_TLS_SECRET_NAME

# Add a retry mechanism for certificate creation
MAX_CERT_RETRIES=3
for i in $(seq 1 $MAX_CERT_RETRIES); do
  echo "Attempt $i/$MAX_CERT_RETRIES to create/update certificate..."
  if apply_certificate_with_rate_limit_check "k8s/certificate.yaml"; then
    echo "Successfully created/updated certificate configuration."
    break
  else
    if [ $i -eq $MAX_CERT_RETRIES ]; then
      echo "Error: Failed to create/update certificate after $MAX_CERT_RETRIES attempts."
      echo "Checking webhook status and availability:"
      kubectl get pods -n cert-manager
      kubectl get endpoints -n cert-manager
      kubectl describe service cert-manager-webhook -n cert-manager

      # Add debugging info for the existing certificate
      echo "Existing certificate information:"
      kubectl get certificate "${AZURE_TLS_SECRET_NAME}" -o yaml || true

      # Continue execution instead of exiting
      echo "WARNING: Certificate creation/update failed, but continuing with deployment."
      echo "You may need to manually create or update the certificate later."
      break
    fi
    echo "Retrying certificate creation/update in 30 seconds..."
    sleep 30
  fi
done

# Update Ingress resource names with environment variables
echo "Preparing ingress configurations from existing templates..."
export AZURE_APP_NAME AZURE_BROWSERLESS_SERVICE_NAME AZURE_DOMAIN_NAME AZURE_TLS_SECRET_NAME
export AZURE_RESOURCE_GROUP AZURE_HTTP_INGRESS_IP_NAME AZURE_WS_INGRESS_IP_NAME

# -------------------------
# Apply Ingress configuration for both HTTP and WebSocket
# -------------------------
echo "Applying HTTP ingress configuration..."
MAX_RETRIES=5

# Force clean existing ingress to ensure clean configuration
echo "Removing existing ingress configurations to ensure clean setup..."
kubectl delete ingress "${AZURE_APP_NAME}-http-ingress" "${AZURE_APP_NAME}-ws-ingress" --ignore-not-found

# Add a short pause to ensure resources are removed
sleep 5

# Apply HTTP ingress with retries
for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES to apply HTTP ingress configuration..."
  if cat k8s/ingress-http.yaml | envsubst | kubectl apply -f -; then
    echo "Successfully applied HTTP ingress configuration"
    break
  else
    if [ $i -eq $MAX_RETRIES ]; then
      echo "Failed to apply HTTP ingress configuration after $MAX_RETRIES attempts"
      exit 1
    fi
    echo "Retrying HTTP ingress configuration in 30 seconds..."
    sleep 30
  fi
done

echo "Applying WebSocket ingress configuration..."
for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES to apply WebSocket ingress configuration..."
  if cat k8s/ingress-ws.yaml | envsubst | kubectl apply -f -; then
    echo "Successfully applied WebSocket ingress configuration"
    break
  else
    if [ $i -eq $MAX_RETRIES ]; then
      echo "Failed to apply WebSocket ingress configuration after $MAX_RETRIES attempts"
      exit 1
    fi
    echo "Retrying WebSocket ingress configuration in 30 seconds..."
    sleep 30
  fi
done

# Verify ingress TLS configuration is set up properly
echo "Verifying ingress TLS configuration..."
HTTP_INGRESS_TLS=$(kubectl get ingress "${AZURE_APP_NAME}-http-ingress" -o jsonpath='{.spec.tls[0]}' 2>/dev/null || echo "")
WS_INGRESS_TLS=$(kubectl get ingress "${AZURE_APP_NAME}-ws-ingress" -o jsonpath='{.spec.tls[0]}' 2>/dev/null || echo "")

# If either ingress has TLS issues, force reload ingress controller
if [[ "$HTTP_INGRESS_TLS" != *"${AZURE_TLS_SECRET_NAME}"* ]] || [[ "$WS_INGRESS_TLS" != *"${AZURE_TLS_SECRET_NAME}"* ]]; then
  echo "TLS configuration issue detected in ingress. Reloading NGINX ingress controller..."
  kubectl rollout restart deployment -n ingress-nginx ingress-nginx-controller
  echo "Waiting for ingress controller to reload (30 seconds)..."
  sleep 30
  # Verify again after reload
  HTTP_INGRESS_TLS=$(kubectl get ingress "${AZURE_APP_NAME}-http-ingress" -o jsonpath='{.spec.tls[0]}' 2>/dev/null || echo "")
  WS_INGRESS_TLS=$(kubectl get ingress "${AZURE_APP_NAME}-ws-ingress" -o jsonpath='{.spec.tls[0]}' 2>/dev/null || echo "")
  echo "HTTP ingress TLS after reload: $HTTP_INGRESS_TLS"
  echo "WebSocket ingress TLS after reload: $WS_INGRESS_TLS"
fi

# Deploy ACME solver for challenge handling
echo "Deploying ACME solver for Let's Encrypt challenge handling..."
export AZURE_BROWSERLESS_SERVICE_NAME
if [ -f "k8s/acme-solver.yaml" ]; then
  echo "Applying ACME solver configuration..."
  cat k8s/acme-solver.yaml | envsubst | kubectl apply -f - || {
    echo "Error: Failed to apply ACME solver configuration."
    # Don't exit here as this is not critical for basic functionality
    # But do warn the user
    echo "Warning: Certificate issuance might fail due to ACME solver issues."
  }
else
  echo "Error: Required file k8s/acme-solver.yaml not found"
  exit 1
fi

echo "HTTPS setup complete!"
echo "Waiting for certificates to be issued (this might take a few minutes)..."

# -------------------------
# Print DNS configuration instructions
# -------------------------
echo ""
echo "To complete HTTPS setup, configure your DNS records as follows:"
echo "  - Main domain (${AZURE_DOMAIN_NAME}): Set the A record to the Ingress IP: ${INGRESS_IP}"
echo "  - WebSocket domain (ws.${AZURE_DOMAIN_NAME}): Set the A record to the same Ingress IP: ${INGRESS_IP}"
echo ""
echo "This IP address (${INGRESS_IP}) is STATIC and should not change between deployments."
echo "The script will automatically reuse this IP in future deployments."
echo ""
echo "Test connectivity after deployment is complete:"
echo "HTTP/HTTPS:"
echo "  curl -v https://${AZURE_DOMAIN_NAME}/"
echo ""
echo "WebSocket (secure):"
echo "  websocat wss://ws.${AZURE_DOMAIN_NAME}/"
echo ""

# -------------------------
# Certificate and DNS Health Check
# -------------------------
echo "Certificate and DNS Health Check:"
echo "-------------------------------"

echo "1. Checking DNS resolution..."
if command -v dig &>/dev/null; then
  echo "   Main domain DNS: $(dig +short ${AZURE_DOMAIN_NAME})"
  echo "   WebSocket domain DNS: $(dig +short ws.${AZURE_DOMAIN_NAME})"
elif command -v nslookup &>/dev/null; then
  echo "   Main domain DNS:"
  nslookup ${AZURE_DOMAIN_NAME} | grep -A2 'Name:' | grep 'Address:' | tail -n1
  echo "   WebSocket domain DNS:"
  nslookup ws.${AZURE_DOMAIN_NAME} | grep -A2 'Name:' | grep 'Address:' | tail -n1
fi

echo ""
echo "2. Certificate status:"
# Show the relevant certificate, only exact match on name
CERT_OUTPUT=$(kubectl get certificate -o wide 2>/dev/null || echo "No certificates found")
if kubectl get certificate "${AZURE_TLS_SECRET_NAME}" &>/dev/null; then
  echo "$(kubectl get certificate "${AZURE_TLS_SECRET_NAME}" -o wide)"
else
  echo "   No certificate found with exact name: ${AZURE_TLS_SECRET_NAME}"
  echo "   List of existing certificates:"
  kubectl get certificate -o wide 2>/dev/null || echo "   No certificates found in cluster"
fi

echo ""
echo "3. TLS Secret and Domains Coverage:"
# Check for exact certificate name match
echo "   Checking certificate with name ${AZURE_TLS_SECRET_NAME}..."
if kubectl get secret "${AZURE_TLS_SECRET_NAME}" &>/dev/null; then
  # Certificate exists, check if it's valid (includes both domains)
  CERT_DOMAINS=$(kubectl get secret "${AZURE_TLS_SECRET_NAME}" -o jsonpath='{.metadata.annotations.cert-manager\.io/alt-names}' 2>/dev/null || echo "")
  echo "   Current domains in certificate: $CERT_DOMAINS"

  # Check if both domains are in the certificate using exact matching
  MAIN_DOMAIN_PRESENT=$(echo "$CERT_DOMAINS" | grep -E "(^|,)${AZURE_DOMAIN_NAME}(,|$)" || echo "")
  WS_DOMAIN_PRESENT=$(echo "$CERT_DOMAINS" | grep -E "(^|,)ws\.${AZURE_DOMAIN_NAME}(,|$)" || echo "")

  if [ -z "$MAIN_DOMAIN_PRESENT" ] || [ -z "$WS_DOMAIN_PRESENT" ]; then
    echo "   ❌ Certificate is missing required domains!"
    echo "   Required domains: ${AZURE_DOMAIN_NAME} and ws.${AZURE_DOMAIN_NAME}"
    echo "   Actual domains: $CERT_DOMAINS"
    echo "   Forcing recreation of certificate..."

    # Force recreation of all related resources
    echo "   Deleting TLS secret..."
    kubectl delete secret "${AZURE_TLS_SECRET_NAME}" --ignore-not-found

    echo "   Deleting certificate..."
    kubectl delete certificate "${AZURE_TLS_SECRET_NAME}" --ignore-not-found

    # Delete any existing orders/challenges for this certificate
    echo "   Cleaning up certificate orders and challenges..."
    kubectl get orders -l cert-manager.io/certificate-name="${AZURE_TLS_SECRET_NAME}" -o name 2>/dev/null | xargs -r kubectl delete
    kubectl get challenges --all-namespaces -o name 2>/dev/null | xargs -r kubectl delete

    echo "   Waiting for resources to be fully deleted (10 seconds)..."
    sleep 10

    # Create new certificate
    echo "   Creating new certificate with both domains..."
    apply_certificate_with_rate_limit_check "k8s/certificate.yaml" || {
      echo "   ✗ Failed to create new certificate. Please check logs and try again."
    }

    echo "   Waiting for certificate to be issued (30 seconds)..."
    sleep 30

    # Force update ingress to use the new certificate
    echo "   Updating ingress resources to use new certificate..."
    kubectl delete ingress "${AZURE_APP_NAME}-http-ingress" "${AZURE_APP_NAME}-ws-ingress" --ignore-not-found
    cat k8s/ingress-http.yaml k8s/ingress-ws.yaml | envsubst | kubectl apply -f -
  else
    echo "   ✓ Certificate contains both required domains"

    # Check certificate status
    CERT_STATUS=$(kubectl describe certificate "${AZURE_TLS_SECRET_NAME}" | grep -E 'Status:|Ready:' | tail -n 2)
    echo "   Certificate status: $CERT_STATUS"

    if [[ "$CERT_STATUS" == *"False"* ]] || [[ "$CERT_STATUS" == *"Error"* ]]; then
      echo "   ⚠️ Certificate shows error status - recreating..."
      kubectl delete secret "${AZURE_TLS_SECRET_NAME}" --ignore-not-found
      kubectl delete certificate "${AZURE_TLS_SECRET_NAME}" --ignore-not-found
      sleep 10
      echo "   Creating new certificate..."
      apply_certificate_with_rate_limit_check "k8s/certificate.yaml"
    fi
  fi
else
  # Certificate doesn't exist, create a new one
  echo "   Certificate does not exist - creating new certificate..."
  apply_certificate_with_rate_limit_check "k8s/certificate.yaml" || {
    echo "   ✗ Failed to create new certificate. Please check logs and try again."
  }

  echo "   Waiting for certificate to be issued (30 seconds)..."
  sleep 30
fi

# Additional step: verify certificate.yaml content
echo ""
echo "4. Verifying certificate template:"
echo "   Content of processed certificate.yaml (checking domain entries):"
CERT_YAML=$(cat k8s/certificate.yaml | envsubst)
DOMAIN_ENTRIES=$(echo "$CERT_YAML" | grep -A 5 "dnsNames:")
echo "   $DOMAIN_ENTRIES"

# Add an explicit check for ingress TLS settings
echo ""
echo "5. Verifying ingress TLS configuration:"
echo "   HTTP ingress TLS configuration:"
HTTP_INGRESS_TLS=$(kubectl get ingress -o jsonpath='{.items[?(@.metadata.name=="browserless-http-ingress")].spec.tls[0]}')
echo "   $HTTP_INGRESS_TLS"
echo "   WebSocket ingress TLS configuration:"
WS_INGRESS_TLS=$(kubectl get ingress -o jsonpath='{.items[?(@.metadata.name=="browserless-ws-ingress")].spec.tls[0]}')
echo "   $WS_INGRESS_TLS"

echo ""
echo "Troubleshooting Commands:"
echo "------------------------"
echo "  • Check ingress: kubectl get ingress -o wide"
echo "  • Service endpoints: kubectl get endpoints ${AZURE_BROWSERLESS_SERVICE_NAME}"
echo "  • Ingress logs: kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=100"
echo "  • Test connectivity: kubectl run -i --tty --rm debug --image=curlimages/curl --restart=Never -- curl -v http://${AZURE_BROWSERLESS_SERVICE_NAME}:3000"
echo "  • Certificate details: kubectl describe certificate ${AZURE_TLS_SECRET_NAME}"
echo ""

# Add EMERGENCY final certificate check and regeneration
echo "EMERGENCY Certificate Check: Ensuring certificate covers both domains..."
CERT_DATA=$(kubectl get secret "${AZURE_TLS_SECRET_NAME}" -o json 2>/dev/null || echo "{}")
CERT_DOMAINS=$(echo "$CERT_DATA" | grep -o 'cert-manager.io/alt-names.*' | cut -d '"' -f 2 || echo "")
echo "Current domains in certificate: $CERT_DOMAINS"

# Check if both domains are present using strict matching
MAIN_DOMAIN_PRESENT=0
WS_DOMAIN_PRESENT=0

if [ -n "$CERT_DOMAINS" ]; then
  if echo "$CERT_DOMAINS" | grep -q "${AZURE_DOMAIN_NAME}"; then
    MAIN_DOMAIN_PRESENT=1
  fi

  if echo "$CERT_DOMAINS" | grep -q "ws.${AZURE_DOMAIN_NAME}"; then
    WS_DOMAIN_PRESENT=1
  fi
fi

# Use ingress controller logs to check for certificate errors
CERT_ERRORS=0
CERT_ERROR_CHECK=$(kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50 2>/dev/null | grep -c "certificate is valid for.*not ${AZURE_DOMAIN_NAME}" || echo "0")
CERT_ERROR_CHECK=$(echo "$CERT_ERROR_CHECK" | tr -cd '0-9')
# Default to 0 if empty
CERT_ERROR_CHECK=${CERT_ERROR_CHECK:-0}
if [ "$CERT_ERROR_CHECK" -ne 0 ]; then
  CERT_ERRORS=1
fi

# Check for certificate issues
if [ "$MAIN_DOMAIN_PRESENT" -eq 0 ] || [ "$WS_DOMAIN_PRESENT" -eq 0 ] || [ "$CERT_ERRORS" -eq 1 ]; then
  echo "⚠️ CRITICAL: Certificate issues detected! Performing emergency certificate regeneration"

  # First try to find and reuse an existing valid certificate
  if find_valid_certificate; then
    echo "✅ Successfully reused an existing valid certificate"
  else
    # If no valid certificate was found, try to regenerate one
    echo "No valid certificate found to reuse. Attempting to create a new one..."

    # Complete cleanup of all certificate resources
    echo "1. Complete cleanup of certificate resources..."
    kubectl delete secret "${AZURE_TLS_SECRET_NAME}" --ignore-not-found
    kubectl delete certificate "${AZURE_TLS_SECRET_NAME}" --ignore-not-found
    kubectl get orders --all-namespaces -o name | grep -i "${AZURE_TLS_SECRET_NAME}" | xargs -r kubectl delete
    kubectl get challenges --all-namespaces -o name | xargs -r kubectl delete

    echo "2. Waiting for resources to be fully deleted (15 seconds)..."
    sleep 15

    # Create certificate using apply_certificate_with_rate_limit_check
    echo "3. Creating certificate with rate limit awareness..."
    if [ ! -f "k8s/certificate.yaml" ]; then
      echo "Error: Required file k8s/certificate.yaml not found for emergency certificate regeneration"
      exit 1
    fi
    apply_certificate_with_rate_limit_check "k8s/certificate.yaml"

    echo "4. Waiting for certificate to be processed (45 seconds)..."
    sleep 45
  fi

  # Force update of all ingress resources
  echo "5. Force updating all ingress resources..."

  # Check if required files exist
  for file in k8s/ingress-http.yaml k8s/ingress-ws.yaml k8s/acme-solver.yaml; do
    if [ ! -f "$file" ]; then
      echo "Error: Required file $file not found for emergency ingress recreation"
      exit 1
    fi
  done

  echo "Applying ingress resources with TLS secret: ${AZURE_TLS_SECRET_NAME}"
  # Apply the ingress configurations with the current (potentially changed) AZURE_TLS_SECRET_NAME
  cat k8s/ingress-http.yaml | envsubst | kubectl apply -f -
  cat k8s/ingress-ws.yaml | envsubst | kubectl apply -f -
  cat k8s/acme-solver.yaml | envsubst | kubectl apply -f -

  # Restart ingress controller
  echo "6. Restarting ingress controller to pick up new certificate..."
  kubectl rollout restart deployment -n ingress-nginx ingress-nginx-controller

  echo "7. Waiting for changes to take effect (30 seconds)..."
  sleep 30

  # Final verification
  echo "8. Final certificate verification:"
  kubectl describe certificate "${AZURE_TLS_SECRET_NAME}" | grep -E "Status:|Message:|DNS Names:" || echo "Certificate details not available"

  echo "Emergency certificate regeneration complete!"
else
  echo "✅ Certificate appears to correctly include both domains."
fi

# Certificate Verification and Troubleshooting Section
echo ""
echo "==================================="
echo "Certificate Verification and Troubleshooting"
echo "==================================="

# Verify the certificate is correctly created
echo "Fetching certificate information..."
CERT_STATUS=$(kubectl get certificate "${AZURE_TLS_SECRET_NAME}" -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,STATUS:.status.conditions[0].message 2>/dev/null || echo "Certificate not found")
echo "Certificate Status: $CERT_STATUS"

echo "Checking for issues with cert-manager..."
CERT_MANAGER_PODS=$(kubectl get pods -n cert-manager -o wide 2>/dev/null || echo "No cert-manager pods found")
echo "cert-manager pods:"
echo "$CERT_MANAGER_PODS"

echo "Checking for failed certificate issuance orders..."
FAILED_ORDERS=$(kubectl get orders -l cert-manager.io/certificate-name="${AZURE_TLS_SECRET_NAME}" -o custom-columns=NAME:.metadata.name,STATE:.status.state,REASON:.status.reason,MESSAGE:.status.reason 2>/dev/null || echo "No orders found")
echo "Orders for certificate:"
echo "$FAILED_ORDERS"

echo "Checking challenge status..."
CHALLENGES=$(kubectl get challenges -o custom-columns=NAME:.metadata.name,STATE:.status.state,REASON:.status.reason,DOMAIN:.spec.dnsName 2>/dev/null || echo "No challenges found")
echo "Certificate challenges:"
echo "$CHALLENGES"

echo "Checking Ingress controller logs for TLS errors..."
INGRESS_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$INGRESS_POD" ]; then
  echo "Checking ingress controller logs for TLS/cert issues (last 50 lines)..."
  kubectl logs -n ingress-nginx "$INGRESS_POD" --tail=50 | grep -i -E 'tls|cert|ssl' || echo "No TLS-related logs found"
else
  echo "No ingress controller pod found"
fi

# Add troubleshooting steps
echo ""
echo "============================================="
echo "Troubleshooting Steps for SSL Certificate Issue"
echo "============================================="
echo "If you're still experiencing SSL certificate issues, try these steps:"
echo ""
echo "1. Check certificate secret content:"
echo "   kubectl get secret ${AZURE_TLS_SECRET_NAME} -o yaml"
echo ""
echo "2. Check that cert-manager can access Let's Encrypt:"
echo "   kubectl logs -n cert-manager -l app=cert-manager"
echo ""
echo "3. Try manually deleting and recreating the certificate:"
echo "   kubectl delete secret ${AZURE_TLS_SECRET_NAME} --ignore-not-found"
echo "   kubectl delete certificate ${AZURE_TLS_SECRET_NAME} --ignore-not-found"
echo "   cat k8s/certificate.yaml | envsubst | kubectl apply -f -"
echo ""
echo "4. If challenges are failing, make sure DNS is correctly configured:"
echo "   - ${AZURE_DOMAIN_NAME} points to ${INGRESS_IP}"
echo "   - ws.${AZURE_DOMAIN_NAME} points to ${INGRESS_IP}"
echo ""
echo "5. Check if Let's Encrypt rate limits are hit:"
echo "   https://letsencrypt.org/docs/rate-limits/"
echo ""
echo "6. Verify ACME challenge routing works:"
echo "   curl -v http://${AZURE_DOMAIN_NAME}/.well-known/acme-challenge/test"
echo "   curl -v http://ws.${AZURE_DOMAIN_NAME}/.well-known/acme-challenge/test"
echo ""
echo "7. If using a custom CA or proxy, try testing with insecure flag:"
echo "   curl -k -v https://${AZURE_DOMAIN_NAME}/"
echo ""
echo "8. To view the certificate chain once it's issued:"
echo "   openssl s_client -showcerts -connect ${AZURE_DOMAIN_NAME}:443 </dev/null | openssl x509 -text"
echo ""
echo "9. Recreate the entire certificate infrastructure if needed:"
echo "   kubectl delete clusterissuer letsencrypt-prod"
echo "   kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml"
echo "   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml"
echo "   # Wait for cert-manager to be ready, then re-run this deployment script"
echo "============================================="

# Add monitoring for cert-manager to ensure it's functioning properly
echo "Adding monitoring for certificate issuance..."
kubectl get order -o wide || true     # Display order status if available
kubectl get challenge -o wide || true # Display challenge status if available

# Add health check for HTTPS connectivity
echo "Running HTTPS connectivity test (if curl is available)..."
if command -v curl &>/dev/null; then
  CURL_VERSION=$(curl --version | head -n 1)
  echo "Using curl: $CURL_VERSION"

  echo "Testing HTTPS connectivity to ${AZURE_DOMAIN_NAME}..."
  curl -k -s -o /dev/null -w "Status: %{http_code}, SSL Verify: %{ssl_verify_result}\n" https://${AZURE_DOMAIN_NAME}/ || echo "Connection failed or returned error."

  echo "To debug further, run: curl -v --insecure https://${AZURE_DOMAIN_NAME}/"
  echo "Once certificates are fully provisioned, try: curl -v https://${AZURE_DOMAIN_NAME}/"
fi

echo "Deployment script complete!"
