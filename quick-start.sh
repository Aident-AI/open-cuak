#!/bin/bash
set -e # Exit on error

# Check arguments
source ./scripts/detect-quick-command-args.sh
args="$(detect_command_args "$@")"
echo "Running quick-start.sh with args:"
echo "$args"
eval "$args" || exit 1

# Dependencies check
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $($1) is not installed."
    echo "Please install it first @ https://github.com/Aident-AI/open-cuak#%EF%B8%8F-environment-setup"
    exit 1
  fi
}
check_command docker
check_command uname

export TARGETARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
export DOCKER_BUILDKIT=1
export DOCKER_DEFAULT_PLATFORM=linux/${TARGETARCH}
echo "Detected platform: $DOCKER_DEFAULT_PLATFORM"

# Start the services
bash installer/start-supabase.sh $DOCKER_CONTEXT
bash scripts/pull-envs-for-all-packages.sh --reset
if [ -f .env.production ]; then
  OPEN_CUAK_VERSION=$(grep -E "^OPEN_CUAK_VERSION=" .env.production | cut -d= -f2- | tr -d '"')
  echo "OPEN_CUAK_VERSION: $OPEN_CUAK_VERSION"
  export OPEN_CUAK_VERSION
fi

# Function to check if a container exists and remove it if it does
remove_container_if_exists() {
  local container_name="$1"

  if [ "$(docker_cmd ps -aq -f name=^${container_name}$)" ]; then
    echo "Removing container: $container_name"
    docker_cmd stop "$container_name" 2>/dev/null
    docker_cmd rm "$container_name"
  fi
}

remove_container_if_exists "open-cuak-web"
remove_container_if_exists "open-cuak-browserless"

if [ $IS_BUILD != true ]; then
  echo "Pulling images..."
  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE pull
fi

# run initialization scripts
SCRIPT_CONTAINER_NAME="open-cuak-script"
remove_container_if_exists "$SCRIPT_CONTAINER_NAME"
if [ $IS_BUILD == true ]; then
  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE build
  SCRIPT_IMAGE_NAME="open-cuak-web:latest"
else
  SCRIPT_IMAGE_NAME="ghcr.io/aident-ai/open-cuak-web:$OPEN_CUAK_VERSION"
fi
docker_cmd run -d --name $SCRIPT_CONTAINER_NAME \
  -v $(pwd)/.env.production:/app/apps/web/.env.production \
  -v $(pwd)/.env.local:/app/apps/web/.env \
  -v $(pwd)/package.json:/app/package.json \
  $SCRIPT_IMAGE_NAME
docker_cmd network connect supabase_supabase-network $SCRIPT_CONTAINER_NAME

docker_cmd exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase -- db push --db-url \"postgresql://postgres:your-super-secret-and-long-postgres-password@db:5432/postgres\""
docker_cmd exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:mock-user:init -- --prod"
docker_cmd exec -it $SCRIPT_CONTAINER_NAME sh -c "cd /app && npm run supabase:storage:init -- --prod"
docker_cmd container rm -f $SCRIPT_CONTAINER_NAME

if [ $IS_BUILD == true ]; then
  echo "Running build process..."
  $DOCKER_COMPOSE_CMD --env-file .env.production -f $COMPOSE_FILE up -d
  rm -rf apps/browserless/out
else
  echo "Running local.production services..."
  $DOCKER_COMPOSE_CMD --env-file .env.production -f $COMPOSE_FILE up --force-recreate --pull always -d
fi

echo "Open-CUAK service is now running @ http://localhost:11970"
