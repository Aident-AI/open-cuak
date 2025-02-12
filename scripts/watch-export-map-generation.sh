#!/bin/bash

npx nodemon --watch 'packages/**/*' --ext ts,tsx --ignore '**/export-map.generated.ts' --exec 'sh ./scripts/run-export-map-generation.sh'
