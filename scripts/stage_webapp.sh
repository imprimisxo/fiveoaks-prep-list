#!/bin/bash
# Gathers the web app and the files it loads (prep_core.js, menu.json, the logo) into one
# folder, ready to publish as the Five Oaks Prep Planner artifact. See SKILL.md, "Web app".
#
#   scripts/stage_webapp.sh <dest dir>
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:?usage: stage_webapp.sh <dest dir>}"
mkdir -p "$DEST"
cp "$SKILL/webapp/index.html" "$DEST/index.html"
cp "$SKILL/scripts/prep_core.js" "$DEST/prep_core.js"
cp "$SKILL/data/menu.json" "$DEST/menu.json"
cp "$SKILL/assets/FiveOaksLogo.png" "$DEST/FiveOaksLogo.png"
# The GitHub Pages site also needs the Firebase web config. Inside Claude the page never
# reads it, so the artifact publish can leave it out.
if [ -f "$SKILL/webapp/firebase-config.json" ]; then
  cp "$SKILL/webapp/firebase-config.json" "$DEST/firebase-config.json"
fi
echo "staged in $DEST:"
ls -1 "$DEST"
