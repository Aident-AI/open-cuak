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
# Variable to store SERVER_HOST_PORT if it's set in .env.override
SERVER_HOST_PORT_VALUE=""
# Variable to store SERVER_HOST_PROTOCOL if it's set in .env.override
SERVER_HOST_PROTOCOL_VALUE=""

# Variables for environment-specific server configurations
LOCAL_SERVER_HOSTNAME=""
LOCAL_SERVER_HOST_PORT=""
LOCAL_SERVER_HOST_PROTOCOL=""
PROD_SERVER_HOSTNAME=""
PROD_SERVER_HOST_PORT=""
PROD_SERVER_HOST_PROTOCOL=""

# First, extract default values from example env files
echo "Reading default server configuration from example files..."

# Extract from .example.env for local development
if [ -f .example.env ]; then
  DEFAULT_SERVER_HOSTNAME=$(grep "^SERVER_HOSTNAME=" .example.env | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  DEFAULT_SERVER_HOST_PORT=$(grep "^SERVER_HOST_PORT=" .example.env | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  DEFAULT_SERVER_HOST_PROTOCOL=$(grep "^SERVER_HOST_PROTOCOL=" .example.env | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)

  # Set local defaults
  LOCAL_SERVER_HOSTNAME="$DEFAULT_SERVER_HOSTNAME"
  LOCAL_SERVER_HOST_PORT="$DEFAULT_SERVER_HOST_PORT"
  LOCAL_SERVER_HOST_PROTOCOL="$DEFAULT_SERVER_HOST_PROTOCOL"

  echo "Found default local values:"
  echo "- SERVER_HOSTNAME='$DEFAULT_SERVER_HOSTNAME'"
  echo "- SERVER_HOST_PORT='$DEFAULT_SERVER_HOST_PORT'"
  echo "- SERVER_HOST_PROTOCOL='$DEFAULT_SERVER_HOST_PROTOCOL'"
else
  echo "⚠️ Warning: .example.env not found, cannot extract default local values"
fi

# Extract from .example.env.production for production
if [ -f .example.env.production ]; then
  DEFAULT_PROD_SERVER_HOSTNAME=$(grep "^SERVER_HOSTNAME=" .example.env.production | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  DEFAULT_PROD_SERVER_HOST_PORT=$(grep "^SERVER_HOST_PORT=" .example.env.production | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  DEFAULT_PROD_SERVER_HOST_PROTOCOL=$(grep "^SERVER_HOST_PROTOCOL=" .example.env.production | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)

  # Set production defaults
  PROD_SERVER_HOSTNAME="$DEFAULT_PROD_SERVER_HOSTNAME"
  PROD_SERVER_HOST_PORT="$DEFAULT_PROD_SERVER_HOST_PORT"
  PROD_SERVER_HOST_PROTOCOL="$DEFAULT_PROD_SERVER_HOST_PROTOCOL"

  echo "Found default production values:"
  echo "- SERVER_HOSTNAME='$DEFAULT_PROD_SERVER_HOSTNAME'"
  echo "- SERVER_HOST_PORT='$DEFAULT_PROD_SERVER_HOST_PORT'"
  echo "- SERVER_HOST_PROTOCOL='$DEFAULT_PROD_SERVER_HOST_PROTOCOL'"
else
  echo "⚠️ Warning: .example.env.production not found, cannot extract default production values"
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

    # Store SERVER_HOSTNAME value if it's set
    if [ "$key" = "SERVER_HOSTNAME" ]; then
      SERVER_HOSTNAME_VALUE="$value"
      # Override both local and production values
      LOCAL_SERVER_HOSTNAME="$value"
      PROD_SERVER_HOSTNAME="$value"
    fi

    # Store SERVER_HOST_PORT value if it's set
    if [ "$key" = "SERVER_HOST_PORT" ]; then
      SERVER_HOST_PORT_VALUE="$value"
      # Override both local and production values
      LOCAL_SERVER_HOST_PORT="$value"
      PROD_SERVER_HOST_PORT="$value"
    fi

    # Store SERVER_HOST_PROTOCOL value if it's set
    if [ "$key" = "SERVER_HOST_PROTOCOL" ]; then
      SERVER_HOST_PROTOCOL_VALUE="$value"
      # Override both local and production values
      LOCAL_SERVER_HOST_PROTOCOL="$value"
      PROD_SERVER_HOST_PROTOCOL="$value"
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
fi

# Update .env.local with local defaults if not overridden
if [ -n "$LOCAL_SERVER_HOSTNAME" ]; then
  if grep -q "^SERVER_HOSTNAME=" .env.local; then
    sed -i.bak "s|^SERVER_HOSTNAME=.*|SERVER_HOSTNAME=\"$LOCAL_SERVER_HOSTNAME\"|" .env.local && rm .env.local.bak
  else
    echo "SERVER_HOSTNAME=\"$LOCAL_SERVER_HOSTNAME\"" >>.env.local
  fi
  echo "Set SERVER_HOSTNAME='$LOCAL_SERVER_HOSTNAME' in .env.local"
fi

if [ -n "$LOCAL_SERVER_HOST_PORT" ]; then
  if grep -q "^SERVER_HOST_PORT=" .env.local; then
    sed -i.bak "s|^SERVER_HOST_PORT=.*|SERVER_HOST_PORT=\"$LOCAL_SERVER_HOST_PORT\"|" .env.local && rm .env.local.bak
  else
    echo "SERVER_HOST_PORT=\"$LOCAL_SERVER_HOST_PORT\"" >>.env.local
  fi
  echo "Set SERVER_HOST_PORT='$LOCAL_SERVER_HOST_PORT' in .env.local"
fi

if [ -n "$LOCAL_SERVER_HOST_PROTOCOL" ]; then
  if grep -q "^SERVER_HOST_PROTOCOL=" .env.local; then
    sed -i.bak "s|^SERVER_HOST_PROTOCOL=.*|SERVER_HOST_PROTOCOL=\"$LOCAL_SERVER_HOST_PROTOCOL\"|" .env.local && rm .env.local.bak
  else
    echo "SERVER_HOST_PROTOCOL=\"$LOCAL_SERVER_HOST_PROTOCOL\"" >>.env.local
  fi
  echo "Set SERVER_HOST_PROTOCOL='$LOCAL_SERVER_HOST_PROTOCOL' in .env.local"
fi

# Update .env.production with production defaults if not overridden
if [ -n "$PROD_SERVER_HOSTNAME" ]; then
  if grep -q "^SERVER_HOSTNAME=" .env.production; then
    sed -i.bak "s|^SERVER_HOSTNAME=.*|SERVER_HOSTNAME=\"$PROD_SERVER_HOSTNAME\"|" .env.production && rm .env.production.bak
  else
    echo "SERVER_HOSTNAME=\"$PROD_SERVER_HOSTNAME\"" >>.env.production
  fi
  echo "Set SERVER_HOSTNAME='$PROD_SERVER_HOSTNAME' in .env.production"
fi

if [ -n "$PROD_SERVER_HOST_PORT" ]; then
  if grep -q "^SERVER_HOST_PORT=" .env.production; then
    sed -i.bak "s|^SERVER_HOST_PORT=.*|SERVER_HOST_PORT=\"$PROD_SERVER_HOST_PORT\"|" .env.production && rm .env.production.bak
  else
    echo "SERVER_HOST_PORT=\"$PROD_SERVER_HOST_PORT\"" >>.env.production
  fi
  echo "Set SERVER_HOST_PORT='$PROD_SERVER_HOST_PORT' in .env.production"
fi

if [ -n "$PROD_SERVER_HOST_PROTOCOL" ]; then
  if grep -q "^SERVER_HOST_PROTOCOL=" .env.production; then
    sed -i.bak "s|^SERVER_HOST_PROTOCOL=.*|SERVER_HOST_PROTOCOL=\"$PROD_SERVER_HOST_PROTOCOL\"|" .env.production && rm .env.production.bak
  else
    echo "SERVER_HOST_PROTOCOL=\"$PROD_SERVER_HOST_PROTOCOL\"" >>.env.production
  fi
  echo "Set SERVER_HOST_PROTOCOL='$PROD_SERVER_HOST_PROTOCOL' in .env.production"
fi

# Process each environment file to construct NEXT_PUBLIC_ORIGIN and update localhost references
for env_file in .env.local .env.production; do
  echo ""
  echo "Processing $env_file..."

  # Extract the server configuration from the environment file
  FILE_SERVER_HOSTNAME=$(grep "^SERVER_HOSTNAME=" "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  FILE_SERVER_HOST_PORT=$(grep "^SERVER_HOST_PORT=" "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)
  FILE_SERVER_HOST_PROTOCOL=$(grep "^SERVER_HOST_PROTOCOL=" "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' | xargs)

  echo "Found server configuration in $env_file:"
  echo "- SERVER_HOSTNAME='$FILE_SERVER_HOSTNAME'"
  echo "- SERVER_HOST_PORT='$FILE_SERVER_HOST_PORT'"
  echo "- SERVER_HOST_PROTOCOL='$FILE_SERVER_HOST_PROTOCOL'"

  # Sanity checks
  # Check if SERVER_HOSTNAME is valid (not empty, doesn't already have protocol)
  HOSTNAME_ONLY="$FILE_SERVER_HOSTNAME"
  if [ -z "$HOSTNAME_ONLY" ]; then
    echo "❌ Error: SERVER_HOSTNAME cannot be empty in $env_file"
    exit 1
  fi

  # Remove protocol if it exists in the hostname (prefer using SERVER_HOST_PROTOCOL)
  if echo "$HOSTNAME_ONLY" | grep -q "^http://"; then
    echo "⚠️ Warning: SERVER_HOSTNAME should not include protocol. Removing 'http://' prefix."
    HOSTNAME_ONLY=$(echo "$HOSTNAME_ONLY" | sed 's|^http://||')
  elif echo "$HOSTNAME_ONLY" | grep -q "^https://"; then
    echo "⚠️ Warning: SERVER_HOSTNAME should not include protocol. Removing 'https://' prefix."
    HOSTNAME_ONLY=$(echo "$HOSTNAME_ONLY" | sed 's|^https://||')
  fi

  # Check for invalid characters in hostname
  if echo "$HOSTNAME_ONLY" | grep -q '[^a-zA-Z0-9.-]'; then
    echo "⚠️ Warning: SERVER_HOSTNAME contains potentially invalid characters"
  fi

  # Validate SERVER_HOST_PORT if it's set
  if [ -n "$FILE_SERVER_HOST_PORT" ]; then
    # Check if it's a number
    if ! [ "$FILE_SERVER_HOST_PORT" -eq "$FILE_SERVER_HOST_PORT" ] 2>/dev/null; then
      echo "❌ Error: SERVER_HOST_PORT must be a number in $env_file"
      exit 1
    fi

    # Check if it's in valid range (1-65535)
    if [ "$FILE_SERVER_HOST_PORT" -lt 1 ] || [ "$FILE_SERVER_HOST_PORT" -gt 65535 ]; then
      echo "❌ Error: SERVER_HOST_PORT must be between 1 and 65535 in $env_file"
      exit 1
    fi
  fi

  # Determine protocol to use
  PROTOCOL=""
  if [ -n "$FILE_SERVER_HOST_PROTOCOL" ]; then
    # Validate SERVER_HOST_PROTOCOL
    if [ "$FILE_SERVER_HOST_PROTOCOL" != "http" ] && [ "$FILE_SERVER_HOST_PROTOCOL" != "https" ]; then
      echo "❌ Error: SERVER_HOST_PROTOCOL must be either 'http' or 'https' in $env_file"
      exit 1
    fi

    PROTOCOL="${FILE_SERVER_HOST_PROTOCOL}://"
    echo "Using protocol from SERVER_HOST_PROTOCOL: $PROTOCOL"
  else
    # Default to https if not specified
    PROTOCOL="https://"
    echo "No SERVER_HOST_PROTOCOL specified, defaulting to: $PROTOCOL"
  fi

  # Construct host with port if SERVER_HOST_PORT is provided
  HOST_WITH_PORT="$HOSTNAME_ONLY"
  if [ -n "$FILE_SERVER_HOST_PORT" ]; then
    # Don't add standard ports if they match the protocol
    if [ "$FILE_SERVER_HOST_PORT" = "80" ] && [ "$PROTOCOL" = "http://" ]; then
      echo "Using standard HTTP port 80 (not adding to URL)"
    elif [ "$FILE_SERVER_HOST_PORT" = "443" ] && [ "$PROTOCOL" = "https://" ]; then
      echo "Using standard HTTPS port 443 (not adding to URL)"
    else
      HOST_WITH_PORT="${HOSTNAME_ONLY}:${FILE_SERVER_HOST_PORT}"
      echo "Adding port $FILE_SERVER_HOST_PORT to hostname"
    fi
  fi

  # Create NEXT_PUBLIC_ORIGIN value
  NEXT_PUBLIC_ORIGIN="${PROTOCOL}${HOST_WITH_PORT}"
  echo "Setting NEXT_PUBLIC_ORIGIN=$NEXT_PUBLIC_ORIGIN in $env_file"

  # Update or add NEXT_PUBLIC_ORIGIN to env file
  if grep -q "^NEXT_PUBLIC_ORIGIN=" "$env_file"; then
    sed -i.bak "s|^NEXT_PUBLIC_ORIGIN=.*|NEXT_PUBLIC_ORIGIN=\"$NEXT_PUBLIC_ORIGIN\"|" "$env_file" && rm "$env_file.bak"
  else
    echo "NEXT_PUBLIC_ORIGIN=\"$NEXT_PUBLIC_ORIGIN\"" >>"$env_file"
  fi

  # Determine websocket protocol based on http protocol
  WS_PROTOCOL="ws://"
  WSS_PROTOCOL="wss://"
  if [ "$PROTOCOL" = "https://" ]; then
    DEFAULT_WS_PROTOCOL="$WSS_PROTOCOL"
  else
    DEFAULT_WS_PROTOCOL="$WS_PROTOCOL"
  fi

  # Create temporary file to process localhost replacements
  temp_file="${env_file}.temp"

  # Process the file line by line
  while IFS= read -r line; do
    # Skip comments and empty lines
    if [ -z "$line" ] || [ "$(echo "$line" | cut -c1)" = "#" ]; then
      echo "$line" >>"$temp_file"
      continue
    fi

    modified_line="$line"

    # Handle localhost with specific ports first (don't add our own port to these)
    if echo "$modified_line" | grep -q "localhost:"; then
      # For URLs that already have a port, only replace the hostname part
      modified_line=$(echo "$modified_line" | sed "s|http://localhost:|${PROTOCOL}${HOSTNAME_ONLY}:|g")
      modified_line=$(echo "$modified_line" | sed "s|https://localhost:|${PROTOCOL}${HOSTNAME_ONLY}:|g")
      modified_line=$(echo "$modified_line" | sed "s|ws://localhost:|${WS_PROTOCOL}${HOSTNAME_ONLY}:|g")
      modified_line=$(echo "$modified_line" | sed "s|wss://localhost:|${WSS_PROTOCOL}${HOSTNAME_ONLY}:|g")
      # For pure hostnames with port but no protocol
      modified_line=$(echo "$modified_line" | sed "s|localhost:|${HOSTNAME_ONLY}:|g")
    else
      # Replace protocol-specific references with no explicit port
      # Replace http://localhost with the protocol + hostname + port
      modified_line=$(echo "$modified_line" | sed "s|http://localhost|${PROTOCOL}${HOST_WITH_PORT}|g")
      # Replace https://localhost with the protocol + hostname + port
      modified_line=$(echo "$modified_line" | sed "s|https://localhost|${PROTOCOL}${HOST_WITH_PORT}|g")
      # Replace ws://localhost with ws:// + hostname + port (for WebSockets)
      modified_line=$(echo "$modified_line" | sed "s|ws://localhost|${DEFAULT_WS_PROTOCOL}${HOST_WITH_PORT}|g")
      # Replace wss://localhost with wss:// + hostname + port (for secure WebSockets)
      modified_line=$(echo "$modified_line" | sed "s|wss://localhost|${DEFAULT_WS_PROTOCOL}${HOST_WITH_PORT}|g")

      # Handle standard ports separately
      modified_line=$(echo "$modified_line" | sed "s|http://localhost:80|${PROTOCOL}${HOSTNAME_ONLY}|g")
      modified_line=$(echo "$modified_line" | sed "s|https://localhost:443|${PROTOCOL}${HOSTNAME_ONLY}|g")

      # Replace remaining "localhost" with just the hostname + port (be careful with this)
      # Only replace localhost when it appears as a hostname, not as part of another word
      modified_line=$(echo "$modified_line" | sed "s|localhost\([:/ ]\)|${HOST_WITH_PORT}\1|g")
      # Handle localhost at the end of a line
      modified_line=$(echo "$modified_line" | sed "s|localhost$|${HOST_WITH_PORT}|g")
    fi

    echo "$modified_line" >>"$temp_file"
  done <"$env_file"

  # Replace the original file with the modified one
  mv "$temp_file" "$env_file"
  echo "✅ Updated $env_file with server configuration"
done

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
