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

# Export variables for envsubst in YAML files
export AZURE_BROWSERLESS_SERVICE_NAME
export AZURE_DEPLOYMENT_NAME
export AZURE_APP_NAME
export AZURE_CONTAINER_NAME
export AZURE_DOMAIN_NAME
export AZURE_TLS_SECRET_NAME
export AZURE_HTTP_INGRESS_IP_NAME
export AZURE_WS_INGRESS_IP_NAME
export AZURE_RESOURCE_GROUP
export DOCKER_IMAGE_NAME
export DOCKER_IMAGE_TAG

# Optionally, a timestamp for revision purposes
FORCE_REVISION_TIMESTAMP=$(date +%s)

# Function to handle errors
handle_error() {
  echo "Error occurred at line $1"
  exit 1
}
trap 'handle_error $LINENO' ERR

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
    NOT_READY=$(kubectl get pods | grep -v NAME | grep -v Running | grep -v Completed | wc -l)
    if [ "$NOT_READY" -eq 0 ]; then
      PODS_READY=true
      break
    fi
    echo "Waiting for pods to be ready... (attempt $i/30)"
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
  --set controller.config.use-forwarded-headers="true"

INSTALLATION_RESULT=$?
if [ $INSTALLATION_RESULT -ne 0 ]; then
  echo "Ingress controller installation failed with status $INSTALLATION_RESULT"
  exit 1
fi

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
if ! kubectl get namespace cert-manager &>/dev/null; then
  echo "Installing cert-manager..."
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml || {
    echo "Failed to install cert-manager"
    exit 1
  }
  echo "Waiting for cert-manager to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=cert-manager --timeout=120s || { echo "Timed out waiting for cert-manager to be ready"; }
  echo "Waiting for cert-manager webhook to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=webhook --timeout=120s || { echo "Timed out waiting for cert-manager webhook to be ready"; }
else
  echo "cert-manager is already installed"
fi

if ! kubectl get clusterissuer letsencrypt-prod &>/dev/null; then
  echo "Creating ClusterIssuer for Let's Encrypt..."
  export ACME_EMAIL="${ACME_EMAIL:-your-email@example.com}"
  if [ "$ACME_EMAIL" = "your-email@example.com" ]; then
    echo "WARNING: Using default email for Let's Encrypt. Set ACME_EMAIL to your email."
  fi
  cat k8s/cluster-issuer.yaml | envsubst | kubectl apply -f - || {
    echo "Failed to create ClusterIssuer"
    kubectl get clusterissuer letsencrypt-prod -o yaml
    exit 1
  }
else
  echo "ClusterIssuer letsencrypt-prod already exists"
fi

# Update Ingress resource names with environment variables
# No need to create inline configs as we'll use the existing YAML files
echo "Preparing ingress configurations from existing templates..."
export AZURE_APP_NAME AZURE_BROWSERLESS_SERVICE_NAME AZURE_DOMAIN_NAME AZURE_TLS_SECRET_NAME
export AZURE_RESOURCE_GROUP AZURE_HTTP_INGRESS_IP_NAME AZURE_WS_INGRESS_IP_NAME

# -------------------------
# Apply Ingress configuration for both HTTP and WebSocket
# -------------------------
echo "Applying HTTP ingress configuration..."
MAX_RETRIES=5
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

# Deploy ACME solver for challenge handling
echo "Deploying ACME solver for Let's Encrypt challenge handling..."
export AZURE_BROWSERLESS_SERVICE_NAME
if [ -f "k8s/acme-solver.yaml" ]; then
  echo "Applying ACME solver configuration..."
  cat k8s/acme-solver.yaml | envsubst | kubectl apply -f - || { echo "Warning: Failed to apply ACME solver configuration."; }
else
  echo "Error: Required file k8s/acme-solver.yaml not found"
  exit 1
fi

echo "HTTPS setup complete!"
echo "Checking certificate status (this might take a few minutes to complete)..."
kubectl get certificate -o wide

echo "Your browserless service will be accessible via HTTPS once DNS is configured and certificates are issued"
echo "You can check certificate status with: kubectl get certificate -o wide"
echo "You can check ingress status with: kubectl get ingress"

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
echo "Test connectivity after DNS configuration:"
echo "HTTP/HTTPS:"
echo "  curl -v https://${AZURE_DOMAIN_NAME}/"
echo ""
echo "WebSocket (secure):"
echo "  websocat wss://ws.${AZURE_DOMAIN_NAME}/"
echo ""
echo "After deployment is complete, your services should be accessible at:"
echo "  HTTPS: https://${AZURE_DOMAIN_NAME}"
echo "  WebSocket: wss://ws.${AZURE_DOMAIN_NAME}"
echo ""
echo "Troubleshooting:"
echo "  1. Check ingress configuration: kubectl get ingress -o wide"
echo "  2. Verify service endpoints: kubectl get endpoints ${AZURE_BROWSERLESS_SERVICE_NAME}"
echo "  3. Check ingress controller logs: kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=100"
echo "  4. Test internal connectivity: kubectl run -i --tty --rm debug --image=curlimages/curl --restart=Never -- curl -v http://${AZURE_BROWSERLESS_SERVICE_NAME}:3000"
echo ""
echo "Deployment script complete!"
