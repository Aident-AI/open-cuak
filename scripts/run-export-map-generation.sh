#!/bin/bash

TS_NODE_PROJECT=./tsconfig.json npx ts-node -r tsconfig-paths/register ./scripts/generate-export-map.ts
