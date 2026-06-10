#!/usr/bin/env bash
# Первичная настройка на сервере (нужны Node.js 20+ и npm)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$(dirname "$0")/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Создайте $ENV_FILE из env.template и заполните DATABASE_URL, PUBLIC_URL."
  echo "  cp deploy/server/env.template deploy/server/.env"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${DATABASE_URL:-}" ]] || [[ "$DATABASE_URL" == *"USER:PASSWORD"* ]]; then
  echo "Укажите реальный DATABASE_URL в deploy/server/.env"
  exit 1
fi

PUBLIC_URL="${PUBLIC_URL:-http://localhost}"
PUBLIC_URL="${PUBLIC_URL%/}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-$PUBLIC_URL}"
VITE_API_URL="${PUBLIC_URL}/api"

echo "==> API: зависимости и сборка"
cd "$ROOT/artifacts/api-server"
npm ci
npm run build

echo "==> Frontend: зависимости + build..."
cd "$ROOT/artifacts/proptech"
if [[ -f package-lock.json ]]; then
  npm ci
else
  if [[ ! -d node_modules ]]; then
    npm install
  fi
fi
VITE_API_URL="${VITE_API_URL}" npm run build

echo ""
echo "Готово. Запуск API:"
echo "  export \$(grep -v '^#' deploy/server/.env | xargs) && cd artifacts/api-server && npm start"
echo ""
echo "Статика фронта: artifacts/proptech/dist"
echo "Пример nginx: deploy/server/nginx.conf.example"
