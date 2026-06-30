#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
REMOTE="${GIT_REMOTE:-origin}"
BUMP="${1:-patch}"

cd "$ROOT_DIR"

NVM_DIR="${NVM_DIR:-$HOME/.config/nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

remote_url="$(git -C "$REPO_DIR" remote get-url "$REMOTE")"
if [[ "$remote_url" != *"gitee.com"* && "${ALLOW_NON_GITEE_REMOTE:-0}" != "1" ]]; then
  echo "Error: remote '$REMOTE' does not look like a Gitee remote: $remote_url" >&2
  echo "Set ALLOW_NON_GITEE_REMOTE=1 to override." >&2
  exit 1
fi

branch="$(git -C "$REPO_DIR" branch --show-current)"
if [ -z "$branch" ]; then
  echo "Error: detached HEAD is not supported for release automation." >&2
  exit 1
fi

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

git -C "$REPO_DIR" push "$REMOTE" "$branch"
git -C "$REPO_DIR" push "$REMOTE" "$tag"

if [ -n "${GITEE_TOKEN:-}" ]; then
  owner_repo="$(node -e '
const url = process.argv[1];
let match = url.match(/gitee\\.com[:/]([^/]+)\\/([^/.]+)(?:\\.git)?$/);
if (!match) process.exit(1);
console.log(`${match[1]}/${match[2]}`);
' "$remote_url")"
  owner="${owner_repo%%/*}"
  repo="${owner_repo#*/}"
  release_body="${RELEASE_BODY:-Automated release $tag}"

  echo "==> Creating Gitee release $tag"
  curl --fail --silent --show-error \
    --request POST "https://gitee.com/api/v5/repos/$owner/$repo/releases" \
    --data-urlencode "access_token=$GITEE_TOKEN" \
    --data-urlencode "tag_name=$tag" \
    --data-urlencode "name=$tag" \
    --data-urlencode "body=$release_body" \
    --data-urlencode "target_commitish=$branch" >/dev/null
else
  echo "==> GITEE_TOKEN is not set; pushed commit and tag only, skipped Gitee Release API."
fi

echo "==> Released $tag to $REMOTE/$branch"
