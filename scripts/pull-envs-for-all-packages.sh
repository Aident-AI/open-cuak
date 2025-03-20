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

# Variable to store SERVER_HOSTNAME if it's set in .env.override
SERVER_HOSTNAME_VALUE=""

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

    # Store SERVER_HOSTNAME value if it's set
    if [ "$key" = "SERVER_HOSTNAME" ]; then
      SERVER_HOSTNAME_VALUE="$value"
    fi

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

  # Replace localhost with SERVER_HOSTNAME in all env variables if SERVER_HOSTNAME is set
  if [ -n "$SERVER_HOSTNAME_VALUE" ]; then
    echo ""
    echo "Replacing 'localhost' with '$SERVER_HOSTNAME_VALUE' in all environment variables..."

    # Check if SERVER_HOSTNAME includes a protocol
    PROTOCOL=""
    HOSTNAME_ONLY="$SERVER_HOSTNAME_VALUE"

    if echo "$SERVER_HOSTNAME_VALUE" | grep -q "^http://"; then
      PROTOCOL="http://"
      HOSTNAME_ONLY=$(echo "$SERVER_HOSTNAME_VALUE" | sed 's|^http://||')
      echo "Detected HTTP protocol in SERVER_HOSTNAME"
    elif echo "$SERVER_HOSTNAME_VALUE" | grep -q "^https://"; then
      PROTOCOL="https://"
      HOSTNAME_ONLY=$(echo "$SERVER_HOSTNAME_VALUE" | sed 's|^https://||')
      echo "Detected HTTPS protocol in SERVER_HOSTNAME"
    fi

    for file in .env.local .env.production; do
      # Create a temporary file
      temp_file="${file}.temp"

      # Process the file line by line
      while IFS= read -r line; do
        # Skip comments and empty lines
        if [ -z "$line" ] || [ "$(echo "$line" | cut -c1)" = "#" ]; then
          echo "$line" >>"$temp_file"
          continue
        fi

        modified_line="$line"

        # If protocol is specified in SERVER_HOSTNAME, handle protocol-specific replacements
        if [ -n "$PROTOCOL" ]; then
          # Replace http://localhost with the protocol + hostname
          modified_line=$(echo "$modified_line" | sed "s|http://localhost|${PROTOCOL}${HOSTNAME_ONLY}|g")
          # Replace https://localhost with the protocol + hostname
          modified_line=$(echo "$modified_line" | sed "s|https://localhost|${PROTOCOL}${HOSTNAME_ONLY}|g")
          # Replace ws://localhost with ws:// + hostname (for WebSockets)
          modified_line=$(echo "$modified_line" | sed "s|ws://localhost|ws://${HOSTNAME_ONLY}|g")
          # Replace wss://localhost with wss:// + hostname (for secure WebSockets)
          modified_line=$(echo "$modified_line" | sed "s|wss://localhost|wss://${HOSTNAME_ONLY}|g")
        fi

        # Replace remaining "localhost" with just the hostname
        modified_line=$(echo "$modified_line" | sed "s|localhost|$HOSTNAME_ONLY|g")

        echo "$modified_line" >>"$temp_file"
      done <"$file"

      # Replace the original file with the modified one
      mv "$temp_file" "$file"
    done

    echo "✅ Replaced 'localhost' with '$SERVER_HOSTNAME_VALUE' in environment files"
  fi
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
