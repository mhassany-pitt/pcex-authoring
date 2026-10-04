#!/usr/bin/env python3
"""
Translates the remaining English PCEX sources associated with ahgamlo@kau.edu.sa
IN PLACE using the server-side translation API (POST /api/gpt-genai) so that
all translation prompt/response logs are recorded on the server under ${STORAGE_PATH}/gpt-genai/.
"""

import os
import sys
import json
import ssl
import time
import re
import urllib.request
import urllib.error
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
WORKSPACE_DIR = os.path.join(SCRIPT_DIR, 'translation-arabic-remaining')
BACKUP_DIR = os.path.join(WORKSPACE_DIR, 'source_backups')
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, 'translated_sources')
PROGRESS_FILE = os.path.join(WORKSPACE_DIR, 'progress.json')

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# Thread-safe lock for progress
progress_lock = Lock()

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

def create_authenticated_opener():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPSHandler(context=ssl_ctx)
    )
    with open(os.path.join(PROJECT_DIR, 'scripts', 'old2new-mapping', 'auth_credentials.json')) as f:
        creds = json.load(f)
    login_req = urllib.request.Request(
        f'{BASE_URL}/auth/login',
        data=json.dumps(creds).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    opener.open(login_req)
    return opener

def clean_delimiters(text):
    if not text or not isinstance(text, str):
        return text or ''
    idx = text.find('[[TASK-INSTRUCTIONS]]')
    if idx != -1:
        text = text[:idx]
    text = re.sub(r'\[\[[A-Z0-9_\-\.]+\]\].*$', '', text, flags=re.DOTALL)
    return text.strip()

def clean_title(text):
    t = clean_delimiters(text)
    t = re.sub(r'\s*\((?:clone|نسخة)\)', '', t, flags=re.IGNORECASE)
    return t.strip()

def translate_source(sid, total, current_counter, opener):
    # Load original source detail
    req = urllib.request.Request(f'{BASE_URL}/sources/{sid}')
    try:
        orig_src = json.loads(opener.open(req, timeout=40).read().decode('utf-8'))
    except Exception as e:
        return sid, False, f"Failed to fetch source: {e}"

    orig_name = orig_src.get('name', '')
    
    # Save original backup
    backup_file = os.path.join(BACKUP_DIR, f'{sid}.json')
    if not os.path.exists(backup_file):
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(orig_src, f, indent=2, ensure_ascii=False)

    lines_model = {}
    for ln_str, info in orig_src.get('lines', {}).items():
        if not ln_str.isdigit():
            continue
        comm_list = info.get('commentList', info.get('comments', []))
        clean_comments = []
        seen = set()
        for c in comm_list:
            c_text = c if isinstance(c, str) else c.get('content', '')
            if c_text and c_text not in seen:
                seen.add(c_text)
                clean_comments.append({'content': c_text})
        lines_model[str(ln_str)] = {'comments': clean_comments}

    dist_model = []
    for d in orig_src.get('distractors', []):
        d_code = d.get('code') or (d.get('line') or {}).get('content', '')
        d_desc = d.get('description') or ((d.get('line') or {}).get('commentList', [''])[0] if (d.get('line') or {}).get('commentList') else '')
        dist_model.append({'code': d_code, 'description': d_desc})

    payload = {
        'action': 'translate-model',
        'id': sid,
        'model': {
            'name': orig_name,
            'description': orig_src.get('description', ''),
            'code': orig_src.get('code', ''),
            'lines': lines_model,
            'distractors': dist_model
        },
        'translation': {
            'target_language': 'Arabic',
            'translate_classes': False,
            'translate_functions': False,
            'translate_variables': False,
            'translate_strings': True,
            'translate_comments': True
        }
    }

    t0 = time.time()
    trans_res = None
    last_err = None
    for attempt in range(3):
        try:
            req_gpt = urllib.request.Request(
                f'{BASE_URL}/gpt-genai',
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp_gpt = opener.open(req_gpt, timeout=180)
            trans_res = json.loads(resp_gpt.read().decode('utf-8'))
            break
        except Exception as e:
            last_err = e
            time.sleep(5 * (attempt + 1))

    if not trans_res:
        return sid, False, f"Server translation error: {last_err}"

    duration = time.time() - t0

    # Build updated fields for in-place patch
    trans_name = clean_title(trans_res.get('name') or orig_name)
    trans_desc = clean_delimiters(trans_res.get('description') or orig_src.get('description', ''))
    trans_code = trans_res.get('code') or orig_src.get('code', '')

    new_lines = dict(orig_src.get('lines', {}))
    for ln_str, orig_ln_data in orig_src.get('lines', {}).items():
        if not ln_str.isdigit():
            continue
        trans_ln_data = trans_res.get('lines', {}).get(str(ln_str), {})
        trans_comments = trans_ln_data.get('comments', [])
        combined_comments = []
        for tc in trans_comments:
            c_text = clean_delimiters(tc.get('content', ''))
            if c_text:
                combined_comments.append({'content': c_text})
        if combined_comments:
            if str(ln_str) not in new_lines:
                new_lines[str(ln_str)] = {}
            new_lines[str(ln_str)]['comments'] = combined_comments
            new_lines[str(ln_str)]['commentList'] = [c['content'] for c in combined_comments]

    new_distractors = list(orig_src.get('distractors', []))
    trans_distractors = trans_res.get('distractors', [])
    for d_idx, td in enumerate(trans_distractors):
        if d_idx < len(new_distractors):
            if td.get('code'):
                new_distractors[d_idx]['code'] = td.get('code')
            if td.get('description'):
                new_distractors[d_idx]['description'] = clean_delimiters(td.get('description'))

    tags = set(orig_src.get('tags', []))
    tags.add('arabic')
    tags.add('gpt-5-mini')
    tags.add('hai-translation')
    tags.discard('english')

    collabs = orig_src.get('collaborator_emails', [])
    if 'ahgamlo@kau.edu.sa' not in [c.lower() for c in collabs]:
        collabs.append('ahgamlo@kau.edu.sa')

    patch_payload = {
        'name': trans_name,
        'description': trans_desc,
        'code': trans_code,
        'lines': new_lines,
        'distractors': new_distractors,
        'iso_language_code': 'ar',
        'tags': list(tags),
        'collaborator_emails': collabs
    }

    # PATCH the source in place
    try:
        req_patch = urllib.request.Request(
            f'{BASE_URL}/sources/{sid}',
            data=json.dumps(patch_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        opener.open(req_patch, timeout=40)
    except Exception as e:
        return sid, False, f"Failed to PATCH source: {e}"

    # Save output copy locally
    out_file = os.path.join(OUTPUT_DIR, f'{sid}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({**orig_src, **patch_payload}, f, indent=2, ensure_ascii=False)

    return sid, True, {
        'orig_name': orig_name,
        'trans_name': trans_name,
        'duration': duration
    }

def main():
    print("=" * 70, flush=True)
    print("PCEX Authoring In-Place Translation Pipeline (Arabic / MSA)", flush=True)
    print("Model: gpt-5-mini-2025-08-07 via Server API (/api/gpt-genai)", flush=True)
    print("=" * 70, flush=True)

    opener = create_authenticated_opener()
    print("✓ Successfully authenticated with PCEX Authoring", flush=True)

    # Fetch sources list
    req_sources = urllib.request.Request(f'{BASE_URL}/sources')
    sources = json.loads(opener.open(req_sources).read().decode('utf-8'))
    
    target_user = 'ahgamlo@kau.edu.sa'
    target_sources = [s for s in sources if (s.get('user') or '').lower() == target_user.lower() or target_user.lower() in [c.lower() for c in (s.get('collaborator_emails') or [])]]

    arabic_regex = re.compile(r'[\u0600-\u06FF]')
    en_sources = [s for s in target_sources if not (arabic_regex.search(str(s.get('name', ''))) or arabic_regex.search(str(s.get('description', ''))) or s.get('iso_language_code') == 'ar')]

    total_sources = len(en_sources)
    print(f"✓ Found {total_sources} English sources to translate in place", flush=True)

    progress = load_progress()
    already_done = {sid for sid, p in progress.items() if p.get('status') == 'done'}
    to_translate = [s for s in en_sources if s['id'] not in already_done]

    print(f"✓ Already completed: {len(already_done)}")
    print(f"✓ Remaining to process: {len(to_translate)}\n", flush=True)

    if not to_translate:
        print("All sources are already translated! Proceeding to bundle updates...", flush=True)
    else:
        # Use 3 concurrent workers to balance speed and stability
        max_workers = 3
        print(f"Starting translation with {max_workers} concurrent workers...\n", flush=True)

        counter = len(already_done)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Each worker gets its own authenticated opener
            futures = {
                executor.submit(translate_source, s['id'], total_sources, counter, create_authenticated_opener()): s
                for s in to_translate
            }

            for future in as_completed(futures):
                s = futures[future]
                sid = s['id']
                try:
                    res_sid, success, info = future.result()
                    with progress_lock:
                        counter += 1
                        pct = (counter / total_sources) * 100
                        if success:
                            progress[res_sid] = {
                                'status': 'done',
                                'orig_name': info['orig_name'],
                                'trans_name': info['trans_name'],
                                'duration': round(info['duration'], 1),
                                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                            }
                            save_progress(progress)
                            print(f"[{counter:02d}/{total_sources}] ({pct:5.1f}%) ✓ {res_sid}: \"{info['orig_name']}\" -> \"{info['trans_name']}\" ({info['duration']:.1f}s)", flush=True)
                        else:
                            progress[res_sid] = {
                                'status': 'error',
                                'error': str(info),
                                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                            }
                            save_progress(progress)
                            print(f"[{counter:02d}/{total_sources}] ({pct:5.1f}%) ✗ {res_sid} failed: {info}", flush=True)
                except Exception as exc:
                    with progress_lock:
                        counter += 1
                        pct = (counter / total_sources) * 100
                        print(f"[{counter:02d}/{total_sources}] ({pct:5.1f}%) ✗ {sid} raised exception: {exc}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print("Source translations complete! Now updating bundles and previews...", flush=True)
    print("=" * 70, flush=True)

    # Bundle update phase
    req_bundles = urllib.request.Request(f'{BASE_URL}/bundles')
    bundles = json.loads(opener.open(req_bundles).read().decode('utf-8'))
    target_bundles = [b for b in bundles if (b.get('user') or '').lower() == target_user.lower() or target_user.lower() in [c.lower() for c in (b.get('collaborator_emails') or [])]]

    bundle_count = 0
    for b in target_bundles:
        bid = b['id']
        bname = b['name']
        items = b.get('items', [])
        # Check if bundle needs iso update to ar
        if b.get('iso_language_code') != 'ar':
            try:
                patch_b_req = urllib.request.Request(
                    f'{BASE_URL}/bundles/{bid}',
                    data=json.dumps({'iso_language_code': 'ar'}).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='PATCH'
                )
                opener.open(patch_b_req, timeout=30)
                print(f"  ✓ Updated bundle language code to 'ar': {bname} ({bid})", flush=True)
            except Exception as e:
                print(f"  ✗ Failed to update bundle {bname}: {e}", flush=True)

        # Trigger preview generation
        try:
            prev_req = urllib.request.Request(
                f'{BASE_URL}/bundles/{bid}/preview',
                data=json.dumps(b).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            opener.open(prev_req, timeout=60)
            bundle_count += 1
            print(f"  ✓ Compiled & generated preview for bundle: {bname} ({bid})", flush=True)
        except Exception as e:
            print(f"  ✗ Preview compilation failed for {bname}: {e}", flush=True)

    print(f"\n✓ Finished! Processed {bundle_count} bundles.", flush=True)

if __name__ == '__main__':
    main()
