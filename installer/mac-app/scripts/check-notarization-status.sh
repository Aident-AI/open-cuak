#!/bin/bash
set -e # Exit on error

# Check if arguments are provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 [submission_id]"
  exit 1
fi

SUBMISSION_ID="$1"

# Load environment variables if .env file exists
if [ -f .env ]; then
  source .env
fi

# Check for required environment variables
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

echo "Checking notarization status for submission ID: $SUBMISSION_ID"
STATUS_OUTPUT=$(xcrun notarytool info "$SUBMISSION_ID" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID")
echo "$STATUS_OUTPUT"

# Extract status
status=$(echo "$STATUS_OUTPUT" | grep "status:" | awk '{print $2}')
echo "Current status: $status"

# Check if notarization is complete
if [ "$status" = "Accepted" ] || [ "$status" = "accepted" ]; then
  echo "✅ Notarization completed successfully!"
  echo ""
  echo "You can now staple the notarization ticket to your PKG with:"
  echo "xcrun stapler staple [path_to_your_pkg]"
elif [ "$status" = "Invalid" ] || [ "$status" = "invalid" ]; then
  echo "❌ Notarization failed. Attempting to get detailed log..."
  xcrun notarytool log "$SUBMISSION_ID" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID"
  echo "❌ Notarization failed. Please check the logs above for details."
  exit 1
else
  echo "⏳ Notarization is still in progress. Check again later."
  echo ""
  echo "To check again, run:"
  echo "$0 $SUBMISSION_ID"
fi
