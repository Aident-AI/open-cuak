#!/bin/bash
set -e # Exit on error

# run from repo root
source ./scripts/detect-quick-command-args.sh
eval "$(detect_command_args "$@")" || exit 1

echo "Stopping Supabase services..."
$DOCKER_COMPOSE_CMD -f installer/supabase-docker/docker-compose.yml down
