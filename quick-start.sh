#!/bin/bash
set -e # Exit on error

# Dependencies check
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $($1) is not installed."
    echo "Please install it first @ https://github.com/Aident-AI/open-cuak#%EF%B8%8F-environment-setup"
    exit 1
  fi
}
check_command supabase
check_command docker

# Check for either docker-compose or docker compose
if command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &>/dev/null; then
  DOCKER_COMPOSE_CMD="docker compose"
else
  echo "Error: Neither 'docker-compose' nor 'docker compose' is installed."
  echo "Please install one of them first @ https://github.com/Aident-AI/open-cuak#%EF%B8%8F-environment-setup"
  exit 1
fi

# Start the services
supabase start
bash scripts/pull-envs-for-all-packages.sh

# Function to check if a container exists and remove it if it does
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

$DOCKER_COMPOSE_CMD pull

# run initialization scripts
SCRIPT_CONTAINER_NAME="open-cuak-script"
remove_container_if_exists "$SCRIPT_CONTAINER_NAME"
docker run -d --name $SCRIPT_CONTAINER_NAME -v $(pwd)/.env.production:/app/apps/web/.env.production -v $(pwd)/.env.local:/app/apps/web/.env -v $(pwd)/package.json:/app/package.json ghcr.io/aident-ai/open-cuak-web
docker exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:mock-user:init"
docker exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:storage:init"
docker container rm -f $SCRIPT_CONTAINER_NAME

# Read OPEN_CUAK_VERSION value from .env.production file and export it
if [ -f .env.production ]; then
  OPEN_CUAK_VERSION=$(grep -E "^OPEN_CUAK_VERSION=" .env.production | cut -d= -f2- | tr -d '"')
  echo "OPEN_CUAK_VERSION: $OPEN_CUAK_VERSION"
  export OPEN_CUAK_VERSION
fi
$DOCKER_COMPOSE_CMD --env-file .env.production up --force-recreate --pull always -d

echo "Open-CUAK service is now running @ http://localhost:3000"
