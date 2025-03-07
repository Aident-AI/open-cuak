#!/bin/bash
set -e # Exit on error

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTARIZE_SCRIPT="${SCRIPT_DIR}/notarize-mac-artifact.sh"

# Make sure the notarize script is executable
chmod +x "$NOTARIZE_SCRIPT"

# Call the notarize script for the app
"$NOTARIZE_SCRIPT" "./OpenCuak.app" "app"
