#!/usr/bin/env bash
#
# Build a production release zip for Mailyard.
#
# Usage:   npm run zip
# Output:  mailyard-{version}.zip in the project root
#
# What it does:
#   1. Lints the main plugin file with `php -l`
#   2. Builds production JS/CSS assets
#   3. Installs composer prod-only dependencies into a clean vendor/
#   4. Mirrors the plugin to a temp dir via rsync using .distignore
#   5. Strips junk from vendor libs (tests/, docs/, .git)
#   6. Creates the zip and validates it
#

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
SLUG="mailyard"
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "${ROOT_DIR}"

VERSION=$( grep -E "^[[:space:]]*\*[[:space:]]*Version:" "${SLUG}.php" | head -1 | awk '{print $NF}' )
if [ -z "${VERSION}" ]; then
    echo "✗ Could not read Version: from ${SLUG}.php" >&2
    exit 1
fi

ZIP_NAME="${SLUG}-${VERSION}.zip"
DIST_IGNORE="${ROOT_DIR}/.distignore"

# ── Colors (only if tty) ────────────────────────────────────────────
if [ -t 1 ]; then
    C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_RESET=$'\033[0m'
else
    C_BOLD=""; C_DIM=""; C_GREEN=""; C_RED=""; C_RESET=""
fi

step()    { echo "${C_BOLD}→${C_RESET} $*"; }
success() { echo "${C_GREEN}✓${C_RESET} $*"; }
fail()    { echo "${C_RED}✗${C_RESET} $*" >&2; exit 1; }

echo ""
echo "${C_BOLD}Building ${ZIP_NAME}${C_RESET}"
echo ""

# ── 1. Lint main plugin file ────────────────────────────────────────
step "Linting PHP entry file"
php -l "${SLUG}.php" > /dev/null || fail "PHP syntax error in ${SLUG}.php"

# ── 2. Build production assets ──────────────────────────────────────
step "Building production assets"
npm run build --silent > /dev/null 2>&1 || fail "Asset build failed (run 'npm run build' to see errors)"

[ -f "build/admin.js" ] || fail "build/admin.js missing after build"

# ── 3. Composer prod dependencies ───────────────────────────────────
if [ -f "composer.json" ]; then
    step "Installing composer production dependencies"
    composer install --no-dev --optimize-autoloader --quiet 2>/dev/null \
        || fail "composer install failed"
fi

# ── 4. Stage files via rsync ────────────────────────────────────────
step "Staging files"
TEMP_DIR=$( mktemp -d )
trap 'rm -rf "${TEMP_DIR}"' EXIT
STAGE_DIR="${TEMP_DIR}/${SLUG}"
mkdir -p "${STAGE_DIR}"

# Write exclude list if .distignore doesn't exist.
if [ ! -f "${DIST_IGNORE}" ]; then
    cat > "${DIST_IGNORE}" <<'EOF'
# Dev / VCS
.git/
.github/
.gitignore
.gitattributes
.distignore
.editorconfig
.DS_Store
*.log

# Source & tooling
src/
node_modules/
scripts/
webpack.config.js
postcss.config.js
tailwind.config.js
package.json
package-lock.json
composer.lock
phpcs.xml*
phpunit.xml*
tests/

# Docs not shipped
CLAUDE.md
docs/
components.json
*.html

# Release artifacts
*.zip

# Source maps
*.map
EOF
fi

rsync -a --delete \
    --exclude-from="${DIST_IGNORE}" \
    "${ROOT_DIR}/" "${STAGE_DIR}/"

# ── 5. Trim vendor bloat ────────────────────────────────────────────
if [ -d "${STAGE_DIR}/vendor" ]; then
    step "Trimming vendor libraries"
    find "${STAGE_DIR}/vendor" -type d \( \
        -name ".git" -o \
        -name "tests" -o \
        -name "test" -o \
        -name "docs" -o \
        -name "doc" -o \
        -name "examples" -o \
        -name ".github" \
    \) -prune -exec rm -rf {} + 2>/dev/null || true

    find "${STAGE_DIR}/vendor" -type f \( \
        -name "*.md" -o \
        -name "*.yml" -o \
        -name "*.yaml" -o \
        -name ".editorconfig" -o \
        -name ".gitattributes" -o \
        -name ".gitignore" -o \
        -name "phpunit*.xml*" -o \
        -name "phpcs*.xml*" -o \
        -name "composer.lock" \
    \) -delete 2>/dev/null || true
fi

# ── 6. Build zip ────────────────────────────────────────────────────
step "Creating zip"
rm -f "${ROOT_DIR}/${ZIP_NAME}"
( cd "${TEMP_DIR}" && zip -rq "${ZIP_NAME}" "${SLUG}/" )
mv "${TEMP_DIR}/${ZIP_NAME}" "${ROOT_DIR}/${ZIP_NAME}"

# ── 7. Verify ───────────────────────────────────────────────────────
step "Verifying zip"
unzip -tq "${ROOT_DIR}/${ZIP_NAME}" > /dev/null || fail "Zip verification failed"

# ── 8. Restore dev composer deps ────────────────────────────────────
if [ -f "composer.json" ]; then
    composer install --quiet 2>/dev/null || true
fi

# ── 9. Summary ──────────────────────────────────────────────────────
SIZE=$( du -h "${ROOT_DIR}/${ZIP_NAME}" | awk '{print $1}' )
FILE_COUNT=$( unzip -l "${ROOT_DIR}/${ZIP_NAME}" | tail -1 | awk '{print $2}' )

echo ""
success "${C_BOLD}${ZIP_NAME}${C_RESET}  ${C_DIM}(${SIZE}, ${FILE_COUNT} files)${C_RESET}"
echo ""
