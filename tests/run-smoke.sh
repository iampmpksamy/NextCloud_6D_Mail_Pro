#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
while IFS= read -r -d '' file; do
    php -l "$file" >/dev/null
done < <(find appinfo lib templates tests -path 'tests/integration/.cache' -prune -o -name '*.php' -print0)
php tests/routes.php
php tests/template.php
node --check js/mail-provider.js
node --check js/workspace.js
node --check js/ocs-provider.js
node tests/provider.cjs
node tests/ocs-provider.cjs
python3 - <<'PY'
import json
import xml.etree.ElementTree as ET
from pathlib import Path
info = ET.parse('appinfo/info.xml')
assert info.findtext('id') == 'sixd_mail_pro'
assert info.findtext('version') == '0.1.0-dev.2'
assert info.findtext('version') in Path('CHANGELOG.md').read_text()
assert json.loads(Path('composer.json').read_text())['license'] == 'AGPL-3.0-or-later'
ET.parse('img/app.svg')
print('Manifest, SVG, and metadata checks passed')
PY
if [[ -n "${NEXTCLOUD_INFO_XSD:-}" ]]; then
    php -r '$d = new DOMDocument(); $d->load("appinfo/info.xml"); exit($d->schemaValidate($argv[1]) ? 0 : 1);' "$NEXTCLOUD_INFO_XSD"
fi
if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
    python3 tests/run-browser-smoke.py
else
    echo "Browser checks skipped: install Chrome/Chromium to run tests/run-browser-smoke.py"
fi
git diff --check
