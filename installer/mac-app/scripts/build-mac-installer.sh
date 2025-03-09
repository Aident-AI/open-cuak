#!/bin/bash
set -e # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTARIZE_SCRIPT="${SCRIPT_DIR}/notarize-mac-artifact.sh"

# Our unified notarize-mac-artifact.sh script automatically handles large files
# by using async mode for files >1GB, so no special flags are needed

chmod +x "$NOTARIZE_SCRIPT"

echo "Building standard installer package (app only)..."
packagesbuild ./OpenCuakInstaller.pkgproj
echo "Built OpenCuakInstaller.pkg"
"$NOTARIZE_SCRIPT" "./build/OpenCuakInstaller.pkg"
echo "================================================"
echo "✅ Installer package signed and notarized successfully!"
echo "================================================"

echo "Building full installer package (app + Docker images)..."
packagesbuild ./OpenCuakFullInstaller.pkgproj
echo "Built OpenCuakFullInstaller.pkg"
"$NOTARIZE_SCRIPT" "./build/OpenCuakFullInstaller.pkg"
echo "================================================"
echo "✅ Full Installer package signed and notarized successfully!"
echo "================================================"

echo "Both installer packages have been built, signed, and notarized."
echo "- Standard installer: ./build/OpenCuakInstaller.pkg"
echo "- Full installer (with Docker images): ./build/OpenCuakFullInstaller.pkg"
