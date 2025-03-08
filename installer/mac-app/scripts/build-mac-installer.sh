#!/bin/bash
set -e # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTARIZE_SCRIPT="${SCRIPT_DIR}/notarize-mac-artifact.sh"

# Make sure the notarize script is executable
chmod +x "$NOTARIZE_SCRIPT"

# Build the installer package
packagesbuild ./OpenCuakInstaller.pkgproj
echo "Built OpenCuakInstaller.pkg"

# Use the notarize-mac-artifact.sh script to sign and notarize the installer package
"$NOTARIZE_SCRIPT" "./build/OpenCuakInstaller.pkg" "pkg"
echo "Installer package signed and notarized successfully!"
