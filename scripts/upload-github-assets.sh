#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
REMOTE="${GITHUB_REMOTE:-github}"
REMOTE_URL="${GITHUB_REPO_URL:-}"
OWNER="${GITHUB_OWNER:-}"
REPO="${GITHUB_REPO:-}"
RELEASE_ID="${GITHUB_RELEASE_ID:-}"
TAG="${GITHUB_RELEASE_TAG:-}"
ASSET_DIR="${GITHUB_ASSET_DIR:-$ROOT_DIR/src-tauri/target/release/bundle}"
ASSET_VERSION="${GITHUB_ASSET_VERSION:-}"
DRY_RUN="${GITHUB_UPLOAD_DRY_RUN:-0}"

usage() {
  cat <<'USAGE'
Usage: GITHUB_TOKEN=... scripts/upload-github-assets.sh [tag] [release_id]

Uploads Tauri bundle artifacts to a GitHub Release.

Environment:
  GITHUB_TOKEN             Required unless GITHUB_UPLOAD_DRY_RUN=1.
  GITHUB_OWNER             Optional owner namespace. Inferred from GITHUB_REPO_URL.
  GITHUB_REPO              Optional repository name. Inferred from GITHUB_REPO_URL.
  GITHUB_RELEASE_ID        Optional release id. Preferred when already known.
  GITHUB_RELEASE_TAG       Optional release tag. Used to resolve release id.
  GITHUB_REPO_URL          Optional repository URL for owner/repo inference.
  GITHUB_ASSET_DIR         Optional asset directory. Defaults to Tauri bundle dir.
  GITHUB_ASSET_VERSION     Optional version filter, for example 0.1.4.
  GITHUB_UPLOAD_DRY_RUN    Set to 1 to print files without uploading.
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

if [ -z "$TAG" ] && [ -n "${GITHUB_REF:-}" ]; then
  TAG="${GITHUB_REF##*/}"
fi

if [ -z "$REMOTE_URL" ]; then
  REMOTE_URL="$(git -C "$REPO_DIR" remote get-url "$REMOTE" 2>/dev/null || true)"
fi

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  owner_repo="$(node -e '
const url = process.argv[1];
const patterns = [
  /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/,
  /github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/,
];
for (const pattern of patterns) {
  const match = url.match(pattern);
  if (match) {
    console.log(`${match[1]}/${match[2]}`);
    process.exit(0);
  }
}
process.exit(1);
' "$REMOTE_URL" 2>/dev/null || true)"
  if [ -n "$owner_repo" ]; then
    OWNER="${OWNER:-${owner_repo%%/*}}"
    REPO="${REPO:-${owner_repo#*/}}"
  fi
fi

if [ "$DRY_RUN" != "1" ] && [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Error: GITHUB_TOKEN is required to upload release assets." >&2
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

if [ -n "$ASSET_VERSION" ]; then
  filtered_assets=()
  for asset in "${assets[@]}"; do
    if [[ "$(basename "$asset")" == *"$ASSET_VERSION"* ]]; then
      filtered_assets+=("$asset")
    fi
  done
  assets=("${filtered_assets[@]}")
fi

if [ "${#assets[@]}" -eq 0 ]; then
  if [ -n "$ASSET_VERSION" ]; then
    echo "==> No releasable assets for version $ASSET_VERSION found under $ASSET_DIR"
  else
    echo "==> No releasable assets found under $ASSET_DIR"
  fi
  exit 0
fi

if [ -z "$RELEASE_ID" ]; then
  if [ -z "$TAG" ]; then
    echo "Error: release id or tag is required." >&2
    exit 1
  fi

  echo "==> Resolving GitHub release id for $TAG"
  release_json=""
  for attempt in $(seq 1 30); do
    if release_json="$(curl --fail --silent --show-error \
      --header "Accept: application/vnd.github+json" \
      --header "Authorization: Bearer $GITHUB_TOKEN" \
      --header "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/$OWNER/$REPO/releases/tags/$TAG" 2>/tmp/github-release-resolve.err)"; then
      break
    fi

    if [ "$attempt" -eq 30 ]; then
      cat /tmp/github-release-resolve.err >&2 || true
      echo "Error: could not resolve GitHub release id for $TAG." >&2
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

echo "==> Uploading ${#assets[@]} asset(s) to GitHub release $RELEASE_ID"
for asset in "${assets[@]}"; do
  asset_name="$(basename "$asset")"
  echo "    $asset_name"
  if [ "$DRY_RUN" = "1" ]; then
    continue
  fi

  curl --fail --silent --show-error \
    --request POST "https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=$asset_name" \
    --header "Authorization: Bearer $GITHUB_TOKEN" \
    --header "Content-Type: application/octet-stream" \
    --header "X-GitHub-Api-Version: 2022-11-28" \
    --data-binary @"$asset" >/dev/null
done

echo "==> GitHub release assets uploaded"
