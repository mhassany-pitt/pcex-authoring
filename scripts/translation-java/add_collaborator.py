#!/usr/bin/env python3
"""
Adds frg42@pitt.edu as a collaborator to all translated sources and bundles
in translation-java. Updates local JSON files and PATCHes the server (no compile).
"""

import os, json, ssl, urllib.request, urllib.error, http.cookiejar, time, glob

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
OWNER = 'moh70@pitt.edu'
NEW_COLLABORATOR = 'frg42@pitt.edu'

script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_dir = os.path.abspath(os.path.join(script_dir, '..', '..'))
old2new_dir = os.path.join(workspace_dir, 'scripts', 'old2new-mapping')
sources_dir = os.path.join(script_dir, 'translated_sources')
bundles_dir = os.path.join(script_dir, 'translated_bundles')

with open(os.path.join(old2new_dir, 'auth_credentials.json')) as f:
    creds = json.load(f)
with open(os.path.join(old2new_dir, 'api_token.txt')) as f:
    api_token = f.read().strip()

headers = {
    'api-token': api_token,
    'Content-Type': 'application/json',
    'User-Agent': 'PCEX-Collaborator-Updater/1.0'
}

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ssl_ctx)
)
opener.open(urllib.request.Request(
    f'{BASE_URL}/auth/login',
    data=json.dumps(creds).encode(),
    headers={'Content-Type': 'application/json'}
))
print('✓ Authenticated with PCEX Authoring', flush=True)

def patch(endpoint, payload, max_retries=4):
    url = f'{BASE_URL}/{endpoint}'
    data = json.dumps(payload).encode('utf-8')
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=90) as resp:
                return resp.status, resp.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode('utf-8') if e.fp else str(e)
            if status in (502, 503) and attempt < max_retries:
                wait = 5 * attempt
                print(f'    [{status}] Retry {attempt}/{max_retries-1} in {wait}s...', flush=True)
                time.sleep(wait)
            else:
                return status, body
        except Exception as e:
            if attempt < max_retries:
                time.sleep(5 * attempt)
            else:
                return 0, str(e)
    return 0, 'Max retries exceeded'

# Confirmed-IDs log for resumability
confirmed_log = os.path.join(script_dir, 'collaborator_update_confirmed.json')
confirmed = set()
if os.path.exists(confirmed_log):
    with open(confirmed_log) as f:
        confirmed = set(json.load(f))

def save_confirmed():
    with open(confirmed_log, 'w') as f:
        json.dump(sorted(confirmed), f, indent=2)

# --- Sources ---
source_files = sorted(f for f in os.listdir(sources_dir) if f.endswith('.json'))
print(f'\nUpdating {len(source_files)} sources...\n', flush=True)
source_ok = source_fail = source_skip = 0

for fname in source_files:
    fpath = os.path.join(sources_dir, fname)
    with open(fpath) as f:
        doc = json.load(f)
    src_id = doc['id']

    if src_id in confirmed:
        source_skip += 1
        print(f'  – {src_id} already confirmed, skipping', flush=True)
        continue

    # Update local file
    collaborators = doc.get('collaborator_emails', [])
    if NEW_COLLABORATOR not in collaborators:
        collaborators.append(NEW_COLLABORATOR)
        doc['collaborator_emails'] = collaborators
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)

    payload = {'user': OWNER, 'collaborator_emails': collaborators}
    status, resp = patch(f'bulk/sources/{src_id}', payload)
    if status in (200, 201):
        print(f'  ✓ [{status}] {src_id}  {doc.get("name", "")[:55]}', flush=True)
        confirmed.add(src_id)
        save_confirmed()
        source_ok += 1
    else:
        print(f'  ✗ [{status}] {src_id}  {resp[:100]}', flush=True)
        source_fail += 1
    time.sleep(0.3)

# --- Bundles ---
bundle_files = sorted(f for f in os.listdir(bundles_dir) if f.endswith('.json'))
print(f'\nUpdating {len(bundle_files)} bundles...\n', flush=True)
bundle_ok = bundle_fail = bundle_skip = 0

for fname in bundle_files:
    fpath = os.path.join(bundles_dir, fname)
    with open(fpath) as f:
        doc = json.load(f)
    bnd_id = doc['id']

    if bnd_id in confirmed:
        bundle_skip += 1
        print(f'  – {bnd_id} already confirmed, skipping', flush=True)
        continue

    collaborators = doc.get('collaborator_emails', [])
    if NEW_COLLABORATOR not in collaborators:
        collaborators.append(NEW_COLLABORATOR)
        doc['collaborator_emails'] = collaborators
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)

    payload = {'user': OWNER, 'collaborator_emails': collaborators}
    status, resp = patch(f'bulk/activities/{bnd_id}?compile=false', payload)
    if status in (200, 201):
        print(f'  ✓ [{status}] {bnd_id}  {doc.get("name", "")[:55]}', flush=True)
        confirmed.add(bnd_id)
        save_confirmed()
        bundle_ok += 1
    else:
        print(f'  ✗ [{status}] {bnd_id}  {resp[:100]}', flush=True)
        bundle_fail += 1
    time.sleep(0.3)

print(f"""
========================================
DONE
  Sources : {source_ok} OK, {source_fail} failed, {source_skip} skipped
  Bundles : {bundle_ok} OK, {bundle_fail} failed, {bundle_skip} skipped
========================================
""", flush=True)
