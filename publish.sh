#!/usr/bin/env bash
#
# publish.sh — run the human half of an Ovellum release in one go.
#
# Prep happens FIRST (and is usually done for you): `pnpm changeset version`,
# bump `site.version` in website/ovellum.config.ts + `version` in server.json,
# `pnpm -w build`, `npm test`, then commit as "chore: version packages". Once
# that commit is on `main` and the tree is clean, run this script to perform the
# steps only a human can do (npm OTP, GPG-signed tag, registry auth):
#
#   1. git push origin main
#   2. npm publish              (needs your 2FA OTP)
#   3. signed git tag + push    (GPG pinentry will prompt)
#   4. GitHub release           (from the CHANGELOG section)
#   5. MCP Registry publish     (mcp-publisher; refreshes the registry listing)
#
# It derives every variable itself — version, tag, registry name — from
# packages/cli/package.json + server.json, so there's nothing to pass but your
# OTP. Each step is idempotent: a step whose result already exists (version on
# npm, tag pushed, release cut, registry version present) is detected and
# skipped, so re-running after a mid-way failure is safe.
#
# Usage:
#   ./publish.sh --npmotp=123456
#   ./publish.sh --npmotp=123456 --skip-registry
#   ./publish.sh --dry-run
#
# Flags:
#   --npmotp=CODE     npm one-time password (2FA). Omit only with --skip-npm.
#   --skip-npm        don't publish to npm (e.g. it's already up).
#   --skip-registry   don't publish to the MCP Registry.
#   --dry-run         print each step without running it.
#   -h, --help        show this help.
#
# The full runbook + failure modes live in docs/internal/RELEASE.md.

set -euo pipefail

# --- args ----------------------------------------------------------------
OTP=""
SKIP_NPM=0
SKIP_REGISTRY=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --npmotp=*)     OTP="${arg#*=}" ;;
    --skip-npm)     SKIP_NPM=1 ;;
    --skip-registry) SKIP_REGISTRY=1 ;;
    --dry-run)      DRY_RUN=1 ;;
    -h|--help)      sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# --- helpers -------------------------------------------------------------
bold() { printf '\033[1m%s\033[0m\n' "$1"; }
info() { printf '  %s\n' "$1"; }
die()  { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
# run: echo (and execute unless --dry-run) a command.
run()  { printf '\033[2m$ %s\033[0m\n' "$*"; [ "$DRY_RUN" = 1 ] || "$@"; }

cd "$(dirname "$0")" # repo root (this script lives there)

# --- derive variables ----------------------------------------------------
[ -f packages/cli/package.json ] || die "run from the repo root (packages/cli/package.json not found)."
VERSION="$(node -p "require('./packages/cli/package.json').version")"
TAG="ovellum@${VERSION}"
MCP_NAME="$(node -p "require('./server.json').name")"
SERVER_VERSION="$(node -p "require('./server.json').version")"
SERVER_PKG_VERSION="$(node -p "require('./server.json').packages[0].version")"

bold "Ovellum release ${TAG}"
info "npm package : ovellum@${VERSION}"
info "git tag     : ${TAG}"
info "MCP server  : ${MCP_NAME} (server.json @ ${SERVER_VERSION})"
echo

# --- preflight -----------------------------------------------------------
bold "Preflight"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "not on 'main'."
[ -z "$(git status --porcelain)" ] || die "working tree is dirty — commit the 'chore: version packages' bump first."
# A pending changeset means the version bump hasn't been applied yet.
if ls .changeset/*.md >/dev/null 2>&1 && ls .changeset/*.md | grep -qv 'README.md'; then
  die "pending changesets in .changeset/ — run 'pnpm changeset version' (+ rebuild/commit) before publishing."
fi
# The registry manifest must describe the version we're shipping.
[ "$SERVER_VERSION" = "$VERSION" ] && [ "$SERVER_PKG_VERSION" = "$VERSION" ] || \
  die "server.json version ($SERVER_VERSION/$SERVER_PKG_VERSION) != package version ($VERSION). Bump server.json before publishing."
# The CHANGELOG must have this version's notes.
grep -q "^## ${VERSION}\$" packages/cli/CHANGELOG.md || die "no '## ${VERSION}' section in packages/cli/CHANGELOG.md."
[ "$SKIP_NPM" = 1 ] || [ -n "$OTP" ] || die "no --npmotp=<code> given (or pass --skip-npm)."
command -v gh >/dev/null || die "the 'gh' CLI is required for the GitHub release step."
info "on main, clean tree, no pending changesets, server.json in sync, CHANGELOG ready."
echo

# --- 1. push main --------------------------------------------------------
bold "1/5  Push main"
run git push origin main
echo

# --- 2. npm publish ------------------------------------------------------
bold "2/5  npm publish"
if [ "$SKIP_NPM" = 1 ]; then
  info "skipped (--skip-npm)."
elif [ "$(npm view "ovellum@${VERSION}" version 2>/dev/null || true)" = "$VERSION" ]; then
  info "ovellum@${VERSION} is already on npm — skipping."
else
  # prepublishOnly rebuilds dist/ fresh; OTP covers npm 2FA.
  run sh -c "cd packages/cli && npm publish --otp='${OTP}'"
fi
echo

# --- 3. signed tag -------------------------------------------------------
bold "3/5  Signed git tag"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  info "tag ${TAG} already exists locally — ensuring it's pushed."
  run git push origin "$TAG"
else
  # Signed-annotated (repo enforces tag.gpgSign) — GPG pinentry will prompt.
  run git tag -s "$TAG" -m "$TAG"
  run git push origin "$TAG"
fi
echo

# --- 4. GitHub release ---------------------------------------------------
bold "4/5  GitHub release"
if gh release view "$TAG" >/dev/null 2>&1; then
  info "release ${TAG} already exists — skipping."
else
  # Pull this version's section out of the CHANGELOG, append a full-diff link.
  PREV_TAG="$(git tag -l 'ovellum@*' --sort=-version:refname | grep -vx "$TAG" | head -1 || true)"
  NOTES_FILE="$(mktemp)"
  awk -v v="## ${VERSION}" '
    $0==v {p=1; next}
    /^## [0-9]/ {if(p) exit}
    p {print}
  ' packages/cli/CHANGELOG.md > "$NOTES_FILE"
  if [ -n "$PREV_TAG" ]; then
    printf '\n---\n\n**Full diff:** https://github.com/oinam/ovellum/compare/%s...%s\n' "$PREV_TAG" "$TAG" >> "$NOTES_FILE"
  fi
  run gh release create "$TAG" --title "$TAG" --notes-file "$NOTES_FILE"
  rm -f "$NOTES_FILE"
fi
echo

# --- 5. MCP Registry -----------------------------------------------------
bold "5/5  MCP Registry publish"
if [ "$SKIP_REGISTRY" = 1 ]; then
  info "skipped (--skip-registry)."
elif ! command -v mcp-publisher >/dev/null; then
  info "mcp-publisher not installed — skipping. To do it later:"
  info "  brew install mcp-publisher && mcp-publisher login github && mcp-publisher publish"
else
  # The registry is immutable per (name, version): if ${MCP_NAME}@${VERSION} is
  # already listed, publish returns a 'duplicate version' error — treat as done.
  # Needs a prior 'mcp-publisher login github' (device-code flow).
  if [ "$DRY_RUN" = 1 ]; then
    printf '\033[2m$ mcp-publisher publish\033[0m\n'
  elif out="$(mcp-publisher publish 2>&1)"; then
    info "published ${MCP_NAME}@${VERSION} to the MCP Registry."
  elif printf '%s' "$out" | grep -qi 'duplicate version'; then
    info "${MCP_NAME}@${VERSION} already in the registry — skipping."
  else
    printf '%s\n' "$out" >&2
    die "mcp-publisher failed. If it's an auth error: 'mcp-publisher login github', then re-run ./publish.sh (earlier steps are idempotent and will be skipped)."
  fi
fi
echo

bold "Done — ${TAG} released."
info "npm:      https://www.npmjs.com/package/ovellum/v/${VERSION}"
info "release:  https://github.com/oinam/ovellum/releases/tag/${TAG}"
info "registry: https://registry.modelcontextprotocol.io  (${MCP_NAME})"
