#!/bin/bash

CONTAINER_NAME="open-cuak-browserless"
IMAGE_NAME=${1:-975454476157.dkr.ecr.us-west-1.amazonaws.com/aident-browserless:latest}

npm run stop

# Check if logged in to AWS
if aws sts get-caller-identity > /dev/null 2>&1; then
  echo "Already logged in to AWS"
else
  echo "Not logged in to AWS. Logging in..."
  cd ../../
  npm run aws:login
  cd ./apps/memgpt
fi

aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 975454476157.dkr.ecr.us-west-1.amazonaws.com
echo "===================="
echo "AWS ECR login successful..."
echo "===================="

docker pull $IMAGE_NAME
echo "===================="
echo "Docker image $IMAGE_NAME pulled..."
echo "===================="

echo ""
echo "===================="
echo "Now running container $CONTAINER_NAME..."
echo "===================="
open http://localhost:11976/debugger/?token=null
docker run \
  --add-host=host.docker.internal:host-gateway \
  --name $CONTAINER_NAME \
  -p 11975:11975 \
  -p 11976:3000 \
  -p 50000:50000 \
  $IMAGE_NAME
