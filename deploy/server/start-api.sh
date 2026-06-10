#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$(dirname "$0")/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет deploy/server/.env — скопируйте из env.template"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-production}"

cd "$ROOT/artifacts/api-server"
exec node --enable-source-maps ./dist/index.mjs
