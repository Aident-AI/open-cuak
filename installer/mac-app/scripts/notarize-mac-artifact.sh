#!/bin/bash
set -e # Exit on error

# Check if arguments are provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 [artifact_path] [--wait]"
  echo "  artifact_path: Path to the .pkg installer or .app bundle to notarize"
  echo "  --wait: Optional flag to wait for notarization to complete (default: async for large files)"
  exit 1
fi

ARTIFACT_PATH="$1"
ARTIFACT_NAME=$(basename "$ARTIFACT_PATH")
ZIP_NAME="${ARTIFACT_NAME}.zip"
FILE_EXT="${ARTIFACT_NAME##*.}"

# Check if we should wait for notarization to complete
WAIT_FOR_COMPLETION=false
if [ "$2" = "--wait" ]; then
  WAIT_FOR_COMPLETION=true
fi

# Get file size in MB to determine if we should use async by default
FILE_SIZE_MB=0
if [ -e "$ARTIFACT_PATH" ]; then
  FILE_SIZE_BYTES=$(stat -f %z "$ARTIFACT_PATH" 2>/dev/null || echo 0)
  FILE_SIZE_MB=$((FILE_SIZE_BYTES / 1048576))
fi

# For large files (>1GB), default to async unless --wait is specified
if [ $FILE_SIZE_MB -gt 1000 ] && [ "$WAIT_FOR_COMPLETION" = false ]; then
  echo "Large file detected ($FILE_SIZE_MB MB). Using asynchronous notarization."
  USE_ASYNC=true
else
  USE_ASYNC=false
  if [ "$WAIT_FOR_COMPLETION" = true ]; then
    echo "Using synchronous notarization (--wait specified)."
  elif [ $FILE_SIZE_MB -le 1000 ]; then
    echo "Small file detected ($FILE_SIZE_MB MB). Using synchronous notarization."
  fi
fi

# Load environment variables if .env file exists
if [ -f .env ]; then
  source .env
fi

# Check for required environment variables
if [ "$FILE_EXT" = "pkg" ]; then
  # For PKG files, we need the installer certificate
  if [ -n "$INSTALLER_SIGN_CERTIFICATE" ]; then
    SIGN_CERTIFICATE="$INSTALLER_SIGN_CERTIFICATE"
  elif [ -n "$CODE_SIGN_CERTIFICATE" ]; then
    SIGN_CERTIFICATE="$CODE_SIGN_CERTIFICATE"
    echo "Warning: INSTALLER_SIGN_CERTIFICATE not set, using CODE_SIGN_CERTIFICATE instead."
  else
    echo "Error: Neither INSTALLER_SIGN_CERTIFICATE nor CODE_SIGN_CERTIFICATE environment variable is set"
    exit 1
  fi
else
  # For app bundles and other artifacts, we need the code signing certificate
  if [ -n "$CODE_SIGN_CERTIFICATE" ]; then
    SIGN_CERTIFICATE="$CODE_SIGN_CERTIFICATE"
  else
    echo "Error: CODE_SIGN_CERTIFICATE environment variable is not set"
    exit 1
  fi
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

echo "Step 1: Signing the artifact..."
if [ "$FILE_EXT" = "pkg" ]; then
  # For pkg files, use productsign instead of codesign
  echo "Using productsign for .pkg file..."
  TEMP_PKG="${ARTIFACT_PATH%.pkg}-unsigned.pkg"
  mv "$ARTIFACT_PATH" "$TEMP_PKG"
  productsign --sign "$SIGN_CERTIFICATE" "$TEMP_PKG" "$ARTIFACT_PATH"
  rm "$TEMP_PKG"
else
  # For app bundles and other artifacts, use codesign with runtime option
  echo "Using codesign for .app bundle or other artifact..."
  codesign --deep --force --verbose --sign "$SIGN_CERTIFICATE" --options runtime "$ARTIFACT_PATH"
fi
echo "✅ Signed $ARTIFACT_NAME successfully"

echo "Step 2: Creating a ZIP archive for notarization..."
ditto -c -k --keepParent "$ARTIFACT_PATH" "$ZIP_NAME"
echo "✅ Created ZIP archive for notarization"

echo "Step 3: Submitting artifact for notarization..."
echo "Running notarytool submit with team ID: $TEAM_ID"

if [ "$USE_ASYNC" = true ]; then
  # Asynchronous approach for large files
  echo "This is a large file ($FILE_SIZE_MB MB), so submission may take some time..."

  # Submit for notarization without waiting
  SUBMISSION_OUTPUT=$(xcrun notarytool submit "$ZIP_NAME" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID")
  echo "$SUBMISSION_OUTPUT"

  # Extract submission ID
  SUBMISSION_ID=$(echo "$SUBMISSION_OUTPUT" | grep "id:" | head -1 | awk '{print $2}')
  if [ -z "$SUBMISSION_ID" ]; then
    echo "❌ Failed to extract submission ID. Notarization may have failed."
    exit 1
  fi

  echo "Submission ID: $SUBMISSION_ID"
  echo "✅ Notarization submitted successfully"

  echo "Step 4: Checking notarization status (this may take a while for large files)..."
  echo "You can press Ctrl+C to exit and check status later with:"
  echo "npm run mac:notarize:check $SUBMISSION_ID"

  # Check status in a loop with progress indicator
  status="in-progress"
  counter=0
  spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

  echo -n "Waiting for notarization to complete "
  while [ "$status" = "in-progress" ]; do
    # Show spinner
    echo -ne "\b${spinner[$counter]}"
    counter=$(((counter + 1) % 10))

    # Check status
    STATUS_OUTPUT=$(xcrun notarytool info "$SUBMISSION_ID" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID")
    status=$(echo "$STATUS_OUTPUT" | grep "status:" | awk '{print $2}')

    # Wait before checking again
    sleep 10
  done
  echo -e "\b✓"

  echo "Final status: $status"
else
  # Synchronous approach for smaller files or when --wait is specified
  NOTARIZATION_RESULT=$(xcrun notarytool submit "$ZIP_NAME" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait)
  echo "$NOTARIZATION_RESULT"

  # Extract submission ID for logging
  SUBMISSION_ID=$(echo "$NOTARIZATION_RESULT" | grep "id:" | head -1 | awk '{print $2}')
  echo "Submission ID: $SUBMISSION_ID"

  # Extract status
  status=$(echo "$NOTARIZATION_RESULT" | grep "status:" | awk '{print $2}')
fi

# Get the notarization log for reference
echo "Getting notarization log:"
LOG_OUTPUT=$(xcrun notarytool log "$SUBMISSION_ID" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID")
echo "$LOG_OUTPUT"

# Check if the log contains "Accepted" status
if echo "$LOG_OUTPUT" | grep -q '"status": "Accepted"'; then
  echo "✅ Notarization completed successfully (status: Accepted)"
  NOTARIZATION_SUCCESS=true
elif [[ "$status" == "Accepted" || "$status" == "accepted" ]]; then
  echo "✅ Notarization completed successfully (status from command: $status)"
  NOTARIZATION_SUCCESS=true
else
  echo "❌ Notarization failed. Please check the logs above for details."
  NOTARIZATION_SUCCESS=false
fi

if [ "$NOTARIZATION_SUCCESS" = false ]; then
  exit 1
fi

echo "Step 5: Stapling the notarization ticket to the artifact..."
xcrun stapler staple "$ARTIFACT_PATH"
echo "✅ Notarization ticket stapled to artifact"

echo "✅ Artifact signing and notarization process completed successfully!"
