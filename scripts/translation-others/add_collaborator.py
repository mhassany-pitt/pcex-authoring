#!/usr/bin/env python3
"""
Adds lmarquez@oswego.edu as a collaborator to all translated sources and bundles.
- Updates local JSON files
- PATCHes the server via bulk API (collaborator_emails only)
"""

import os
import json
import ssl
import time
import urllib.request
import urllib.error
import http.cookiejar

BASE_URL = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
NEW_COLLABORATOR = "lmarquez@oswego.edu"
OWNER = "moh70@pitt.edu"

script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
old2new_dir = os.path.join(workspace_dir, "scripts", "old2new-mapping")
sources_dir = os.path.join(script_dir, "translated_sources")
bundles_dir = os.path.join(script_dir, "translated_bundles")

# Load credentials
with open(os.path.join(old2new_dir, "api_token.txt")) as f:
    api_token = f.read().strip()

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

headers = {
    "api-token": api_token,
    "Content-Type": "application/json",
    "User-Agent": "PCEX-Collaborator-Updater/1.0"
}

def patch(endpoint, payload, max_retries=4):
    url = f"{BASE_URL}/{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode("utf-8") if e.fp else str(e)
            if status in (502, 503) and attempt < max_retries:
                wait = 5 * attempt
                print(f"    [{status}] Retry {attempt}/{max_retries-1} in {wait}s...")
                time.sleep(wait)
            else:
                return status, body
        except Exception as e:
            if attempt < max_retries:
                time.sleep(5 * attempt)
            else:
                return 0, str(e)
    return 0, "Max retries exceeded"

patch_payload = {
    "user": OWNER,
    "collaborator_emails": ["frg42@pitt.edu", NEW_COLLABORATOR]
}

# --- Sources ---
source_files = sorted(f for f in os.listdir(sources_dir) if f.endswith(".json"))
print(f"Updating {len(source_files)} sources...\n")

# Track which IDs have been confirmed on the server
confirmed_log = os.path.join(script_dir, "collaborator_update_confirmed.json")
confirmed = set()
if os.path.exists(confirmed_log):
    with open(confirmed_log) as f:
        confirmed = set(json.load(f))

def save_confirmed():
    with open(confirmed_log, "w") as f:
        json.dump(sorted(confirmed), f, indent=2)

source_ok = source_fail = source_skip = 0
for fname in source_files:
    fpath = os.path.join(sources_dir, fname)
    with open(fpath) as f:
        doc = json.load(f)
    src_id = doc["id"]

    # Skip if server already confirmed
    if src_id in confirmed:
        source_skip += 1
        print(f"  – Source {src_id} server-confirmed, skipping")
        continue

    # PATCH server (local file already has the new collaborator from first run)
    status, resp = patch(f"bulk/sources/{src_id}", patch_payload)
    if status in (200, 201):
        print(f"  ✓ Source {src_id} ({doc.get('name', '')[:50]})")
        confirmed.add(src_id)
        save_confirmed()
        source_ok += 1
    else:
        print(f"  ✗ Source {src_id} FAILED [{status}]: {resp[:120]}")
        source_fail += 1
    time.sleep(1.5)

# --- Bundles ---
bundle_files = sorted(f for f in os.listdir(bundles_dir) if f.endswith(".json"))
print(f"\nUpdating {len(bundle_files)} bundles...\n")

bundle_ok = bundle_fail = bundle_skip = 0
for fname in bundle_files:
    fpath = os.path.join(bundles_dir, fname)
    with open(fpath) as f:
        doc = json.load(f)
    bnd_id = doc["id"]

    # Skip if server already confirmed
    if bnd_id in confirmed:
        bundle_skip += 1
        print(f"  – Bundle {bnd_id} server-confirmed, skipping")
        continue

    # PATCH server (local file already has the new collaborator from first run)
    status, resp = patch(f"bulk/activities/{bnd_id}", patch_payload)
    if status in (200, 201):
        print(f"  ✓ Bundle {bnd_id} ({doc.get('name', '')[:50]})")
        confirmed.add(bnd_id)
        save_confirmed()
        bundle_ok += 1
    else:
        print(f"  ✗ Bundle {bnd_id} FAILED [{status}]: {resp[:120]}")
        bundle_fail += 1
    time.sleep(1.5)

print(f"""
========================================
DONE
  Sources: {source_ok} OK, {source_fail} failed, {source_skip} skipped
  Bundles: {bundle_ok} OK, {bundle_fail} failed, {bundle_skip} skipped
========================================
""")
