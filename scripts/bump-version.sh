#!/bin/sh
# Stamp a new cache-busting version on every asset link so browsers fetch fresh files after a deploy.
# Run before committing a release:  sh scripts/bump-version.sh
set -e
cd "$(dirname "$0")/.."
V=$(date +%Y%m%d%H%M)
sed -i.bak -E "s/(styles\.css|data\.js|app\.js)(\?v=[0-9]+)?\"/\1?v=$V\"/g" index.html
sed -i.bak -E "s#'\./orb\.js(\?v=[0-9]+)?'#'./orb.js?v=$V'#" app.js
rm -f index.html.bak app.js.bak
echo "Asset version: $V"
