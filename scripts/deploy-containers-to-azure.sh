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

##############################
#  1. Create Resource Group  #
##############################
az group show --name $AZURE_RESOURCE_GROUP ||
  az group create --name $AZURE_RESOURCE_GROUP --location $AZURE_LOCATION

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
echo "Creating NSG rule for port 50000 (WebSocket)..."
if ! az network nsg rule show --resource-group $AZURE_RESOURCE_GROUP --nsg-name $AZURE_NSG_NAME --name Allow-Port-50000 &>/dev/null; then
  az network nsg rule create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --nsg-name $AZURE_NSG_NAME \
    --name Allow-Port-50000 \
    --priority 100 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefix '*' \
    --source-port-range '*' \
    --destination-port-range 50000
else
  echo "NSG rule Allow-Port-50000 already exists"
fi

echo "Creating NSG rule for port 3000 (HTTP)..."
if ! az network nsg rule show --resource-group $AZURE_RESOURCE_GROUP --nsg-name $AZURE_NSG_NAME --name Allow-Port-3000 &>/dev/null; then
  az network nsg rule create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --nsg-name $AZURE_NSG_NAME \
    --name Allow-Port-3000 \
    --priority 120 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefix '*' \
    --source-port-range '*' \
    --destination-port-range 3000
else
  echo "NSG rule Allow-Port-3000 already exists"
fi

echo "Creating NSG rule for port 443 (HTTPS)..."
if ! az network nsg rule show --resource-group $AZURE_RESOURCE_GROUP --nsg-name $AZURE_NSG_NAME --name Allow-Port-443 &>/dev/null; then
  az network nsg rule create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --nsg-name $AZURE_NSG_NAME \
    --name Allow-Port-443 \
    --priority 130 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefix '*' \
    --source-port-range '*' \
    --destination-port-range 443
else
  echo "NSG rule Allow-Port-443 already exists"
fi

echo "Creating NSG rule for port 80 (HTTP)..."
if ! az network nsg rule show --resource-group $AZURE_RESOURCE_GROUP --nsg-name $AZURE_NSG_NAME --name Allow-Port-80 &>/dev/null; then
  az network nsg rule create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --nsg-name $AZURE_NSG_NAME \
    --name Allow-Port-80 \
    --priority 140 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefix '*' \
    --source-port-range '*' \
    --destination-port-range 80
else
  echo "NSG rule Allow-Port-80 already exists"
fi

#########################################
#  5. Create AKS Cluster in the Subnet  #
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
#  6. Deploy Application to AKS (K8s)  #
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
# Add container command and Vercel environment variables
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
#  7. Connectivity Tests   #
############################
echo "Running connectivity tests..."

# Check service details
echo "Checking service details:"
kubectl get service $AZURE_BROWSERLESS_SERVICE_NAME

# Check service endpoints
echo "Checking service endpoints:"
kubectl get endpoints -n default

# Test connectivity to the browserless service
echo "Testing internal connectivity to browserless service:"
kubectl run -i --tty --rm curl-test --image=curlimages/curl --restart=Never -- curl -v http://$AZURE_BROWSERLESS_SERVICE_NAME:3000

echo "External connectivity will be through ingress controller with HTTPS"
echo "External connectivity tests will be performed after HTTPS setup"

############################
#  8. Configure HTTPS      #
############################
echo "Setting up HTTPS configuration..."

# Add Helm repositories for NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update

# Create dedicated namespace for ingress if it doesn't exist
kubectl create namespace ingress-nginx 2>/dev/null || true

# Check if NGINX Ingress Controller service already exists
INGRESS_CONTROLLER_SERVICE=$(kubectl get service -l app.kubernetes.io/component=controller -n ingress-nginx -o name 2>/dev/null || echo "")
if [ -z "$INGRESS_CONTROLLER_SERVICE" ]; then
  # Try alternative label for service discovery
  INGRESS_CONTROLLER_SERVICE=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o name 2>/dev/null || echo "")
fi

# Check for existing Helm releases that might conflict
EXISTING_RELEASE=$(helm list -n ingress-nginx -q | grep -E '^ingress-nginx$' || true)
if [ -n "$EXISTING_RELEASE" ]; then
  echo "Found existing Helm release named 'ingress-nginx'. Checking its status..."
  RELEASE_STATUS=$(helm status ingress-nginx -n ingress-nginx -o json | jq -r '.info.status' 2>/dev/null || echo "unknown")

  if [ "$RELEASE_STATUS" = "deployed" ]; then
    echo "Existing release is in 'deployed' state. Will use the existing release."
    echo "Upgrading existing ingress-nginx release with our configuration..."
    helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
      --namespace ingress-nginx \
      --set controller.service.loadBalancerIP=$INGRESS_IP \
      --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=$AZURE_RESOURCE_GROUP \
      --set controller.service.externalTrafficPolicy=Local \
      --set controller.config.proxy-body-size="0" \
      --set controller.config.proxy-read-timeout="300" \
      --set controller.config.proxy-send-timeout="300" || {
      echo "Failed to upgrade ingress-nginx, attempting to uninstall and reinstall..."
      helm uninstall ingress-nginx -n ingress-nginx
      INSTALLATION_SUCCESS=false
    }
    # Set flag to indicate we've already handled the installation via upgrade
    INSTALLATION_HANDLED=true
  else
    echo "Existing release is in '$RELEASE_STATUS' state. Uninstalling it before proceeding..."
    helm uninstall ingress-nginx -n ingress-nginx || {
      echo "Failed to uninstall existing release. Trying alternate name..."
      INSTALLATION_SUCCESS=false
    }
    INSTALLATION_HANDLED=false
  fi
else
  INSTALLATION_SUCCESS=true
  INSTALLATION_HANDLED=false
fi

# First try with standard configuration
if kubectl get ingressclass nginx &>/dev/null; then
  echo "Using existing IngressClass 'nginx'"
  EXTRA_ARGS="--set controller.ingressClassResource.enabled=false --set controller.ingressClassResource.name=nginx"
else
  echo "Creating new IngressClass"
  EXTRA_ARGS=""
fi

# Try to install ingress-nginx if we haven't yet handled the installation (via upgrade)
if [ "${INSTALLATION_SUCCESS:-true}" = true ] && [ "${INSTALLATION_HANDLED:-false}" = false ]; then
  echo "Installing HTTP NGINX Ingress Controller with name 'ingress-nginx-http'..."
  helm install ingress-nginx-http ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    $EXTRA_ARGS \
    --set controller.service.loadBalancerIP=$HTTP_INGRESS_IP \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=$AZURE_RESOURCE_GROUP \
    --set controller.service.externalTrafficPolicy=Local \
    --set controller.config.proxy-body-size="0" \
    --set controller.config.proxy-read-timeout="300" \
    --set controller.config.proxy-send-timeout="300" \
    --set controller.ingressClass=nginx-http

  HTTP_INSTALLATION_RESULT=$?
  if [ $HTTP_INSTALLATION_RESULT -ne 0 ]; then
    echo "HTTP Installation failed with status $HTTP_INSTALLATION_RESULT"
    HTTP_INSTALLATION_SUCCESS=false
  else
    HTTP_INSTALLATION_SUCCESS=true
  fi

  echo "Installing WebSocket NGINX Ingress Controller with name 'ingress-nginx-ws'..."
  helm install ingress-nginx-ws ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    $EXTRA_ARGS \
    --set controller.service.loadBalancerIP=$WS_INGRESS_IP \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=$AZURE_RESOURCE_GROUP \
    --set controller.service.externalTrafficPolicy=Local \
    --set controller.config.proxy-body-size="0" \
    --set controller.config.proxy-read-timeout="3600" \
    --set controller.config.proxy-send-timeout="3600" \
    --set controller.config.proxy-connect-timeout="60" \
    --set controller.ingressClass=nginx-ws

  WS_INSTALLATION_RESULT=$?
  if [ $WS_INSTALLATION_RESULT -ne 0 ]; then
    echo "WebSocket Installation failed with status $WS_INSTALLATION_RESULT"
    WS_INSTALLATION_SUCCESS=false
  else
    WS_INSTALLATION_SUCCESS=true
  fi

  INSTALLATION_SUCCESS=$([[ "$HTTP_INSTALLATION_SUCCESS" = true ]] && [[ "$WS_INSTALLATION_SUCCESS" = true ]] && echo true || echo false)
fi

if [ "${INSTALLATION_SUCCESS:-false}" = false ] && [ "${INSTALLATION_HANDLED:-false}" = false ]; then
  echo "Failed to install NGINX Ingress Controller"
  exit 1
fi

# Wait for ingress controller to be ready
echo "Waiting for NGINX Ingress Controller to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=300s --all-namespaces || {
  echo "Timed out waiting for NGINX Ingress Controller to be ready"
  echo "Continuing anyway, but HTTPS setup might not complete successfully"
}

# Wait for admission webhook to be ready
echo "Waiting for NGINX Ingress admission webhook to be ready..."
for i in {1..30}; do
  if kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io ingress-nginx-admission &>/dev/null; then
    echo "Admission webhook found"
    break
  fi
  echo "Waiting for admission webhook to be ready... (attempt $i/30)"
  sleep 10
done

# Get the actual ingress controller IP
echo "Getting ingress controller IP..."
INGRESS_CONTROLLER_IP=""
for i in {1..30}; do
  # Try different method to get IP
  INGRESS_CONTROLLER_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

  if [ -z "$INGRESS_CONTROLLER_IP" ]; then
    # Try alternative services
    INGRESS_CONTROLLER_IP=$(kubectl get service -l app.kubernetes.io/component=controller -n ingress-nginx -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  fi

  if [ -n "$INGRESS_CONTROLLER_IP" ]; then
    echo "Found ingress controller IP: $INGRESS_CONTROLLER_IP"
    break
  fi

  echo "Waiting for ingress controller IP to be assigned... (attempt $i/30)"
  sleep 10
done

if [ -z "$INGRESS_CONTROLLER_IP" ]; then
  echo "Warning: Could not find ingress controller IP after multiple attempts. Using the reserved IP: $INGRESS_IP"
  INGRESS_CONTROLLER_IP=$INGRESS_IP
elif [ "$INGRESS_CONTROLLER_IP" != "$INGRESS_IP" ]; then
  echo "Warning: Ingress controller IP ($INGRESS_CONTROLLER_IP) doesn't match the reserved IP ($INGRESS_IP)"
  echo "Using the actual ingress controller IP for further configuration"
  INGRESS_IP=$INGRESS_CONTROLLER_IP
fi

# Check if cert-manager is already installed
if ! kubectl get namespace cert-manager &>/dev/null; then
  echo "Installing cert-manager..."
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml || {
    echo "Failed to install cert-manager"
    exit 1
  }

  # Wait for cert-manager to be ready
  echo "Waiting for cert-manager to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=cert-manager --timeout=120s || {
    echo "Timed out waiting for cert-manager to be ready"
    echo "Continuing anyway, but certificate issuance might not work"
  }

  # Additional wait for webhook to be ready
  echo "Waiting for cert-manager webhook to be ready..."
  kubectl wait --namespace cert-manager --for=condition=ready pod -l app=webhook --timeout=120s || {
    echo "Timed out waiting for cert-manager webhook to be ready"
    echo "Continuing anyway, but certificate issuance might not work"
  }
else
  echo "cert-manager is already installed"
fi

# Create ClusterIssuer for Let's Encrypt if it doesn't exist
if ! kubectl get clusterissuer letsencrypt-prod &>/dev/null; then
  echo "Creating ClusterIssuer for Let's Encrypt..."
  export ACME_EMAIL="${ACME_EMAIL:-your-email@example.com}" # Use provided email or default

  # Check if email is set to the default and warn if so
  if [ "$ACME_EMAIL" = "your-email@example.com" ]; then
    echo "WARNING: Using default email for Let's Encrypt. Set ACME_EMAIL environment variable to use your own email."
  fi

  cat k8s/cluster-issuer.yaml | envsubst | kubectl apply -f - || {
    echo "Failed to create ClusterIssuer"
    kubectl get clusterissuer letsencrypt-prod -o yaml
    exit 1
  }
else
  echo "ClusterIssuer letsencrypt-prod already exists"
fi

# Apply ingress configuration
echo "Applying ingress configuration..."
export AZURE_BROWSERLESS_SERVICE_NAME

# Retry logic for applying ingress
MAX_RETRIES=5
for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES to apply ingress configuration..."

  if cat k8s/ingress.yaml | envsubst | kubectl apply -f -; then
    echo "Successfully applied ingress configuration"
    break
  else
    if [ $i -eq $MAX_RETRIES ]; then
      echo "Failed to apply ingress configuration after $MAX_RETRIES attempts"
      exit 1
    fi

    echo "Failed to apply ingress configuration. Waiting before retry..."
    # Additional debugging
    echo "Checking webhook configuration..."
    kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io

    # Check if there's an issue with the old admission webhook
    if kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io | grep -q "ingress-nginx-alt"; then
      echo "Found conflicting webhook configuration. Attempting to remove..."
      kubectl delete validatingwebhookconfigurations.admissionregistration.k8s.io ingress-nginx-alt-admission 2>/dev/null || true
    fi

    sleep 30
  fi
done

# Deploy ACME solver for challenge handling
echo "Deploying ACME solver for Let's Encrypt challenge handling..."
export AZURE_BROWSERLESS_SERVICE_NAME
if [ -f "k8s/acme-solver.yaml" ]; then
  echo "Applying ACME solver configuration..."
  cat k8s/acme-solver.yaml | envsubst | kubectl apply -f - || {
    echo "Warning: Failed to apply ACME solver configuration. HTTPS certificate issuance may fail."
    echo "This usually happens when the path format is incompatible with your ingress controller version."
    echo "Continuing deployment process..."
  }
else
  echo "Error: Required file k8s/acme-solver.yaml not found"
  exit 1
fi

# Deploy dedicated WebSocket service (bypassing ingress)
echo "Deploying dedicated WebSocket service..."
export AZURE_CONTAINER_NAME AZURE_RESOURCE_GROUP
if [ -f "k8s/service-websocket.yaml" ]; then
  echo "Applying WebSocket service configuration..."
  cat k8s/service-websocket.yaml | envsubst | kubectl apply -f - || {
    echo "Warning: Failed to apply WebSocket service configuration."
    echo "WebSocket connections may not work properly."
  }
else
  echo "Warning: WebSocket service file k8s/service-websocket.yaml not found"
  echo "This may affect WebSocket connectivity."
fi

echo "HTTPS setup complete!"
echo "Checking certificate status (this might take a few minutes to complete)..."
kubectl get certificate -o wide

echo "Your browserless service will be accessible via HTTPS once DNS is configured and certificates are issued"
echo "You can check certificate status with: kubectl get certificate -o wide"
echo "You can check ingress status with: kubectl get ingress"

# Print DNS configuration instructions
echo ""
echo "To complete HTTPS setup, ensure your DNS points to the ingress controller IP:"
INGRESS_CONTROLLER_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not found")
if [ "$INGRESS_CONTROLLER_IP" = "Not found" ]; then
  echo "Warning: Could not find ingress controller IP. Check with: kubectl get service ingress-nginx-controller -n ingress-nginx"
  echo "Both domains should point to the same ingress controller IP:"
else
  echo "Main domain (${AZURE_DOMAIN_NAME}): $INGRESS_CONTROLLER_IP"
  echo "WebSocket domain (ws.${AZURE_DOMAIN_NAME}): $INGRESS_CONTROLLER_IP"
fi

# Get WebSocket service IP for direct connections
WS_SERVICE_IP=$(kubectl get service browserless-websocket -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not found")

echo ""
echo "Test connectivity after DNS configuration:"
echo "HTTP/HTTPS:"
echo "  curl -v https://${AZURE_DOMAIN_NAME}/"
echo ""
echo "WebSocket:"
echo "  websocat wss://ws.${AZURE_DOMAIN_NAME}/"
echo ""

if [ "$WS_SERVICE_IP" != "Not found" ]; then
  echo "Direct WebSocket connection (alternative):"
  echo "  websocat ws://${WS_SERVICE_IP}:50000"
fi

echo ""
echo "Fallback paths:"
echo "  WebSocket: wss://ws.${AZURE_DOMAIN_NAME}/"
echo "  HTTP: https://${AZURE_DOMAIN_NAME}/"

# Add instructions for dedicated WebSocket service
echo ""
echo "After deployment is complete, your services should be accessible at:"
echo "  HTTPS: https://${AZURE_DOMAIN_NAME}"
echo "  WebSocket: wss://ws.${AZURE_DOMAIN_NAME}"

# Add WebSocket troubleshooting steps
echo ""
echo "Troubleshooting (if you encounter connectivity issues):"
echo "  1. Check ingress configuration:"
echo "     kubectl get ingress -o wide"
echo ""
echo "  2. Verify service endpoints:"
echo "     kubectl get endpoints ${AZURE_BROWSERLESS_SERVICE_NAME}"
echo ""
echo "  3. Check ingress controller logs:"
echo "     kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=100"
echo ""
echo "  4. Test internal connectivity:"
echo "     kubectl run -i --tty --rm debug --image=curlimages/curl --restart=Never -- curl -v http://${AZURE_BROWSERLESS_SERVICE_NAME}:50000"

# Add WebSocket fallback strategy
echo ""
echo "For WebSocket connectivity issues, consider these options:"
echo "  1. Continue using the ingress WSS connection: wss://ws.${AZURE_DOMAIN_NAME}"
echo "  2. Use direct WebSocket connection: ws://${WS_SERVICE_IP}:50000"
echo ""
echo "Alternative DNS configuration for more reliable WebSocket connections:"
echo "  You can point the ws.${AZURE_DOMAIN_NAME} domain directly to the dedicated WebSocket service:"
if [ "$WS_SERVICE_IP" != "Not found" ]; then
  echo "  - Update your DNS for ws.${AZURE_DOMAIN_NAME} to point to: ${WS_SERVICE_IP}"
  echo "  - Use the ws:// protocol instead of wss:// (direct WebSocket service doesn't use TLS)"
else
  echo "  - WebSocket service IP not found. Check with: kubectl get service browserless-websocket"
fi
