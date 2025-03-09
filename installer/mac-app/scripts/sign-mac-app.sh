#!/bin/bash
set -e # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTARIZE_SCRIPT="${SCRIPT_DIR}/notarize-mac-artifact.sh"
WAIT_FOR_APP_SCRIPT="${SCRIPT_DIR}/wait-for-app.sh"

# Our unified notarize-mac-artifact.sh script automatically handles large files
# by using async mode for files >1GB, so no special flags are needed

chmod +x "$NOTARIZE_SCRIPT"
chmod +x "$WAIT_FOR_APP_SCRIPT"

"$WAIT_FOR_APP_SCRIPT"
echo "Signing and notarizing OpenCuak.app..."
"$NOTARIZE_SCRIPT" "./OpenCuak.app"
echo "================================================"
echo "✅ OpenCuak.app signed and notarized successfully"
echo "================================================"
