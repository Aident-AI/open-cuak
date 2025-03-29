#! /bin/bash

if [[ "$@" == *--cloud* ]]; then
  echo "Starting in cloud environment"
  bash /app/server/scripts/fetch-vercel-envs.sh
fi

dumb-init -- node /app/server/kill-server.js $@ &

cd /usr/src/app && /usr/src/app/scripts/start.sh &

if [[ "$@" == *--prod* ]]; then
  echo "Starting in production mode"
  exec dumb-init -- node /app/dist/websocket-server.js $@
else
  echo "Starting in development mode"
  exec dumb-init -- nodemon --watch /app/dist --exec "node /app/dist/websocket-server.js"
fi
