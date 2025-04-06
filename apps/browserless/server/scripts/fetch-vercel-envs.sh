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

# Update environment variables in index.js files
echo "Updating environment variables in index.js files..."

# Extract environment variables from .env.cloud
CLOUD_SUPABASE_ANON_KEY=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.cloud | cut -d '=' -f2-)
CLOUD_SUPABASE_URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" .env.cloud | cut -d '=' -f2-)
CLOUD_PG_CONNECTION=$(grep -E "^PG_CONNECTION=" .env.cloud | cut -d '=' -f2-)
CLOUD_SUPABASE_SERVICE_ROLE_KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env.cloud | cut -d '=' -f2-)

# Extract environment variables from .env.production if it exists
if [ -f ".env.production" ]; then
  PROD_SUPABASE_ANON_KEY=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.production | cut -d '=' -f2-)
  PROD_SUPABASE_URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" .env.production | cut -d '=' -f2-)
  PROD_PG_CONNECTION=$(grep -E "^PG_CONNECTION=" .env.production | cut -d '=' -f2-)
  PROD_SUPABASE_SERVICE_ROLE_KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env.production | cut -d '=' -f2-)
fi

# Find all index.js files in /app/extension/scripts
find /app/extension/scripts -name "index.js" | while read -r file; do
  echo "Processing $file..."

  # Replace environment variables if they exist in production
  if [ -n "$PROD_SUPABASE_ANON_KEY" ]; then
    sed -i "s|$PROD_SUPABASE_ANON_KEY|$CLOUD_SUPABASE_ANON_KEY|g" "$file"
  fi

  if [ -n "$PROD_SUPABASE_URL" ]; then
    sed -i "s|$PROD_SUPABASE_URL|$CLOUD_SUPABASE_URL|g" "$file"
  fi

  if [ -n "$PROD_PG_CONNECTION" ]; then
    sed -i "s|$PROD_PG_CONNECTION|$CLOUD_PG_CONNECTION|g" "$file"
  fi

  if [ -n "$PROD_SUPABASE_SERVICE_ROLE_KEY" ]; then
    sed -i "s|$PROD_SUPABASE_SERVICE_ROLE_KEY|$CLOUD_SUPABASE_SERVICE_ROLE_KEY|g" "$file"
  fi
done

echo "Environment variables updated in index.js files"

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
