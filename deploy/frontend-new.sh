#!/usr/bin/env bash
# Деплой нового UI на planalityc.ai (ветка main).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT/artifacts/proptech"
npm ci
npm run build

# planalityc.ai: Root Directory = artifacts/proptech → деплой из корня репо.
cd "$REPO_ROOT"
npx vercel link --project planalityc.ai --yes
npx vercel deploy --prod --yes

echo "OK: planalityc.ai / planalitycai.vercel.app (ветка main)"
