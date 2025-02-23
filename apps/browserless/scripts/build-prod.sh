#!/bin/bash

IMAGE_NAME="open-cuak-browserless"

npm run stop

cd ../extension
npm run package
cd ../browserless
echo "===================="
echo "Extension built..."
echo "===================="

# Docker cannot follow symlinks, so copy the built extension to a directory that's not a symlink
rm -rf ./out
cp -r ../extension/out ./out
cp -f ./extension-override.config.json ./out/config.json
echo "===================="
echo "Extension copied to ./out..."
echo "===================="
