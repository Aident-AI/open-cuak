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

mkdir -p .vercel
echo "{
  \"orgId\": \"$VERCEL_ORG_ID\",
  \"projectId\": \"$VERCEL_PROJECT_ID\"
}" >.vercel/project.json

# Fetch Vercel environment variables
vercel env pull --environment=production --token=$VERCEL_TOKEN .env.override
echo "Vercel environment variables fetched successfully"
