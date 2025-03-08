#!/bin/bash
set -e # Exit on error

# Directory to check for
APP_DIR="OpenCuak.app"
echo "APP_DIR: $APP_DIR"
echo "Waiting for OpenCuak.app to be created..."

# Maximum wait time in seconds (5 minutes)
MAX_WAIT=300
WAIT_INTERVAL=1
ELAPSED=0

while [ ! -d "$APP_DIR" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
  echo "Waiting for OpenCuak.app to be created... ($ELAPSED seconds elapsed)"
  sleep $WAIT_INTERVAL
  ELAPSED=$((ELAPSED + WAIT_INTERVAL))
done

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Timed out waiting for OpenCuak.app to be created after $MAX_WAIT seconds"
  exit 1
fi

echo "OpenCuak.app has been created! Proceeding with the build process..."
