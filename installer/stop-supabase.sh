#!/bin/bash
set -e # Exit on error
source ./scripts/detect_docker_compose.sh
DOCKER_COMPOSE_CMD=$(detect_docker_compose) || exit 1

echo "Stopping Supabase services..."
$DOCKER_COMPOSE_CMD -f installer/supabase-docker/docker-compose.yml down
