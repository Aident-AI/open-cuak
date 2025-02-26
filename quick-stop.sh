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
check_command uname

export TARGETARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
export DOCKER_BUILDKIT=1
export DOCKER_DEFAULT_PLATFORM=linux/${TARGETARCH}
echo "Detected platform: $DOCKER_DEFAULT_PLATFORM)"

echo "Stopping Open-Cuak services..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down
echo "✅ Open-CUAK services are all stopped!"

echo "========================================"
bash installer/stop-supabase.sh
echo "✅ Supabase services are all stopped!"
