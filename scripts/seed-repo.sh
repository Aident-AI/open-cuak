#!/bin/bash

# Load environment variables from .env file
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo ".env file not found"
    exit 1
fi

# Create the bucket
response=$(curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$SUPABASE_STORAGE_BUCKET_NAME_SAVE_TO_NEO4J\",\"public\":false}" \
    -s -w "\n%{http_code}")
body=$(echo "$response" | sed -e '$d')
status=$(echo "$response" | tail -n1)
if [ "$status" -eq 201 ]; then
    echo "Bucket '$SUPABASE_STORAGE_BUCKET_NAME_SAVE_TO_NEO4J' created successfully"
elif [ "$status" -eq 400 ]; then
    echo "Bucket '$SUPABASE_STORAGE_BUCKET_NAME_SAVE_TO_NEO4J' alreay exists"
else
    echo "Failed to create bucket. Status code: $status"
    echo "Response: $body"
    exit 1
fi

# Seed GraphRAG service
cd apps/graph-rag && npm run seed
