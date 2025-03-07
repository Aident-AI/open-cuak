#!/bin/bash
set -e # Exit on error

# This script handles signing and notarization of macOS artifacts
# Usage: ./notarize-mac-artifact.sh [artifact_path] [artifact_type]
# Example: ./notarize-mac-artifact.sh ./OpenCuak.app app
# Example: ./notarize-mac-artifact.sh ./build/OpenCuakInstaller.pkg pkg

# Check if arguments are provided
if [ $# -lt 2 ]; then
  echo "Usage: $0 [artifact_path] [artifact_type]"
  echo "artifact_type can be 'app' or 'pkg'"
  exit 1
fi

ARTIFACT_PATH="$1"
ARTIFACT_TYPE="$2"
ARTIFACT_NAME=$(basename "$ARTIFACT_PATH")
ZIP_NAME="${ARTIFACT_NAME}.zip"

# Load environment variables if .env file exists
if [ -f .env ]; then
  source .env
fi

# Check for required environment variables
if [ -z "$CODE_SIGN_CERTIFICATE" ]; then
  echo "Error: CODE_SIGN_CERTIFICATE environment variable is not set"
  exit 1
fi

if [ -z "$APPLE_ID" ]; then
  echo "Error: APPLE_ID environment variable is not set"
  exit 1
fi

if [ -z "$APPLE_PASSWORD" ]; then
  echo "Error: APPLE_PASSWORD environment variable is not set"
  exit 1
fi

if [ -z "$TEAM_ID" ]; then
  echo "Error: TEAM_ID environment variable is not set"
  exit 1
fi

# Check if there are any pending agreements
echo "Checking for pending Apple Developer agreements..."
if xcrun notarytool info --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" 2>&1 | grep -q "agreement"; then
  echo "⚠️ ERROR: You have pending Apple Developer agreements that need to be accepted."
  echo "Please log in to https://developer.apple.com/account/ and accept all pending agreements."
  echo "After accepting the agreements, try running this script again."
  exit 1
fi

echo "Step 1: Signing the $ARTIFACT_TYPE..."
codesign --deep --force --verbose --sign "$CODE_SIGN_CERTIFICATE" --options runtime "$ARTIFACT_PATH"
echo "✅ Signed $ARTIFACT_NAME successfully"

echo "Step 2: Creating a ZIP archive for notarization..."
ditto -c -k --keepParent "$ARTIFACT_PATH" "$ZIP_NAME"
echo "✅ Created ZIP archive for notarization"

echo "Step 3: Submitting $ARTIFACT_TYPE for notarization..."
xcrun notarytool submit "$ZIP_NAME" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait
echo "✅ Notarization submitted and completed"

echo "Step 4: Stapling the notarization ticket to the $ARTIFACT_TYPE..."
xcrun stapler staple "$ARTIFACT_PATH"
echo "✅ Notarization ticket stapled to $ARTIFACT_TYPE"

echo "✅ $ARTIFACT_TYPE signing and notarization process completed successfully!"
