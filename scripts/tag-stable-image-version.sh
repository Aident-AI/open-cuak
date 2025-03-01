#!/bin/bash

set -e
# make sure you login using Github PAT token. for example:
# echo YOUR_NEW_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

if [ -z "$1" ]; then
  echo "Error: Missing image-name"
  echo "Usage: $0 <image-name> [sha-version]"
  echo "       If sha-version is not provided, 'latest' will be used"
  exit 1
fi
IMAGE_NAME="ghcr.io/aident-ai/$1"

# Set SHA_VERSION to "latest" if not provided
if [ -z "$2" ]; then
  SHA_VERSION="latest"
  echo "No sha-version provided, using 'latest' tag"
else
  SHA_VERSION="$2"
fi

IMAGE_WITH_TAG="$IMAGE_NAME:$SHA_VERSION"
echo "Processing multi-architecture image: $IMAGE_WITH_TAG"

# Inspect the multi-architecture image to verify it exists
echo "Inspecting image: $IMAGE_WITH_TAG"
docker buildx imagetools inspect "$IMAGE_WITH_TAG"

# Tag the multi-architecture image as stable using buildx imagetools
echo "Tagging $IMAGE_WITH_TAG as stable"
docker buildx imagetools create --tag "$IMAGE_NAME:stable" "$IMAGE_WITH_TAG"

# Verify the tagging was successful
echo "Verifying stable tag..."
docker buildx imagetools inspect "$IMAGE_NAME:stable"

echo "Successfully tagged multi-architecture image $IMAGE_WITH_TAG as $IMAGE_NAME:stable"
