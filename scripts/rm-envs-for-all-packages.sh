#!/bin/bash

rm -rf ./.env.local
rm -rf ./.env.production

# /apps/web
rm -rf ./apps/web/.env
rm -rf ./apps/web/.env.production

# /apps/extension
rm -rf ./apps/extension/.env.local
rm -rf ./apps/extension/.env.production

# /apps/workers
rm -rf ./apps/workers/.env.local
rm -rf ./apps/workers/.env.production

# /apps/graph-rag
rm -rf ./apps/graph-rag/.env
rm -rf ./apps/graph-rag/.env.production
