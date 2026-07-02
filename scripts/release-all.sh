#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
BUMP="${1:-patch}"

cd "$ROOT_DIR"

NVM_DIR="${NVM_DIR:-$HOME/.config/nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

branch="$(git -C "$REPO_DIR" branch --show-current)"
if [ -z "$branch" ]; then
  echo "Error: detached HEAD is not supported for release automation." >&2
  exit 1
fi

remote_url_or_env() {
  local remote_name="$1"
  local override_url="$2"
  if [ -n "$override_url" ]; then
    printf '%s\n' "$override_url"
    return 0
  fi
  git -C "$REPO_DIR" remote get-url "$remote_name"
}

owner_repo_from_url() {
  node -e '
const url = process.argv[1];
const patterns = [
  /(?:gitee|github)\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/,
  /(?:gitee|github)\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/,
];
for (const pattern of patterns) {
  const match = url.match(pattern);
  if (match) {
    console.log(`${match[1]}/${match[2]}`);
    process.exit(0);
  }
}
process.exit(1);
' "$1"
}

create_release() {
  local api_base="$1"
  local token="$2"
  local owner="$3"
  local repo="$4"
  local tag="$5"
  local branch="$6"
  local body="$7"
  local headers=()

  case "$api_base" in
    *"gitee.com"*)
      release_json="$(curl --fail --silent --show-error \
        "$api_base/repos/$owner/$repo/releases/tags/$tag?access_token=$token" 2>/tmp/release-resolve.err || true)"
      if [ -z "$release_json" ] || [ "$release_json" = "null" ]; then
        release_json="$(curl --fail --silent --show-error \
          --request POST "$api_base/repos/$owner/$repo/releases" \
          --data-urlencode "access_token=$token" \
          --data-urlencode "tag_name=$tag" \
          --data-urlencode "name=$tag" \
          --data-urlencode "body=$body" \
          --data-urlencode "target_commitish=$branch")"
      fi
      ;;
    *"api.github.com"*)
      headers=(
        --header "Accept: application/vnd.github+json"
        --header "Authorization: Bearer $token"
        --header "X-GitHub-Api-Version: 2022-11-28"
      )
      release_json="$(curl --fail --silent --show-error \
        "${headers[@]}" \
        "$api_base/repos/$owner/$repo/releases/tags/$tag" 2>/tmp/release-resolve.err || true)"
      if [ -z "$release_json" ] || [ "$release_json" = "null" ]; then
        payload="$(node -e '
const [tag, body, branch] = process.argv.slice(1);
process.stdout.write(JSON.stringify({
  tag_name: tag,
  name: tag,
  body,
  target_commitish: branch,
  draft: false,
  prerelease: false,
}));
' "$tag" "$body" "$branch")"
        release_json="$(curl --fail --silent --show-error \
          --request POST "$api_base/repos/$owner/$repo/releases" \
          "${headers[@]}" \
          --data "$payload")"
      fi
      ;;
    *)
      echo "Error: unsupported API base '$api_base'" >&2
      exit 1
      ;;
  esac

  node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
if (!data.id) process.exit(1);
console.log(data.id);
' <<<"$release_json"
}

push_target() {
  local target="$1"
  local branch="$2"
  local tag="$3"
  git -C "$REPO_DIR" push "$target" "$branch"
  git -C "$REPO_DIR" push "$target" "$tag"
}

if [ "${SKIP_PREFLIGHT:-0}" != "1" ]; then
  bash scripts/preflight.sh
else
  echo "==> Skipping preflight checks (SKIP_PREFLIGHT=1)"
fi

version="$(node scripts/bump-version.mjs "$BUMP")"
tag="v$version"

if git -C "$REPO_DIR" rev-parse "$tag" >/dev/null 2>&1; then
  echo "Error: tag '$tag' already exists." >&2
  exit 1
fi

if [ "${SKIP_BUNDLE:-0}" != "1" ]; then
  case "$(uname -s)" in
    Linux)
      echo "==> Building Linux deb bundle"
      pnpm tauri build --bundles deb
      ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
      echo "==> Building Windows nsis bundle"
      pnpm tauri build --bundles nsis
      ;;
    *)
      echo "==> Skipping local bundle build on unsupported platform: $(uname -s)"
      ;;
  esac
else
  echo "==> Skipping local bundle build (SKIP_BUNDLE=1)"
fi

git -C "$REPO_DIR" add -A

if git -C "$REPO_DIR" diff --cached --quiet; then
  echo "Error: no staged changes found after version bump." >&2
  exit 1
fi

commit_message="${RELEASE_COMMIT_MESSAGE:-chore: release $tag}"
git -C "$REPO_DIR" commit -m "$commit_message"
git -C "$REPO_DIR" tag -a "$tag" -m "Release $tag"

if [ "${RELEASE_DRY_RUN:-0}" = "1" ]; then
  echo "==> Dry run complete. Created local commit and tag '$tag'; not pushing."
  echo "==> Rolling back dry-run commit and tag."
  git -C "$REPO_DIR" tag -d "$tag" >/dev/null
  git -C "$REPO_DIR" reset --soft HEAD~1 >/dev/null
  git -C "$REPO_DIR" reset >/dev/null
  exit 0
fi

gitee_remote_name="${GITEE_REMOTE:-origin}"
gitee_remote_url="$(remote_url_or_env "$gitee_remote_name" "${GITEE_PUSH_URL:-}")"
github_remote_name="${GITHUB_REMOTE:-github}"
github_remote_url="$(remote_url_or_env "$github_remote_name" "${GITHUB_PUSH_URL:-}")"

push_target "$gitee_remote_url" "$branch" "$tag"
push_target "$github_remote_url" "$branch" "$tag"

if [ -n "${GITEE_TOKEN:-}" ]; then
  gitee_repo_url="${GITEE_REPO_URL:-$gitee_remote_url}"
  owner_repo="$(owner_repo_from_url "$gitee_repo_url")"
  gitee_owner="${GITEE_OWNER:-${owner_repo%%/*}}"
  gitee_repo="${GITEE_REPO:-${owner_repo#*/}}"
  echo "==> Creating Gitee release $tag"
  gitee_release_id="$(create_release \
    "https://gitee.com/api/v5" \
    "$GITEE_TOKEN" \
    "$gitee_owner" \
    "$gitee_repo" \
    "$tag" \
    "$branch" \
    "${RELEASE_BODY:-Automated release $tag}")"
  GITEE_OWNER="$gitee_owner" \
  GITEE_REPO="$gitee_repo" \
  GITEE_RELEASE_ID="$gitee_release_id" \
  GITEE_RELEASE_TAG="$tag" \
  GITEE_ASSET_VERSION="$version" \
  bash scripts/upload-gitee-assets.sh
else
  echo "==> GITEE_TOKEN is not set; skipped Gitee Release API."
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  github_repo_url="${GITHUB_REPO_URL:-$github_remote_url}"
  owner_repo="$(owner_repo_from_url "$github_repo_url")"
  github_owner="${GITHUB_OWNER:-${owner_repo%%/*}}"
  github_repo="${GITHUB_REPO:-${owner_repo#*/}}"
  echo "==> Creating GitHub release $tag"
  github_release_id="$(create_release \
    "https://api.github.com" \
    "$GITHUB_TOKEN" \
    "$github_owner" \
    "$github_repo" \
    "$tag" \
    "$branch" \
    "${RELEASE_BODY:-Automated release $tag}")"
  GITHUB_OWNER="$github_owner" \
  GITHUB_REPO="$github_repo" \
  GITHUB_RELEASE_ID="$github_release_id" \
  GITHUB_RELEASE_TAG="$tag" \
  GITHUB_ASSET_VERSION="$version" \
  bash scripts/upload-github-assets.sh
else
  echo "==> GITHUB_TOKEN is not set; skipped GitHub Release API."
fi

echo "==> Released $tag to both remotes"
