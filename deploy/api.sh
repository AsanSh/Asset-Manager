#!/usr/bin/env bash
# Деплой proptech-api (Root Directory = artifacts/api-server — только из корня репо).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="${VERCEL_SCOPE:-asans-projects-88edff6a}"
cd "$ROOT"
npx vercel link --project proptech-api --yes --scope "$SCOPE"
npx vercel build --prod --yes --scope "$SCOPE"
npx vercel deploy --prebuilt --prod --yes --scope "$SCOPE"
echo "Smoke: curl -sS https://proptech-api.vercel.app/health"
