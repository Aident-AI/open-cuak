#!/bin/bash
set -e # Exit on error

if [ -f .env ]; then
  source .env
fi
codesign --deep --force --verbose --sign "$CODE_SIGN_CERTIFICATE" ./OpenCuak.app
echo "Signed OpenCuak.app"
