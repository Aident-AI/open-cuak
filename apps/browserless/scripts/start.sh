#!/bin/bash

CONTAINER_NAME="open-cuak-browserless"
IMAGE_NAME="aident-browserless"

bash ./scripts/stop.sh

echo ""
echo "Now running container $CONTAINER_NAME..."
docker run --detach \
  --add-host=host.docker.internal:host-gateway \
  --name "$CONTAINER_NAME" \
  -p 11975:11975 \
  -p 11976:3000 \
  -p 50000:50000 \
  -v ./extension-out:/app/extension \
  -v ./extension-override.config.json:/app/extension/config.json \
  -v ./dist:/app/dist \
  $IMAGE_NAME:latest
