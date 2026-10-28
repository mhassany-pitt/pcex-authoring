#!/usr/bin/env python3
"""
Adds rah225@pitt.edu as a collaborator to all SQL sources and bundles in PCEX Authoring tool.
Performs strictly metadata updates via /api/bulk endpoints with compile=false.
"""

import sys
import json
import time
import ssl
import urllib.request
import urllib.error

BASE_URL = 'http://adapt2.sis.pitt.edu/pcex-authoring/api'
NEW_COLLABORATOR = 'rah225@pitt.edu'
TOKEN = open('pcex-storage/authorized-api-tokens.txt').read().strip()

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

headers = {
    'api-token': TOKEN,
    'Content-Type': 'application/json',
    'User-Agent': 'PCEX-Collaborator-Updater/1.0'
}

def patch(endpoint, payload, max_retries=4):
    url = f"{BASE_URL}/{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                return resp.status, resp.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode('utf-8') if e.fp else str(e)
            if status in (502, 503) and attempt < max_retries:
                wait = 3 * attempt
                print(f"    [{status}] Retry {attempt}/{max_retries-1} in {wait}s...", flush=True)
                time.sleep(wait)
            else:
                return status, body
        except Exception as e:
            if attempt < max_retries:
                time.sleep(3 * attempt)
            else:
                return 0, str(e)
    return 0, "Max retries exceeded"

def main():
    print("1. Authenticating to fetch fresh backup data...", flush=True)
    with open('scripts/old2new-mapping/auth_credentials.json') as f:
        creds = json.load(f)

    cj = urllib.request.HTTPCookieProcessor()
    opener = urllib.request.build_opener(cj, urllib.request.HTTPSHandler(context=ssl_ctx))
    opener.open(urllib.request.Request(
        f'{BASE_URL}/auth/login',
        data=json.dumps(creds).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    ))

    backup_data = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/backup')).read().decode('utf-8'))
    sources = backup_data.get('sources', [])
    activities = backup_data.get('activities', [])

    sql_sources = [
        s for s in sources 
        if (s.get('user') == 'moh70@pitt.edu' or 'moh70@pitt.edu' in s.get('collaborator_emails', []))
        and str(s.get('language')).upper() == 'SQL'
    ]

    sql_bundles = [
        a for a in activities 
        if (a.get('user') == 'moh70@pitt.edu' or 'moh70@pitt.edu' in a.get('collaborator_emails', []))
        and (
            any(it.get('details', {}).get('language') == 'SQL' for it in a.get('items', []))
            or 'sql' in str(a.get('name', '')).lower()
        )
    ]

    print(f"Found {len(sql_sources)} SQL sources and {len(sql_bundles)} SQL bundles to update.", flush=True)

    # 1. Update Bundles
    print("\n--- Updating SQL Bundles ---", flush=True)
    bundle_ok = bundle_skip = bundle_fail = 0
    for idx, b in enumerate(sql_bundles, 1):
        b_id = b['id']
        current_collabs = b.get('collaborator_emails', []) or []
        if NEW_COLLABORATOR in current_collabs:
            print(f"[{idx}/{len(sql_bundles)}] Bundle {b_id} ('{b.get('name')}') already has {NEW_COLLABORATOR}. Skipping.", flush=True)
            bundle_skip += 1
            continue

        new_collabs = list(dict.fromkeys(current_collabs + [NEW_COLLABORATOR]))
        payload = {
            'user': b['user'],
            'collaborator_emails': new_collabs,
            'compile': False
        }
        status, resp = patch(f"bulk/activities/{b_id}?compile=false", payload)
        if status in (200, 201):
            print(f"[{idx}/{len(sql_bundles)}] ✓ Bundle {b_id} ('{b.get('name')}') updated -> {new_collabs}", flush=True)
            bundle_ok += 1
        else:
            print(f"[{idx}/{len(sql_bundles)}] ✗ Bundle {b_id} FAILED [{status}]: {resp}", flush=True)
            bundle_fail += 1
        time.sleep(0.2)

    # 2. Update Sources
    print("\n--- Updating SQL Sources ---", flush=True)
    src_ok = src_skip = src_fail = 0
    for idx, s in enumerate(sql_sources, 1):
        s_id = s['id']
        current_collabs = s.get('collaborator_emails', []) or []
        if NEW_COLLABORATOR in current_collabs:
            print(f"[{idx:3d}/{len(sql_sources)}] Source {s_id} ('{s.get('name', '')[:40]}') already has {NEW_COLLABORATOR}. Skipping.", flush=True)
            src_skip += 1
            continue

        new_collabs = list(dict.fromkeys(current_collabs + [NEW_COLLABORATOR]))
        payload = {
            'user': s['user'],
            'collaborator_emails': new_collabs,
            'compile': False
        }
        status, resp = patch(f"bulk/sources/{s_id}?compile=false", payload)
        if status in (200, 201):
            print(f"[{idx:3d}/{len(sql_sources)}] ✓ Source {s_id} ('{s.get('name', '')[:40]}') updated -> {new_collabs}", flush=True)
            src_ok += 1
        else:
            print(f"[{idx:3d}/{len(sql_sources)}] ✗ Source {s_id} FAILED [{status}]: {resp}", flush=True)
            src_fail += 1
        time.sleep(0.15)

    print(f"\nUpdate Summary:", flush=True)
    print(f"  Bundles: {bundle_ok} updated, {bundle_skip} skipped, {bundle_fail} failed (Total: {len(sql_bundles)})", flush=True)
    print(f"  Sources: {src_ok} updated, {src_skip} skipped, {src_fail} failed (Total: {len(sql_sources)})", flush=True)

    # 3. Verification
    print("\n--- Verifying All Items On Server ---", flush=True)
    time.sleep(1.0)
    verify_backup = json.loads(opener.open(urllib.request.Request(f'{BASE_URL}/backup')).read().decode('utf-8'))
    v_sources = {s['id']: s for s in verify_backup.get('sources', [])}
    v_activities = {a['id']: a for a in verify_backup.get('activities', [])}

    missing_bundle_collabs = []
    for b in sql_bundles:
        vb = v_activities.get(b['id'], {})
        if NEW_COLLABORATOR not in (vb.get('collaborator_emails', []) or []):
            missing_bundle_collabs.append(b['id'])

    missing_source_collabs = []
    for s in sql_sources:
        vs = v_sources.get(s['id'], {})
        if NEW_COLLABORATOR not in (vs.get('collaborator_emails', []) or []):
            missing_source_collabs.append(s['id'])

    if not missing_bundle_collabs and not missing_source_collabs:
        print(f"✓ VERIFICATION SUCCESS: All {len(sql_bundles)} SQL bundles and {len(sql_sources)} SQL sources confirmed to have '{NEW_COLLABORATOR}' in collaborator_emails!", flush=True)
    else:
        print(f"✗ VERIFICATION WARNING: Missing in bundles: {missing_bundle_collabs}, sources: {missing_source_collabs}", flush=True)

if __name__ == '__main__':
    main()
