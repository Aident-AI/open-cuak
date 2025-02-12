#!/bin/bash

CONTAINER_NAME="open-cuak-browserless"

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Container with the name $CONTAINER_NAME already exists. Removing it..."
    # Stop the container if it's running
    docker stop "$CONTAINER_NAME"
    # Remove the container
    docker rm "$CONTAINER_NAME"
fi
echo "Browserless container stopped and removed."
