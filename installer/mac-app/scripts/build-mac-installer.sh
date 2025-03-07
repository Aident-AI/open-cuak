#!/bin/bash
set -e # Exit on error

packagesbuild ./OpenCuakInstaller.pkgproj
echo "Built OpenCuakInstaller.pkg"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  source .env
fi
codesign --deep --force --verbose --sign "$CODE_SIGN_CERTIFICATE" ./build/OpenCuakInstaller.pkg
echo "Signed OpenCuakInstaller.pkg"
