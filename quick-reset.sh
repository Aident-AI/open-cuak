#!/bin/bash
set -e # Exit on error
source ./scripts/detect_docker_compose.sh
DOCKER_COMPOSE_CMD=$(detect_docker_compose) || exit 1

echo "Resetting Supabase services..."
cd installer/supabase-docker && bash reset.sh
cd ../..

echo "Killing Open-Cuak containers..."
remove_container_if_exists() {
  local container_name="$1"

  if [ "$(docker ps -aq -f name=^${container_name}$)" ]; then
    echo "Removing container: $container_name"
    docker stop "$container_name" 2>/dev/null
    docker rm "$container_name"
  fi
}
remove_container_if_exists "open-cuak-web"
remove_container_if_exists "open-cuak-browserless"

echo "Open-Cuak containers are now removed"
