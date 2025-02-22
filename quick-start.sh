#!/bin/bash
set -e # Exit on error

source ./scripts/detect_docker_compose.sh
DOCKER_COMPOSE_CMD=$(detect_docker_compose) || exit 1
if [ "$1" == "--build" ]; then
  COMPOSE_FILE="docker/docker-compose.build.yaml"
else
  COMPOSE_FILE="docker/docker-compose.local-prod.yaml"
fi
echo "COMPOSE_FILE: $COMPOSE_FILE"

# Dependencies check
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $($1) is not installed."
    echo "Please install it first @ https://github.com/Aident-AI/open-cuak#%EF%B8%8F-environment-setup"
    exit 1
  fi
}
check_command docker

# Start the services
# bash installer/start-supabase.sh # TODO: put this back
bash scripts/pull-envs-for-all-packages.sh
if [ -f .env.production ]; then
  OPEN_CUAK_VERSION=$(grep -E "^OPEN_CUAK_VERSION=" .env.production | cut -d= -f2- | tr -d '"')
  echo "OPEN_CUAK_VERSION: $OPEN_CUAK_VERSION"
  export OPEN_CUAK_VERSION
fi

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

if [ "$1" != "--build" ]; then
  echo "Pulling images..."
  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE pull
fi

# run initialization scripts
SCRIPT_CONTAINER_NAME="open-cuak-script"
remove_container_if_exists "$SCRIPT_CONTAINER_NAME"
if [ "$1" == "--build" ]; then
  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE build open-cuak-web
  SCRIPT_IMAGE_NAME="open-cuak-web:latest"
else
  SCRIPT_IMAGE_NAME="ghcr.io/aident-ai/open-cuak-web:$OPEN_CUAK_VERSION"
fi
docker run -d --name $SCRIPT_CONTAINER_NAME \
  -v $(pwd)/.env.production:/app/apps/web/.env.production \
  -v $(pwd)/.env.local:/app/apps/web/.env \
  -v $(pwd)/package.json:/app/package.json \
  $SCRIPT_IMAGE_NAME
docker network connect supabase_supabase-network $SCRIPT_CONTAINER_NAME

# TODO: remove afterwards
docker exec -it $SCRIPT_CONTAINER_NAME sh -c "apk add --no-cache postgresql-client"
# TODO: change to run in docker
bash installer/run-supabase-migrations.sh

docker exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:mock-user:init --prod"
docker exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:storage:init --prod"
docker container rm -f $SCRIPT_CONTAINER_NAME

# Check if the first argument is --build
if [ "$1" == "--build" ]; then
  echo "Running build process..."
  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up
  rm -rf apps/browserless/out
else
  echo "Running local.production services..."
  $DOCKER_COMPOSE_CMD --env-file .env.production -f $COMPOSE_FILE up --force-recreate --pull always -d
  exit 0
fi

echo "Open-CUAK service is now running @ http://localhost:3000"
