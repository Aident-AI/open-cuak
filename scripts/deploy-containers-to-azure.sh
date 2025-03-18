#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Check if the required environment variables are set
AZURE_APP_ENV_NAME="${AZURE_APP_ENV_NAME:?Exception: Missing AZURE_APP_ENV_NAME}"
AZURE_LOCATION="${AZURE_LOCATION:?Exception: Missing AZURE_LOCATION}"

# Set variables for AKS deployment
AZURE_ACI_SUBNET_NAME="$AZURE_APP_ENV_NAME-aci-subnet" # Dedicated subnet for Virtual Nodes (ACI)
AZURE_AKS_NAME="$AZURE_APP_ENV_NAME-k8s"
AZURE_BROWSERLESS_SERVICE_NAME="browserless-service"
AZURE_INGRESS_PUBLIC_IP_NAME="$AZURE_APP_ENV_NAME-ingress-ip"
AZURE_NSG_NAME="$AZURE_APP_ENV_NAME-nsg"
AZURE_RESOURCE_GROUP="$AZURE_APP_ENV_NAME-resource-group"
AZURE_SUBNET_NAME="$AZURE_APP_ENV_NAME-subnet" # Subnet for AKS nodes
AZURE_VNET_NAME="$AZURE_APP_ENV_NAME-vnet"
DOCKER_IMAGE_NAME="ghcr.io/aident-ai/open-cuak-browserless"
DOCKER_IMAGE_TAG="latest"

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

# Reserve a static public IP for the LoadBalancer
echo "Creating static public IP for the service..."
az network public-ip create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $AZURE_INGRESS_PUBLIC_IP_NAME \
  --sku Standard \
  --allocation-method static \
  --location $AZURE_LOCATION

INGRESS_IP=$(az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_INGRESS_PUBLIC_IP_NAME --query ipAddress -o tsv)
echo "Reserved static public IP: $INGRESS_IP"

# Prepare and apply deployment manifest
echo "Preparing deployment manifest..."
export DOCKER_IMAGE_NAME DOCKER_IMAGE_TAG FORCE_REVISION_TIMESTAMP AZURE_BROWSERLESS_SERVICE_NAME
cat k8s/deployment.yaml | envsubst >deployment.yaml
echo "Applying deployment manifest..."
kubectl apply -f deployment.yaml || {
  echo "Error applying deployment manifest"
  DEPLOYMENT_ERROR=true
}

# Prepare and apply service manifest with the static IP
echo "Preparing service manifest..."
export AZURE_BROWSERLESS_SERVICE_NAME AZURE_RESOURCE_GROUP AZURE_INGRESS_PUBLIC_IP_NAME INGRESS_IP
cat k8s/service.yaml | envsubst >service.yaml

if [ "$SERVICE_ERROR" != true ]; then
  echo "Applying service manifest..."
  kubectl apply -f service.yaml || {
    echo "Error applying service manifest"
    SERVICE_ERROR=true
  }
fi

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

# Wait for service to get external IP
echo "Waiting for service to get external IP..."
for i in {1..30}; do
  SERVICE_IP=$(kubectl get service $AZURE_BROWSERLESS_SERVICE_NAME -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  if [ "$SERVICE_IP" = "$INGRESS_IP" ]; then
    echo "Service successfully assigned static IP: $INGRESS_IP"
    break
  elif [ -n "$SERVICE_IP" ]; then
    echo "Warning: Service was assigned IP $SERVICE_IP instead of requested $INGRESS_IP"
    INGRESS_IP=$SERVICE_IP
    break
  elif [ $i -eq 30 ]; then
    echo "Warning: Timed out waiting for service to get IP"

    # Enhanced diagnostics
    echo "======= DIAGNOSTICS ======="
    echo "Checking service details:"
    kubectl describe service $AZURE_BROWSERLESS_SERVICE_NAME

    echo "Verifying reserved static IP:"
    az network public-ip show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_INGRESS_PUBLIC_IP_NAME --query [provisioningState,ipAddress] -o tsv

    echo "Checking AKS network profile:"
    az aks show --resource-group $AZURE_RESOURCE_GROUP --name $AZURE_AKS_NAME --query networkProfile -o json

    echo "You can manually check later with:"
    echo "kubectl get service $AZURE_BROWSERLESS_SERVICE_NAME"

    # Don't exit immediately, continue with rest of script
    echo "Continuing deployment despite missing service IP..."
  else
    echo "Waiting for service IP... (attempt $i/30)"
    sleep 10
  fi
done

#########################
#  Final Status Report  #
#########################
if [ "$DEPLOYMENT_ERROR" = true ] || [ "$SERVICE_ERROR" = true ]; then
  echo "AKS deployment completed with errors. Check the logs above for details."
  exit 1
else
  echo "AKS deployment complete and verified."
  echo "Your browserless service is accessible directly at:"
  echo " - http://$INGRESS_IP:3000/       (HTTP)"
  echo " - http://$INGRESS_IP:50000/      (WebSocket)"
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

# Test external connectivity
echo "Testing external connectivity (may require manual verification):"
echo "Run the following command from your local machine:"
echo "curl -v http://$INGRESS_IP:3000/"
echo "curl -v http://$INGRESS_IP:50000/"

echo "Public IP address for browserless service: $INGRESS_IP"
echo "Your browserless service should now be accessible at: http://$INGRESS_IP:3000/"
echo "And websocket connection at: http://$INGRESS_IP:50000/"
