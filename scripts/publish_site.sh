#!/bin/bash
# Publishes the Prep Planner to its no-login website: the public repo
# imprimisxo/fiveoaks-prep-planner, served by GitHub Pages at
# https://imprimisxo.github.io/fiveoaks-prep-planner/. The site repo holds only staged
# copies of the page; the source stays here. See SKILL.md, "Web app".
#
#   scripts/publish_site.sh "<commit message>"
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
MSG="${1:?usage: publish_site.sh \"<commit message>\"}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone -q https://github.com/imprimisxo/fiveoaks-prep-planner.git "$WORK/site"
"$SKILL/scripts/stage_webapp.sh" "$WORK/site" >/dev/null
touch "$WORK/site/.nojekyll"   # serve the files as they are, no Jekyll build

cd "$WORK/site"
FILES=(index.html prep_core.js menu.json FiveOaksLogo.png .nojekyll)
[ -f firebase-config.json ] && FILES+=(firebase-config.json)
git add -- "${FILES[@]}"
if git diff --cached --quiet; then
  echo "site already up to date"
  exit 0
fi
git commit -q -m "$MSG"
git push -q origin HEAD
echo "pushed $(git log -1 --format='%h %s')"
