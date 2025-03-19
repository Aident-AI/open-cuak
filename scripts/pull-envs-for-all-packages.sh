#!/bin/bash

if [ "$1" = "--reset" ]; then
  echo "Resetting environment files..."
  sh ./scripts/rm-envs-for-all-packages.sh
  echo "✅ Removed all the env files"
fi

if [ ! -f .env.local ]; then
  echo "No .env.local found at root..."
  cp .example.env .env.local
  echo "✅ Copied .env.local from .env.example"
else
  echo "✅ .env.local already exists"
fi
if [ ! -f .env.production ]; then
  echo "No .env.production found at root..."
  cp .example.env.production .env.production
  echo "✅ Copied .env.production from .env.example.production..."
else
  echo "✅ .env.production already exists"
fi

# Read all values in .env.override to override values in .env
if [ -f .env.override ]; then
  echo "Overriding values in .env with .env.override"
  while IFS='=' read -r key value; do
    # Skip empty lines or comments
    if [ -z "$key" ] || [ "$(echo "$key" | cut -c1)" = "#" ]; then
      continue
    fi

    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    escaped_value=$(printf "%s" "$value" | sed 's|/|\\/|g')

    echo ""
    echo "key=$key"
    echo "value=\"$escaped_value\""

    for file in .env.local .env.production; do
      if grep -q "^$key=" "$file"; then
        sed -i.bak "s|^$key=.*|$key=\"$escaped_value\"|" "$file" && rm "$file.bak"
      else
        echo "$key=\"$value\"" >>"$file"
      fi
    done
  done <.env.override
fi

echo "Copying env files to all packages..."

# Web
cp .env.local ./apps/web/.env
cp .env.production ./apps/web/.env.production
echo 'EXECUTION_ENVIRONMENT="web-client"' >>./apps/web/.env
echo 'EXECUTION_ENVIRONMENT="web-client"' >>./apps/web/.env.production
echo "✅ /apps/web"

# Extension
# TODO: clean up .env.local to be .env
cp .env.local ./apps/extension/.env.local
cp .env.production ./apps/extension/.env.production
echo 'EXECUTION_ENVIRONMENT="extension"' >>./apps/extension/.env.local
echo 'EXECUTION_ENVIRONMENT="extension"' >>./apps/extension/.env.production
echo "✅ /apps/extension"

# Browserless
cp .env.local ./apps/browserless/.env
cp .env.production ./apps/browserless/.env.production
echo 'EXECUTION_ENVIRONMENT="browserless"' >>./apps/browserless/.env
echo 'EXECUTION_ENVIRONMENT="browserless"' >>./apps/browserless/.env.production
echo "✅ /apps/browserless"

echo "Success! Done copying env files to all packages."
