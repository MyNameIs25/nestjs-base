#!/bin/sh
set -e

CONFIG="apps/${APP_NAME}/drizzle.config.ts"
if [ -f "$CONFIG" ]; then
  echo "Running database migrations for ${APP_NAME}..."
  node docker/migrate-with-lock.mjs "$CONFIG"
fi

exec "$@"
