#!/usr/bin/env bash
# Собирает полный ZIP для переноса на сервер (локально на Mac/Linux).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAMP="$(date +%Y%m%d)"
BUNDLE_NAME="Asset-Manager-server-${STAMP}"
OUT_DIR="/Users/asans/Desktop/4Project/${BUNDLE_NAME}"
ZIP_PATH="/Users/asans/Desktop/4Project/${BUNDLE_NAME}.zip"

echo "==> Каталог бандла: $OUT_DIR"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "==> Копирование проекта..."
rsync -a \
  --exclude '.git' \
  --exclude 'graphify-out' \
  --exclude '.cursor' \
  --exclude '**/.vercel' \
  --exclude '**/coverage' \
  --exclude '**/.env' \
  --exclude '**/.env.local' \
  --exclude '**/.env.production.local' \
  --exclude '**/playwright-report' \
  --exclude '**/test-results' \
  "$REPO_ROOT/" "$OUT_DIR/"

echo "==> API: npm ci + build..."
(cd "$OUT_DIR/artifacts/api-server" && npm ci && npm run build)

echo "==> Frontend: зависимости + build..."
cd "$OUT_DIR/artifacts/proptech"
if [[ -f package-lock.json ]]; then
  npm ci
else
  if [[ ! -d node_modules ]]; then
    npm install
  fi
fi
VITE_API_URL="http://localhost/api" npm run build

cat > "$OUT_DIR/START_HERE.txt" <<'EOF'
Asset-Manager — серверный перенос
=================================

1. Распакуйте архив на сервер (рекомендуется /opt/Asset-Manager)
2. cp deploy/server/env.template deploy/server/.env
3. Заполните DATABASE_URL (можно тот же Neon, что сейчас) и PUBLIC_URL
4. chmod +x deploy/server/*.sh && ./deploy/server/install.sh
5. ./deploy/server/start-api.sh
6. nginx — deploy/server/nginx.conf.example

Подробно: deploy/server/README-SERVER-RU.md
EOF

chmod +x "$OUT_DIR/deploy/server/"*.sh

echo "==> Создание ZIP (несколько минут)..."
rm -f "$ZIP_PATH"
(cd "/Users/asans/Desktop/4Project" && zip -r -q "$ZIP_PATH" "$BUNDLE_NAME")

echo ""
ls -lh "$ZIP_PATH"
du -sh "$OUT_DIR"
echo "Готово: $ZIP_PATH"
