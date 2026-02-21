#!/bin/bash

set -e

# Check for .env file before sourcing
if [ ! -f ".env" ]; then
  echo "Error: .env file not found in $(pwd)"
  exit 1
fi

set -a
source ".env"
set +a

# Verify that essential variables are set
if [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_PATH" ]; then
  echo "Error: DEPLOY_USER, DEPLOY_HOST, or DEPLOY_PATH is not set in .env"
  exit 1
fi

echo "Building the React app (npm run build)..."
npm run build

echo "Deploying to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH..."
# Use rsync for more efficient and robust deployment
# -a: archive mode (recursive, preserves permissions, etc.)
# -v: verbose
# -z: compress data during transfer
# --delete: delete extraneous files from destination dirs
rsync -avz --delete build/ "$DEPLOY_USER@$DEPLOY_HOST:${DEPLOY_PATH}/" --exclude /images

echo "Deployment successful!"

rm -r build

echo "Cleared build directory"