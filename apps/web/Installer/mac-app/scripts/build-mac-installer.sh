#!/bin/bash
set -e # Exit on error

packagesbuild ./OpenCuakInstaller.pkgproj
echo "Built OpenCuakInstaller.pkg"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  source .env
fi

# Use the notarize-mac-artifact.sh script to sign and notarize the installer package
SCRIPT_DIR="$(dirname "$0")"
"$SCRIPT_DIR/notarize-mac-artifact.sh" ./build/OpenCuakInstaller.pkg pkg
