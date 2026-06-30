#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
REMOTE="${GIT_REMOTE:-origin}"
REMOTE_URL="${GITEE_REMOTE_URL:-}"
OWNER="${GITEE_OWNER:-}"
REPO="${GITEE_REPO:-}"
RELEASE_ID="${GITEE_RELEASE_ID:-}"
TAG="${GITEE_RELEASE_TAG:-}"
ASSET_DIR="${GITEE_ASSET_DIR:-$ROOT_DIR/src-tauri/target/release/bundle}"
DRY_RUN="${GITEE_UPLOAD_DRY_RUN:-0}"

usage() {
  cat <<'USAGE'
Usage: GITEE_TOKEN=... scripts/upload-gitee-assets.sh [tag] [release_id]

Uploads Tauri bundle artifacts to a Gitee Release.

Environment:
  GITEE_TOKEN             Required unless GITEE_UPLOAD_DRY_RUN=1.
  GITEE_OWNER             Optional owner namespace. Inferred from GIT_REMOTE.
  GITEE_REPO              Optional repository name. Inferred from GIT_REMOTE.
  GITEE_RELEASE_ID        Optional release id. Preferred when already known.
  GITEE_RELEASE_TAG       Optional release tag. Used to resolve release id.
  GITEE_ASSET_DIR         Optional asset directory. Defaults to Tauri bundle dir.
  GITEE_UPLOAD_DRY_RUN    Set to 1 to print files without uploading.
USAGE
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ -n "${1:-}" ]; then
  TAG="$1"
fi

if [ -n "${2:-}" ]; then
  RELEASE_ID="$2"
fi

if [ -z "$TAG" ]; then
  TAG="$(git -C "$REPO_DIR" describe --tags --exact-match 2>/dev/null || true)"
fi

if [ -z "$TAG" ] && [ -n "${GITHUB_REF_NAME:-}" ]; then
  TAG="$GITHUB_REF_NAME"
fi

if [ -z "$TAG" ] && [ -n "${GITEE_REF_NAME:-}" ]; then
  TAG="$GITEE_REF_NAME"
fi

if [ -z "$TAG" ] && [ -n "${CI_COMMIT_TAG:-}" ]; then
  TAG="$CI_COMMIT_TAG"
fi

if [ -z "$TAG" ] && [ -n "${GITHUB_REF:-}" ]; then
  TAG="${GITHUB_REF##*/}"
fi

if [ -z "$REMOTE_URL" ]; then
  REMOTE_URL="$(git -C "$REPO_DIR" remote get-url "$REMOTE")"
fi

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  owner_repo="$(node -e '
const url = process.argv[1];
const match = url.match(/gitee\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
if (!match) process.exit(1);
console.log(`${match[1]}/${match[2]}`);
' "$REMOTE_URL")"
  OWNER="${OWNER:-${owner_repo%%/*}}"
  REPO="${REPO:-${owner_repo#*/}}"
fi

if [ "$DRY_RUN" != "1" ] && [ -z "${GITEE_TOKEN:-}" ]; then
  echo "Error: GITEE_TOKEN is required to upload release assets." >&2
  exit 1
fi

if [ ! -d "$ASSET_DIR" ]; then
  echo "==> Asset directory does not exist; skipped upload: $ASSET_DIR"
  exit 0
fi

mapfile -d '' assets < <(find "$ASSET_DIR" -type f \( \
  -name '*.deb' -o \
  -name '*.rpm' -o \
  -name '*.AppImage' -o \
  -name '*.exe' -o \
  -name '*.msi' \
\) -print0 | sort -z)

if [ "${#assets[@]}" -eq 0 ]; then
  echo "==> No releasable assets found under $ASSET_DIR"
  exit 0
fi

if [ -z "$RELEASE_ID" ]; then
  if [ -z "$TAG" ]; then
    echo "Error: release id or tag is required." >&2
    exit 1
  fi

  echo "==> Resolving Gitee release id for $TAG"
  release_json=""
  for attempt in $(seq 1 30); do
    if release_json="$(curl --fail --silent --show-error \
      "https://gitee.com/api/v5/repos/$OWNER/$REPO/releases/tags/$TAG?access_token=$GITEE_TOKEN" 2>/tmp/gitee-release-resolve.err)"; then
      break
    fi

    if [ "$attempt" -eq 30 ]; then
      cat /tmp/gitee-release-resolve.err >&2 || true
      echo "Error: could not resolve Gitee release id for $TAG." >&2
      exit 1
    fi

    echo "    Release $TAG is not visible yet; retrying ($attempt/30)..."
    sleep 10
  done
  RELEASE_ID="$(node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
if (!data.id) process.exit(1);
console.log(data.id);
' <<<"$release_json")"
fi

echo "==> Uploading ${#assets[@]} asset(s) to Gitee release $RELEASE_ID"
for asset in "${assets[@]}"; do
  echo "    $(basename "$asset")"
  if [ "$DRY_RUN" = "1" ]; then
    continue
  fi

  curl --fail --silent --show-error \
    --request POST "https://gitee.com/api/v5/repos/$OWNER/$REPO/releases/$RELEASE_ID/attach_files" \
    --form "access_token=$GITEE_TOKEN" \
    --form "file=@$asset" >/dev/null
done

echo "==> Gitee release assets uploaded"
