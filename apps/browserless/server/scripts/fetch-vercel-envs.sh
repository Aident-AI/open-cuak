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

# Merge .env.cloud into .env.production
touch .env.production # Create if it doesn't exist
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
