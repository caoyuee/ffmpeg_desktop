#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVM_DIR="${NVM_DIR:-$HOME/.config/nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

echo "==> Type checking"
pnpm typecheck

echo "==> Frontend unit tests"
pnpm test:run

if [ "${SKIP_E2E:-0}" != "1" ]; then
  echo "==> Playwright E2E tests"
  pnpm test:e2e
else
  echo "==> Skipping Playwright E2E tests (SKIP_E2E=1)"
fi

if [ "${SKIP_RUST_TESTS:-0}" != "1" ]; then
  echo "==> Rust tests"
  (cd src-tauri && cargo test)
else
  echo "==> Skipping Rust tests (SKIP_RUST_TESTS=1)"
fi

echo "==> Preflight checks passed"
