#!/bin/bash

CONTAINER_NAME="open-cuak-browserless"
IMAGE_NAME="aident-ai/${CONTAINER_NAME}"

npm run stop

cd ../extension
npm run package
cd ../browserless
echo "===================="
echo "Extension built..."
echo "===================="

# Docker cannot follow symlinks, so copy the built extension to a directory that's not a symlink
cp -r ../extension/out ./out
cp -f ./extension-override.config.json ./out/config.json
docker build -f Dockerfile.production -t $IMAGE_NAME .
rm -rf ./out
echo "===================="
echo "Docker image $IMAGE_NAME built..."
echo "===================="

echo ""
echo "===================="
echo "Now running container $CONTAINER_NAME..."
echo "===================="
docker container rm -f "$CONTAINER_NAME"
docker run \
  --add-host=host.docker.internal:host-gateway \
  --name "$CONTAINER_NAME" \
  -p 11975:11975 \
  -p 11976:3000 \
  -p 50000:50000 \
  $IMAGE_NAME
