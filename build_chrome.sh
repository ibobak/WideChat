#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
ZIP_NAME="WideChat-chrome-v${VERSION}.zip"
TEMP_DIR=$(mktemp -d ./tmp_chrome_build_XXXXXX)

cp manifest.json settings.html settings.js widechat.js "$TEMP_DIR/"
cp -r icons images "$TEMP_DIR/"

# Remove browser_specific_settings block from manifest.json
python3 -c "
import json, sys
with open('$TEMP_DIR/manifest.json', 'r') as f:
    m = json.load(f)
m.pop('browser_specific_settings', None)
with open('$TEMP_DIR/manifest.json', 'w') as f:
    json.dump(m, f, indent=2)
    f.write('\n')
"

rm -f "$ZIP_NAME"
(cd "$TEMP_DIR" && zip -r "../$ZIP_NAME" .)

rm -rf "$TEMP_DIR"

echo "Created $ZIP_NAME"
