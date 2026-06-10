#!/usr/bin/env bash
# Деплой старого UI на proptech-sigma-eight.vercel.app (ветка legacy/proptech).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT="${REPO_ROOT}/.deploy-worktrees/legacy-proptech"

cleanup() {
  if [[ -d "$WT" ]]; then
    git -C "$REPO_ROOT" worktree remove "$WT" --force 2>/dev/null || rm -rf "$WT"
  fi
}
trap cleanup EXIT

git -C "$REPO_ROOT" fetch origin legacy/proptech
rm -rf "$WT"
git -C "$REPO_ROOT" worktree add "$WT" legacy/proptech

cd "$WT/artifacts/proptech"
npm ci
npm run build
npx vercel link --project proptech --yes
npx vercel deploy --prod --yes

echo "OK: https://proptech-sigma-eight.vercel.app (ветка legacy/proptech)"
