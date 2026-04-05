#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
ZIP_NAME="WideChat-firefox-v${VERSION}.zip"
TEMP_DIR=$(mktemp -d ./tmp_firefox_build_XXXXXX)

cp manifest.json settings.html settings.js widechat.js README.md "$TEMP_DIR/"
cp -r icons images "$TEMP_DIR/"

# Remove homepage_url (not supported in Firefox manifest) and default_icon (Firefox uses top-level icons)
python3 -c "
import json, sys
with open('$TEMP_DIR/manifest.json', 'r') as f:
    m = json.load(f)
m.pop('homepage_url', None)
m['action'].pop('default_icon', None)
with open('$TEMP_DIR/manifest.json', 'w') as f:
    json.dump(m, f, indent=2)
    f.write('\n')
"

rm -f "$ZIP_NAME"
(cd "$TEMP_DIR" && zip -r "../$ZIP_NAME" .)

rm -rf "$TEMP_DIR"

echo "Created $ZIP_NAME"
