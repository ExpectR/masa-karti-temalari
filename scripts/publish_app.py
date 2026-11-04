#!/usr/bin/env python3
"""Build a versioned app, its verified update manifest and the permanent launcher."""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ID = 'masa-karti-atolyesi'
PROTOCOL = 1

def build(version):
    if not re.fullmatch(r'\d{1,6}\.\d{1,6}\.\d{1,6}', version):
        raise SystemExit('Use a numeric major.minor.patch version.')
    source = ROOT / 'app/umutcan.html'
    html = source.read_text(encoding='utf-8')
    html, count = re.subn(r"var APP_VERSION='[^']+'", "var APP_VERSION='" + version + "'", html, count=1)
    if count != 1:
        raise SystemExit('APP_VERSION is missing.')
    html, count = re.subn(r'(<meta name="umutcan-app-version" content=")[^"]+(">)', lambda m: m[1]+version+m[2], html, count=1)
    if count != 1:
        raise SystemExit('App version metadata is missing.')
    data = html.encode('utf-8')
    digest = hashlib.sha256(data).hexdigest()
    release = ROOT / f'releases/umutcan-{version}.html'
    if release.exists() and release.read_bytes() != data:
        raise SystemExit('Published release is immutable; choose a new version.')
    release.parent.mkdir(exist_ok=True)
    source.write_bytes(data)
    release.write_bytes(data)
    manifest = {'schemaVersion': 1, 'appId': APP_ID, 'launcherProtocol': PROTOCOL,
                'version': version, 'file': release.relative_to(ROOT).as_posix(),
                'sha256': digest, 'size': len(data),
                'publishedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
    (ROOT / 'app-update.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    catalog_path = ROOT / 'index.json'
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
        catalog['appVersion'] = version
        catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    bundle = {'appId': APP_ID, 'launcherProtocol': PROTOCOL, 'version': version,
              'html': html, 'sha256': digest, 'size': len(data), 'pending': False}
    encoded = json.dumps(bundle, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    loader = (ROOT / 'scripts/launcher.js').read_text(encoding='utf-8')
    if '</script' in loader.lower():
        raise SystemExit('Launcher contains an unsafe closing script tag.')
    shell = '''<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="author" content="Umutcan Şahin">
<title>Masa Kartı Atölyesi — Umutcan</title>
<style>body{margin:0;background:#f6f1ec;color:#44352f;font:16px system-ui,sans-serif}.boot{max-width:420px;margin:15vh auto;padding:32px}h1{font-size:24px}</style>
</head><body><main class="boot"><noscript>Uygulama için JavaScript açık olmalıdır.</noscript></main>
<script type="application/json" id="umutcan-bundled-app">'''+encoded+'''</script>
<script>'''+loader+'''</script></body></html>
'''
    (ROOT / 'umutcan.html').write_text(shell, encoding='utf-8')
    print(json.dumps({'version': version, 'release': manifest['file'], 'sha256': digest, 'size': len(data)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', help='Defaults to the next patch of app-update.json.')
    args = parser.parse_args()
    version = args.version
    if version is None:
        current = json.loads((ROOT / 'app-update.json').read_text(encoding='utf-8'))['version']
        major, minor, patch = map(int, current.split('.'))
        version = f'{major}.{minor}.{patch+1}'
    build(version)
