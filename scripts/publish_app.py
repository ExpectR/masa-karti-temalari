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

def release_notes_payload(version):
    path = ROOT / 'app/release-notes.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or data.get('schemaVersion') != 1 or not isinstance(data.get('releases'), list):
        raise SystemExit('app/release-notes.json must contain schemaVersion 1 and a releases list.')
    entries, versions = [], set()
    for entry in data['releases']:
        if not isinstance(entry, dict):
            raise SystemExit('Every release note must be an object.')
        number, title, changes = entry.get('version'), entry.get('title'), entry.get('changes')
        if not isinstance(number, str) or not re.fullmatch(r'\d{1,6}\.\d{1,6}\.\d{1,6}', number) or number in versions:
            raise SystemExit('Release note versions must be unique major.minor.patch values.')
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
            raise SystemExit('Each release note needs a short title.')
        if not isinstance(changes, list) or not 1 <= len(changes) <= 8 or any(not isinstance(line, str) or not 1 <= len(line.strip()) <= 240 for line in changes):
            raise SystemExit('Each release note needs 1-8 short, non-empty changes.')
        versions.add(number)
        entries.append({'version': number, 'title': title.strip(), 'changes': [line.strip() for line in changes]})
    if version not in versions:
        raise SystemExit(f'Add release notes for {version} to app/release-notes.json before publishing.')
    version_key = lambda number: tuple(map(int, number.split('.')))
    entries.sort(key=lambda entry: version_key(entry['version']), reverse=True)
    return {'schemaVersion': 1, 'currentVersion': version,
            'releases': [entry for entry in entries if version_key(entry['version']) <= version_key(version)][:12]}

def build(version):
    if not re.fullmatch(r'\d{1,6}\.\d{1,6}\.\d{1,6}', version):
        raise SystemExit('Use a numeric major.minor.patch version.')
    source = ROOT / 'app/umutcan.html'
    html = source.read_text(encoding='utf-8')
    transport = (ROOT / 'scripts/update_transport.js').read_text(encoding='utf-8')
    if '</script' in transport.lower():
        raise SystemExit('Update transport contains an unsafe closing script tag.')
    block = '<!-- UMUT_UPDATE_TRANSPORT_START -->\n<script>\n' + transport + '\n</script>\n<!-- UMUT_UPDATE_TRANSPORT_END -->'
    html, transport_count = re.subn(r'<!-- UMUT_UPDATE_TRANSPORT_START -->.*?<!-- UMUT_UPDATE_TRANSPORT_END -->', lambda m: block, html, count=1, flags=re.S)
    if transport_count != 1:
        raise SystemExit('Runtime update transport marker is missing.')

    contract = (ROOT / 'scripts/gemini-contract.cjs').read_text(encoding='utf-8')
    if '</script' in contract.lower():
        raise SystemExit('Gemini contract contains an unsafe closing script tag.')
    contract_block = '<!-- UMUT_GEMINI_CONTRACT_START -->\n<script>\n' + contract + '\n</script>\n<!-- UMUT_GEMINI_CONTRACT_END -->'
    html, contract_count = re.subn(r'<!-- UMUT_GEMINI_CONTRACT_START -->.*?<!-- UMUT_GEMINI_CONTRACT_END -->', lambda m: contract_block, html, count=1, flags=re.S)
    if contract_count != 1:
        raise SystemExit('Gemini contract marker is missing.')

    horde = (ROOT / 'scripts/horde-client.js').read_text(encoding='utf-8')
    if '</script' in horde.lower():
        raise SystemExit('Horde client contains an unsafe closing script tag.')
    horde_block = '<!-- UMUT_HORDE_START -->\n<script>\n' + horde + '\n</script>\n<!-- UMUT_HORDE_END -->'
    html, horde_count = re.subn(r'<!-- UMUT_HORDE_START -->.*?<!-- UMUT_HORDE_END -->', lambda m: horde_block, html, count=1, flags=re.S)
    if horde_count != 1:
        raise SystemExit('Horde client marker is missing.')

    notes = release_notes_payload(version)
    encoded_notes = json.dumps(notes, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    notes_block = '<!-- UMUT_RELEASE_NOTES_START -->\n<script type="application/json" id="umut-release-notes-data">' + encoded_notes + '</script>\n<!-- UMUT_RELEASE_NOTES_END -->'
    html, notes_count = re.subn(r'<!-- UMUT_RELEASE_NOTES_START -->.*?<!-- UMUT_RELEASE_NOTES_END -->', lambda m: notes_block, html, count=1, flags=re.S)
    if notes_count != 1:
        raise SystemExit('Runtime release notes marker is missing.')

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
    loader = transport + '\n' + (ROOT / 'scripts/launcher.js').read_text(encoding='utf-8')
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

