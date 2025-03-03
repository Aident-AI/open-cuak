#!/bin/bash

# Check arguments
source ./scripts/detect-quick-command-args.sh
eval "$(detect_command_args "$@")" || exit 1

echo "========================================"
bash quick-stop.sh $DOCKER_CONTEXT

echo "========================================"
echo "Resetting Supabase services..."
cd installer/supabase-docker && bash reset.sh
cd ../..
echo "✅ Supabase services are all reset!"
