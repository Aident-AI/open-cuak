#!/bin/bash

sed -i "s|\[BROWSERLESS_AUTH_TOKEN\]|$BROWSERLESS_AUTH_TOKEN|g" task-definition.json
sed -i "s|\[NEXT_PUBLIC_SUPABASE_URL\]|$NEXT_PUBLIC_SUPABASE_URL|g" task-definition.json
sed -i "s|\[NEXT_PUBLIC_SUPABASE_ANON_KEY\]|$NEXT_PUBLIC_SUPABASE_ANON_KEY|g" task-definition.json
