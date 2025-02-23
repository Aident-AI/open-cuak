#!/bin/bash

# TODO: change to be docker-friendly url
PG_URL="postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54320/postgres"

# Ensure migrations directory exists
MIGRATIONS_DIR="./apps/web/supabase/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory does not exist: $MIGRATIONS_DIR"
  exit 1
fi

# Run each SQL file in sorted order
for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "Applying migration: $file"
  psql $PG_URL -f "$file" || {
    echo "Migration failed: $file"
    exit 1
  }
done

echo "All migrations applied successfully!"
