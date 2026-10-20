#!/usr/bin/env python3
"""
Updates tags for all 124 Arabic Java sources (and 52 bundles) in PCEX Authoring
WITHOUT triggering compilation.
Tags applied:
  - "java-ds"
  - "arabic;color=yellow"
  - "llm-translation;color=blue"
  - "gpt5mini;color=purple"
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
MAPPING_FILE = os.path.join(SCRIPT_DIR, 'translations_mapping.json')

NEW_TAGS = [
    'java-ds',
    'arabic;color=yellow',
    'llm-translation;color=blue',
    'gpt5mini;color=purple'
]

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ssl_ctx)
)

# Authenticate
with open(os.path.join(PROJECT_DIR, 'scripts', 'old2new-mapping', 'auth_credentials.json')) as f:
    creds = json.load(f)

print("Authenticating with PCEX Authoring...", flush=True)
login_req = urllib.request.Request(
    f'{BASE_URL}/auth/login',
    data=json.dumps(creds).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
opener.open(login_req)
print("✓ Authenticated successfully.", flush=True)

# Load mapping
with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
    mapping_data = json.load(f)

sources = mapping_data.get('sources', {})
bundles = mapping_data.get('bundles', {})

print(f"Targeting {len(sources)} Arabic Java sources across {len(bundles)} bundles...\n", flush=True)

def patch_source(sid, sinfo, idx, total):
    url = f"{BASE_URL}/sources/{sid}"
    payload = {"tags": NEW_TAGS}
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers={'Content-Type': 'application/json'}, method='PATCH')
    
    for attempt in range(1, 4):
        try:
            with opener.open(req, timeout=30) as resp:
                if resp.status in (200, 204):
                    print(f"[{idx:03d}/{total:03d}] ✓ Source {sid} updated: \"{sinfo.get('ar_name', '')[:40]}\"", flush=True)
                    return True
                else:
                    print(f"[{idx:03d}/{total:03d}] ⚠ Source {sid} returned status {resp.status}", flush=True)
        except Exception as e:
            if attempt < 3:
                time.sleep(2 * attempt)
            else:
                print(f"[{idx:03d}/{total:03d}] ✗ Source {sid} error: {e}", flush=True)
                return False
    return False

def patch_bundle(bid, binfo, idx, total):
    url = f"{BASE_URL}/bundles/{bid}"
    payload = {"tags": NEW_TAGS}
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers={'Content-Type': 'application/json'}, method='PATCH')
    
    for attempt in range(1, 4):
        try:
            with opener.open(req, timeout=30) as resp:
                if resp.status in (200, 204):
                    print(f"[{idx:02d}/{total:02d}] ✓ Bundle {bid} updated: \"{binfo.get('bundle_name', '')[:40]}\"", flush=True)
                    return True
                else:
                    print(f"[{idx:02d}/{total:02d}] ⚠ Bundle {bid} returned status {resp.status}", flush=True)
        except Exception as e:
            if attempt < 3:
                time.sleep(2 * attempt)
            else:
                print(f"[{idx:02d}/{total:02d}] ✗ Bundle {bid} error: {e}", flush=True)
                return False
    return False

# --- Update Sources ---
print("=" * 60, flush=True)
print("Updating Arabic Java Sources (Tags only, no compile)", flush=True)
print("=" * 60, flush=True)
total_sources = len(sources)
src_ok = 0
for i, (sid, sinfo) in enumerate(sources.items(), start=1):
    if patch_source(sid, sinfo, i, total_sources):
        src_ok += 1
    time.sleep(0.1)

# --- Update Bundles ---
print("\n" + "=" * 60, flush=True)
print("Updating Arabic Java Bundles (Tags only, no compile)", flush=True)
print("=" * 60, flush=True)
total_bundles = len(bundles)
bnd_ok = 0
for i, (bid, binfo) in enumerate(bundles.items(), start=1):
    if patch_bundle(bid, binfo, i, total_bundles):
        bnd_ok += 1
    time.sleep(0.1)

print("\n" + "=" * 60, flush=True)
print(f"Update Summary:")
print(f"  Sources: {src_ok}/{total_sources} updated successfully")
print(f"  Bundles: {bnd_ok}/{total_bundles} updated successfully")
print(f"  Tags: {NEW_TAGS}")
print("=" * 60, flush=True)
