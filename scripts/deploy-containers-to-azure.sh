#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status

# Check if the required environment variables are set
AZURE_APP_ENV_NAME="${AZURE_APP_ENV_NAME:?Exception: Missing AZURE_APP_ENV_NAME}"
AZURE_LOCATION="${AZURE_LOCATION:?Exception: Missing AZURE_LOCATION}"

# Set the container app environment variables
AZURE_CONTAINER_APP_ENV_NAME="$AZURE_APP_ENV_NAME"
AZURE_CONTAINER_APP_NAME="$AZURE_APP_ENV_NAME-browserless"
AZURE_RESOURCE_GROUP="$AZURE_APP_ENV_NAME.resource-group"
AZURE_SUBNET_NAME="$AZURE_APP_ENV_NAME.subnet"
AZURE_VNET_NAME="$AZURE_APP_ENV_NAME.vnet"
DOCK_IMAGE_NAME="aident-ai/open-cuak-browserless"
FORCE_REVISION_TIMESTAMP=$(date +%s) # Generate a unique timestamp
IMAGE_TAG="latest"

# Function to handle errors
handle_error() {
  echo "Error occurred at line $1"
  exit 1
}
trap 'handle_error $LINENO' ERR

# Check if the resource group exists
az group show --name $AZURE_RESOURCE_GROUP ||
  az group create --name $AZURE_RESOURCE_GROUP --location $AZURE_LOCATION

# Check if the VNET exists
VNET_EXISTS=$(az network vnet show -g $AZURE_RESOURCE_GROUP -n $AZURE_VNET_NAME --query name -o tsv 2>/dev/null || echo "")
echo "VNETExists=$VNET_EXISTS"
if [ -z "$VNET_EXISTS" ]; then
  echo "Creating VNET and subnet..."
  az network vnet create \
    --name $AZURE_VNET_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION \
    --address-prefixes 10.0.0.0/16

  az network vnet subnet create \
    --name $AZURE_SUBNET_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --vnet-name $AZURE_VNET_NAME \
    --address-prefixes 10.0.1.0/24 \
    --delegations Microsoft.App/environments
fi

# Check if the container app environment exists
ENV_EXISTS=$(az containerapp env show -n $AZURE_CONTAINER_APP_ENV_NAME -g $AZURE_RESOURCE_GROUP --query name -o tsv 2>/dev/null || echo "")
echo "ContainerAppEnvExists=$ENV_EXISTS"
if [ -z "$ENV_EXISTS" ]; then
  echo "Creating container app environment $AZURE_CONTAINER_APP_ENV_NAME..."
  az containerapp env create \
    --name $AZURE_CONTAINER_APP_ENV_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION \
    --infrastructure-subnet-resource-id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_RESOURCE_GROUP/providers/Microsoft.Network/virtualNetworks/$AZURE_VNET_NAME/subnets/$AZURE_SUBNET_NAME"
fi

# Check if the container app exists
APP_EXISTS=$(az containerapp show -n $AZURE_CONTAINER_APP_NAME -g $AZURE_RESOURCE_GROUP --query name -o tsv 2>/dev/null || echo "")
echo "AppExists=$APP_EXISTS"
if [ -z "$APP_EXISTS" ]; then
  echo "Creating container app $AZURE_CONTAINER_APP_NAME..."
  az containerapp create \
    --name $AZURE_CONTAINER_APP_NAME \
    --resource-group $AZURE_RESOURCE_GROUP \
    --environment $AZURE_CONTAINER_APP_ENV_NAME \
    --image ghcr.io/$DOCK_IMAGE_NAME:$IMAGE_TAG \
    --min-replicas 1 \
    --ingress external \
    --cpu 1 --memory 2Gi \
    --target-port 3000 \
    --transport tcp \
    --env-vars FORCE_REVISION_TIMESTAMP="$FORCE_REVISION_TIMESTAMP" \
    --exposed-port 3000 --exposed-port 50000 --exposed-port 11975 \
    --transport http
else
  echo "Container app $AZURE_CONTAINER_APP_NAME already exists. Skipping creation."
fi

# Ensure revision mode is set to single
az containerapp revision set-mode \
  --name $AZURE_CONTAINER_APP_NAME \
  --resource-group $AZURE_RESOURCE_GROUP \
  --mode single

# Deploy new revision with updated container resources
echo "Updating container app $AZURE_CONTAINER_APP_NAME with new resources..."
az containerapp update \
  --name $AZURE_CONTAINER_APP_NAME \
  --resource-group $AZURE_RESOURCE_GROUP \
  --min-replicas 1 \
  --image ghcr.io/$DOCK_IMAGE_NAME:$IMAGE_TAG \
  --set-env-vars FORCE_REVISION_TIMESTAMP="$FORCE_REVISION_TIMESTAMP"

echo "Deployment complete. A new revision has been created with 1 CPU and 2GB memory."
