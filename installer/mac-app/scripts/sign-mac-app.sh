#!/bin/bash
set -e # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTARIZE_SCRIPT="${SCRIPT_DIR}/notarize-mac-artifact.sh"
WAIT_FOR_APP_SCRIPT="${SCRIPT_DIR}/wait-for-app.sh"

chmod +x "$NOTARIZE_SCRIPT"
chmod +x "$WAIT_FOR_APP_SCRIPT"

"$WAIT_FOR_APP_SCRIPT"
"$NOTARIZE_SCRIPT" "./OpenCuak.app" "app"
