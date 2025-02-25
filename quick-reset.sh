#!/bin/bash
set -e # Exit on error
source ./scripts/detect_docker_compose.sh
DOCKER_COMPOSE_CMD=$(detect_docker_compose) || exit 1

echo "========================================"
bash quick-stop.sh

echo "========================================"
echo "Resetting Supabase services..."
cd installer/supabase-docker && bash reset.sh
cd ../..
echo "✅ Supabase services are all reset!"
