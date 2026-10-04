#!/usr/bin/env python3
"""
Links Arabic translated sources and bundles associated with ahgamlo@kau.edu.sa
to their original English versions in moh70@pitt.edu's account.
Performs strictly metadata updates (no compile triggered).
"""

import os
import sys
import json
import ssl
import time
import urllib.request
import http.cookiejar

sys.stdout.reconfigure(line_buffering=True)

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
WORKSPACE_DIR = os.path.join(SCRIPT_DIR, 'translation-arabic-remaining')
MAPPING_OUT = os.path.join(WORKSPACE_DIR, 'translations_mapping.json')

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ssl_ctx)
)

with open(os.path.join(PROJECT_DIR, 'scripts', 'old2new-mapping', 'auth_credentials.json')) as f:
    creds = json.load(f)

opener.open(urllib.request.Request(
    f'{BASE_URL}/auth/login',
    data=json.dumps(creds).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
))
print("✓ Authenticated with PCEX Authoring", flush=True)

target_user = 'ahgamlo@kau.edu.sa'

print("Fetching bundles and sources from server...", flush=True)
all_bundles = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/bundles')).read().decode('utf-8'))
all_sources = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/sources')).read().decode('utf-8'))
source_by_id = {s['id']: s for s in all_sources}

ar_bundles = [b for b in all_bundles if (b.get('user') or '').lower() == target_user.lower() or target_user.lower() in [c.lower() for c in (b.get('collaborator_emails') or [])]]
en_bundles = [b for b in all_bundles if b.get('iso_language_code') == 'en' and (b.get('user') == 'moh70@pitt.edu') and (target_user.lower() not in [c.lower() for c in (b.get('collaborator_emails') or [])])]

en_by_name = {}
for b in en_bundles:
    en_by_name.setdefault(b['name'], []).append(b)

print(f"✓ Found {len(ar_bundles)} Arabic bundles to link", flush=True)

bundle_links = {}
source_links = {}

# 1. Standalone clone source
source_links['6937e489e28428298e575ce9'] = {
    'en_id': '68bdb309f6cc3d7a9cc09869',
    'ar_name': source_by_id.get('6937e489e28428298e575ce9', {}).get('name'),
    'en_name': source_by_id.get('68bdb309f6cc3d7a9cc09869', {}).get('name')
}

# 2. Iterate bundles and link
print("\n" + "=" * 70, flush=True)
print("Linking 52 Bundles and their constituent sources...", flush=True)
print("=" * 70, flush=True)

linked_bundles_count = 0
linked_sources_count = 0

for idx, ar_b in enumerate(ar_bundles, 1):
    bname = ar_b['name']
    ar_bid = ar_b['id']
    candidates = en_by_name.get(bname, [])
    ar_items = ar_b.get('items', [])

    best_en = None
    for cand in candidates:
        if len(cand.get('items', [])) == len(ar_items):
            best_en = cand
            break

    if not best_en:
        print(f"[{idx:02d}/52] ✗ Could not find exact English bundle match for '{bname}' ({ar_bid})", flush=True)
        continue

    en_bid = best_en['id']
    en_items = best_en.get('items', [])

    # PATCH bundle translation link
    try:
        req_patch_b = urllib.request.Request(
            f'{BASE_URL}/bundles/{ar_bid}',
            data=json.dumps({'translations': {'en': en_bid}}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        opener.open(req_patch_b, timeout=30)
        linked_bundles_count += 1
        bundle_links[ar_bid] = {
            'bundle_name': bname,
            'en_id': en_bid,
            'items_count': len(ar_items)
        }
        print(f"[{idx:02d}/52] ✓ Bundle Linked: '{bname}' (AR: {ar_bid} <-> EN: {en_bid})", flush=True)
    except Exception as e:
        print(f"[{idx:02d}/52] ✗ Error linking bundle '{bname}': {e}", flush=True)

    # Link each source item in the bundle
    for i in range(len(ar_items)):
        ar_sid = ar_items[i]['item']
        en_sid = en_items[i]['item']

        ar_sname = source_by_id.get(ar_sid, {}).get('name', '')
        en_sname = source_by_id.get(en_sid, {}).get('name', '')

        try:
            req_patch_s = urllib.request.Request(
                f'{BASE_URL}/sources/{ar_sid}',
                data=json.dumps({'translations': {'en': en_sid}}).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            opener.open(req_patch_s, timeout=30)
            linked_sources_count += 1
            source_links[ar_sid] = {
                'en_id': en_sid,
                'ar_name': ar_sname,
                'en_name': en_sname,
                'bundle': bname
            }
            print(f"       ✓ Source: \"{ar_sname}\" ({ar_sid}) <-> \"{en_sname}\" ({en_sid})", flush=True)
        except Exception as e:
            print(f"       ✗ Error linking source {ar_sid}: {e}", flush=True)

# Save full mapping report
with open(MAPPING_OUT, 'w', encoding='utf-8') as f:
    json.dump({
        'bundles': bundle_links,
        'sources': source_links,
        'stats': {
            'linked_bundles': linked_bundles_count,
            'linked_sources': linked_sources_count,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
    }, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 70, flush=True)
print(f"Linking Complete!", flush=True)
print(f"  Bundles linked: {linked_bundles_count} / {len(ar_bundles)}", flush=True)
print(f"  Sources linked: {linked_sources_count} / 123", flush=True)
print(f"  Mapping saved to: {MAPPING_OUT}", flush=True)
print("=" * 70, flush=True)
