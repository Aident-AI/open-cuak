#!/bin/bash

set -e
# make sure you login using Github PAT token. for example:
# echo YOUR_NEW_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

if [ -z "$1" ]; then
  echo "Error: Missing image-name"
  echo "Usage: $0 <image-name> <sha-version>"
  exit 1
fi
IMAGE_NAME="ghcr.io/aident-ai/$1"
if [ -z "$2" ]; then
  echo "Error: Missing sha-version tag"
  echo "Usage: $0 <image-name> <sha-version>"
  exit 1
fi
SHA_VERSION="$2"

IMAGE_WITH_TAG="$IMAGE_NAME:$SHA_VERSION"
echo "Processing image: $IMAGE_WITH_TAG"
echo "Pulling image: $IMAGE_WITH_TAG"
docker pull "$IMAGE_WITH_TAG"
echo "Tagging $IMAGE_WITH_TAG as stable"
docker tag "$IMAGE_WITH_TAG" "$IMAGE_NAME:stable"
echo "Pushing $IMAGE_NAME:stable"
docker push "$IMAGE_NAME:stable"

echo "Successfully tagged and pushed $IMAGE_WITH_TAG as $IMAGE_NAME:stable"
