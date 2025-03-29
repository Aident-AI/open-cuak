#!/bin/bash

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN is not set"
  exit 1
fi
if [ -z "$VERCEL_ORG_ID" ]; then
  echo "Error: VERCEL_ORG_ID is not set"
  exit 1
fi
if [ -z "$VERCEL_PROJECT_ID" ]; then
  echo "Error: VERCEL_PROJECT_ID is not set"
  exit 1
fi

# Create .vercel directory if it doesn't exist
cd /app
mkdir -p .vercel
echo "{
  \"orgId\": \"$VERCEL_ORG_ID\",
  \"projectId\": \"$VERCEL_PROJECT_ID\"
}" >.vercel/project.json

# Fetch Vercel environment variables
vercel env pull --environment=production --token=$VERCEL_TOKEN .env.cloud
echo "Vercel environment variables fetched successfully"

# Check if .env.production exists and is writable
if [ ! -w ".env.production" ]; then
  echo "Warning: .env.production is not writable, attempting to fix permissions"
  touch .env.production 2>/dev/null || echo "Error: Could not create .env.production file, continuing with .env.cloud only"
  chmod 666 .env.production 2>/dev/null
fi

# Only proceed with merging if .env.production is writable
if [ -w ".env.production" ]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ ! "$line" =~ ^# && -n "$line" ]]; then
      # Extract key (everything before the first =)
      key="${line%%=*}"
      if [ -n "$key" ]; then
        # Remove the key and its value from .env.production if it exists
        sed -i "/^$key=/d" .env.production
        # Append the line from .env.cloud to .env.production
        echo "$line" >>.env.production
      fi
    fi
  done <.env.cloud
  echo "Environment variables merged into .env.production successfully"
else
  echo "Using .env.cloud as the environment file"
  cp .env.cloud .env.production 2>/dev/null || echo "Could not copy .env.cloud to .env.production"
fi
