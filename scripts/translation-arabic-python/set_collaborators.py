#!/usr/bin/env python3
"""
Sets strictly zainakhalil002@gmail.com and peterb@pitt.edu as collaborators
for all 123 Arabic Python sources and 52 bundles in PCEX Authoring.
Updates both live server and local JSON files (no compile).
"""

import os
import sys
import json
import ssl
import time
import urllib.request
import urllib.error
import http.cookiejar

sys.stdout.reconfigure(line_buffering=True)

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'translated_sources')
MAPPING_FILE = os.path.join(SCRIPT_DIR, 'translations_mapping.json')

TARGET_COLLABORATORS = [
    'zainakhalil002@gmail.com',
    'peterb@pitt.edu'
]

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

print("Authenticating with PCEX Authoring...", flush=True)
opener.open(urllib.request.Request(
    f'{BASE_URL}/auth/login',
    data=json.dumps(creds).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
))
print("✓ Authenticated.", flush=True)

# 1. Fetch all staged Arabic Python bundles and sources
all_bundles = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/bundles?allUsers=true')).read().decode('utf-8'))
all_sources = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/sources?allUsers=true')).read().decode('utf-8'))

with open(os.path.join(PROJECT_DIR, 'scripts', 'clone4arabic', 'list.json')) as f:
    clone_list = json.load(f)
py_clone = clone_list.get('Intro to Python - Fall 2025', {})
canonical_set_names = set(py_clone.keys())

ar_staged_sids = {
    s['id'] for s in all_sources
    if (s.get('language') or s.get('programming_language')) == 'PYTHON'
    and any('arabic' in str(t).lower() for t in s.get('tags', []))
}

target_bundles = []
target_sources = set()

for b in all_bundles:
    items = [it.get('item') for it in b.get('items', []) if it.get('item') in ar_staged_sids]
    if items:
        target_bundles.append(b)
        for sid in items:
            target_sources.add(sid)

print(f"Found {len(target_sources)} Arabic Python sources across {len(target_bundles)} bundles.")
print(f"Setting collaborators to: {TARGET_COLLABORATORS}\n", flush=True)

# 2. Update Sources
print("Updating Sources...", flush=True)
src_ok = 0
for idx, sid in enumerate(sorted(target_sources), start=1):
    payload = {'collaborator_emails': TARGET_COLLABORATORS}
    try:
        req = urllib.request.Request(
            f'{BASE_URL}/sources/{sid}',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        opener.open(req, timeout=30)
        src_ok += 1
        # Update local file if exists
        local_fp = os.path.join(OUTPUT_DIR, f'{sid}.json')
        if os.path.exists(local_fp):
            with open(local_fp, 'r', encoding='utf-8') as f:
                doc = json.load(f)
            doc['collaborator_emails'] = TARGET_COLLABORATORS
            with open(local_fp, 'w', encoding='utf-8') as f:
                json.dump(doc, f, indent=2, ensure_ascii=False)
        if idx % 10 == 0 or idx == len(target_sources):
            print(f"  [{idx:03d}/{len(target_sources):03d}] Sources updated...", flush=True)
    except Exception as e:
        print(f"  ✗ Error updating source {sid}: {e}", flush=True)
    time.sleep(0.05)

# 3. Update Bundles
print("\nUpdating Bundles...", flush=True)
bnd_ok = 0
for idx, b in enumerate(target_bundles, start=1):
    bid = b['id']
    payload = {'collaborator_emails': TARGET_COLLABORATORS}
    try:
        req = urllib.request.Request(
            f'{BASE_URL}/bundles/{bid}',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        opener.open(req, timeout=30)
        bnd_ok += 1
        if idx % 10 == 0 or idx == len(target_bundles):
            print(f"  [{idx:02d}/{len(target_bundles):02d}] Bundles updated...", flush=True)
    except Exception as e:
        print(f"  ✗ Error updating bundle {bid}: {e}", flush=True)
    time.sleep(0.05)

print("\n" + "=" * 60, flush=True)
print(f"Collaborator update complete!")
print(f"  Sources updated: {src_ok}/{len(target_sources)}")
print(f"  Bundles updated: {bnd_ok}/{len(target_bundles)}")
print(f"  Collaborators set: {TARGET_COLLABORATORS}")
print("=" * 60, flush=True)
