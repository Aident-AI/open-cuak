# !#!/bin/bash

# Check if the migration name as a parameter is passed
if [ -z "$1" ]; then
    echo "No migration name parameter is provided. Append a short description of the migration as the name."
    exit 1
fi
MIGRATION_NAME=$1
if [ ! -z "$2" ]; then
    echo "Only one param is supported. If you are passing a description with spaces, replace it with underscore."
    exit 1
fi

cd ./apps/web
npx supabase db diff --file "$MIGRATION_NAME"
npm run gen-types
