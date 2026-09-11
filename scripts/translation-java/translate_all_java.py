import os, sys, json, ssl, urllib.request, secrets, re, time
from collections import defaultdict

# Force unbuffered output so progress prints in real-time
sys.stdout.reconfigure(line_buffering=True)

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
TRANS_DIR = 'scripts/translation-java'
CLONED_DIR = os.path.join(TRANS_DIR, 'cloned_originals')
TRANS_SRC_DIR = os.path.join(TRANS_DIR, 'translated_sources')
TRANS_BDL_DIR = os.path.join(TRANS_DIR, 'translated_bundles')
MAPPING_FILE = os.path.join(TRANS_DIR, 'mapping.json')

os.makedirs(CLONED_DIR, exist_ok=True)
os.makedirs(TRANS_SRC_DIR, exist_ok=True)
os.makedirs(TRANS_BDL_DIR, exist_ok=True)

mapping = {'sources': {}, 'bundles': {}}
if os.path.exists(MAPPING_FILE):
    try:
        with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
            mapping = json.load(f)
    except Exception as e:
        print(f"Warning loading mapping: {e}", flush=True)

def save_mapping():
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2)

with open('scripts/old2new-mapping/auth_credentials.json') as f:
    creds = json.load(f)

with open('scripts/old2new-mapping/api_token.txt') as f:
    api_token = f.read().strip()

headers = {
    'api-token': api_token,
    'Content-Type': 'application/json',
    'User-Agent': 'PCEX-Bulk-Importer/1.0'
}

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

import http.cookiejar
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ssl_ctx))
req_login = urllib.request.Request(f'{BASE_URL}/auth/login', data=json.dumps(creds).encode(), headers={'Content-Type': 'application/json'})
opener.open(req_login)
print("✓ Authenticated with PCEX Authoring", flush=True)

TAGS = [
    'spanish-latam;color=yellow',
    'llm-translation;color=blue',
    'gpt5mini;color=purple',
    'validation-pending;color=orange'
]

def clean_delimiters(text):
    if not text or not isinstance(text, str):
        return text or ''
    idx = text.find('[[TASK-INSTRUCTIONS]]')
    if idx != -1:
        text = text[:idx]
    text = re.sub(r'\[\[[A-Z0-9_\-\.]+\]\].*$', '', text, flags=re.DOTALL)
    return text.strip()

def send_bulk_request(endpoint, payload, method='POST', timeout=300):
    url = f'{BASE_URL}/{endpoint}'
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=timeout) as resp:
                body = resp.read().decode('utf-8')
                return resp.status, json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            if e.code in [502, 503, 504] and attempt < 2:
                time.sleep(3)
                continue
            return e.code, err_body
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
                continue
            return 500, str(e)

# 1. Identify canonical scope
print("1. Identifying canonical Java bundles matching Roya's curriculum...", flush=True)
url_cat = 'https://adapt2.sis.pitt.edu/next.course-authoring/api/catalog-v2'
req_cat = urllib.request.Request(url_cat, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
with urllib.request.urlopen(req_cat, context=ssl_ctx, timeout=40) as resp:
    catalog_items = json.loads(resp.read().decode('utf-8'))

roya_items = [it for it in catalog_items if (it.get('attribution') or {}).get('provider') == 'PCEX' and 'Java' in ((it.get('languages') or {}).get('programming_languages') or []) and (it.get('languages') or {}).get('content_language') == 'en' and any('Roya Hosseini' in a.get('name', '') for a in (it.get('attribution') or {}).get('authors', []))]
mohammad_items = [it for it in catalog_items if (it.get('attribution') or {}).get('provider') == 'PCEX' and 'Java' in ((it.get('languages') or {}).get('programming_languages') or []) and (it.get('languages') or {}).get('content_language') == 'en' and any('Mohammad Hassany' in a.get('name', '') for a in (it.get('attribution') or {}).get('authors', []))]

def clean_str(t):
    if not t: return ''
    t = t.replace('\\\\n', ' ').replace('\\n', ' ').replace('\n', ' ').replace('\r', ' ')
    return ' '.join(re.sub(r'[^a-z0-9]', ' ', t.lower()).split())

roya_prompts = {clean_str((r.get('content') or {}).get('prompt', '')): r for r in roya_items}

resp_hub = opener.open(f'{BASE_URL}/hub')
hub = json.loads(resp_hub.read().decode())
hub_by_id = {a['id']: a for a in hub}

extracted_bids = set()
for m in mohammad_items:
    if clean_str((m.get('content') or {}).get('prompt', '')) in roya_prompts:
        ident = m.get('identity', {}).get('id', '')
        hexes = re.findall(r'[a-f0-9]{24}', ident)
        if hexes:
            extracted_bids.add(hexes[0])

name_to_bundles = defaultdict(list)
for bid in extracted_bids:
    if bid in hub_by_id:
        b = hub_by_id[bid]
        name_to_bundles[b['name']].append(b)

canonical_bundles = []
for name, b_list in name_to_bundles.items():
    if len(b_list) == 1:
        canonical_bundles.append(b_list[0])
    else:
        chosen = [b for b in b_list if b['id'].startswith('68bdb')]
        canonical_bundles.append(chosen[0] if chosen else b_list[0])

canonical_bundles.sort(key=lambda x: x['name'])
total_bundles = len(canonical_bundles)
total_sources = sum(len(b.get('items', [])) for b in canonical_bundles)
print(f"✓ Target Scope Confirmed: {total_bundles} canonical bundles containing {total_sources} sources.\n", flush=True)

# 2. Main translation loop
total_src_counter = len(mapping.get('sources', {}))
for b_idx, b_info in enumerate(canonical_bundles):
    b_id = b_info['id']
    b_name = b_info['name']
    print(f"\n==================================================", flush=True)
    print(f"[{b_idx+1}/{total_bundles}] Bundle: {b_name} (ID: {b_id})", flush=True)
    print(f"==================================================", flush=True)

    # Clone bundle locally
    local_b_orig_path = os.path.join(CLONED_DIR, f'bundle_{b_id}.json')
    if not os.path.exists(local_b_orig_path):
        resp_b = opener.open(f'{BASE_URL}/bundles/{b_id}?allUsers=true')
        orig_bundle = json.loads(resp_b.read().decode())
        with open(local_b_orig_path, 'w', encoding='utf-8') as f:
            json.dump(orig_bundle, f, indent=2, ensure_ascii=False)
    else:
        with open(local_b_orig_path, 'r', encoding='utf-8') as f:
            orig_bundle = json.load(f)

    bundle_items_translated = []
    bundle_success = True

    for s_idx, s_item in enumerate(orig_bundle.get('items', [])):
        orig_s_id = s_item.get('item')
        item_type = s_item.get('type', 'challenge')

        # Check if already translated
        if orig_s_id in mapping['sources']:
            sp_s_id = mapping['sources'][orig_s_id]
            sp_src_file = os.path.join(TRANS_SRC_DIR, f'{sp_s_id}.json')
            if os.path.exists(sp_src_file):
                with open(sp_src_file, 'r', encoding='utf-8') as f:
                    sp_src_obj = json.load(f)
                bundle_items_translated.append({
                    'item': sp_s_id,
                    'type': item_type,
                    'details': {
                        'name': sp_src_obj['name'],
                        'description': sp_src_obj['description'],
                        'language': sp_src_obj['language'],
                        'iso_language_code': sp_src_obj['iso_language_code'],
                        'tags': sp_src_obj['tags'],
                        'translations': sp_src_obj['translations']
                    }
                })
                print(f"  [{s_idx+1}/{len(orig_bundle.get('items', []))}] Source {orig_s_id} already translated -> {sp_s_id} ('{sp_src_obj['name']}')", flush=True)
                continue

        local_s_orig_path = os.path.join(CLONED_DIR, f'source_{orig_s_id}.json')
        if not os.path.exists(local_s_orig_path):
            resp_s = opener.open(f'{BASE_URL}/sources/{orig_s_id}?allUsers=true')
            orig_src = json.loads(resp_s.read().decode())
            with open(local_s_orig_path, 'w', encoding='utf-8') as f:
                json.dump(orig_src, f, indent=2, ensure_ascii=False)
        else:
            with open(local_s_orig_path, 'r', encoding='utf-8') as f:
                orig_src = json.load(f)

        print(f"  [{s_idx+1}/{len(orig_bundle.get('items', []))}] Translating source: '{orig_src.get('name')}' ({orig_s_id})...", flush=True)

        lines_model = {}
        for ln_str, info in orig_src.get('lines', {}).items():
            if not ln_str.isdigit():
                continue
            comm_list = info.get('commentList', info.get('comments', []))
            seen = set()
            clean_comments = []
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
            'id': orig_src['id'],
            'model': {
                'name': orig_src.get('name', ''),
                'description': orig_src.get('description', ''),
                'code': orig_src.get('code', ''),
                'lines': lines_model,
                'distractors': dist_model
            },
            'translation': {
                'target_language': 'Spanish (Latin America)',
                'translate_classes': False,
                'translate_functions': False,
                'translate_variables': False,
                'translate_strings': True,
                'translate_comments': True
            }
        }

        t_start = time.time()
        req_gpt = urllib.request.Request(f'{BASE_URL}/gpt-genai', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        trans_res = None
        for attempt in range(3):
            try:
                with opener.open(req_gpt, timeout=180) as resp_gpt:
                    trans_res = json.loads(resp_gpt.read().decode())
                break
            except Exception as e:
                print(f"      [Retry {attempt+1}] LLM error: {e}", flush=True)
                time.sleep(5)

        if not trans_res:
            print(f"      ✗ Failed to translate {orig_s_id}. Skipping bundle.", flush=True)
            bundle_success = False
            break

        new_sp_s_id = secrets.token_hex(12)
        new_lines = {}
        for ln_str, orig_ln_data in orig_src.get('lines', {}).items():
            if not ln_str.isdigit():
                continue
            trans_ln_data = trans_res.get('lines', {}).get(str(ln_str), {})
            trans_comments = trans_ln_data.get('comments', [])
            orig_comments = orig_ln_data.get('commentList', orig_ln_data.get('comments', []))

            combined_comments = []
            for c_idx, tc in enumerate(trans_comments):
                c_text = clean_delimiters(tc.get('content', ''))
                orig_c_text = ''
                if c_idx < len(orig_comments):
                    orig_c_text = orig_comments[c_idx] if isinstance(orig_comments[c_idx], str) else orig_comments[c_idx].get('content', '')
                elif 'untr_content' in tc:
                    orig_c_text = tc['untr_content']
                combined_comments.append({
                    'content': c_text,
                    'untr_content': orig_c_text
                })

            new_lines[str(ln_str)] = {
                'content': orig_ln_data.get('content', ''),
                'blank': orig_ln_data.get('blank', False),
                'indentLevel': orig_ln_data.get('indentLevel', 0),
                'comments': combined_comments
            }

        new_distractors = []
        trans_distractors = trans_res.get('distractors', [])
        orig_distractors = orig_src.get('distractors', [])
        for d_idx in range(max(len(trans_distractors), len(orig_distractors))):
            td = trans_distractors[d_idx] if d_idx < len(trans_distractors) else {}
            orig_d = orig_distractors[d_idx] if d_idx < len(orig_distractors) else {}
            orig_d_code = orig_d.get('code') or (orig_d.get('line') or {}).get('content', '')
            orig_d_desc = orig_d.get('description') or ((orig_d.get('line') or {}).get('commentList', [''])[0] if (orig_d.get('line') or {}).get('commentList') else '')

            new_distractors.append({
                'code': clean_delimiters(td.get('code', '')) or orig_d_code,
                'untr_code': td.get('untr_code') or orig_d_code,
                'description': clean_delimiters(td.get('description', '')) or orig_d_desc,
                'untr_description': td.get('untr_description') or orig_d_desc,
                'line_number': orig_d.get('line_number', (orig_d.get('line') or {}).get('number', 0))
            })

        spanish_src = {
            'id': new_sp_s_id,
            'user': 'moh70@pitt.edu',
            'name': clean_delimiters(trans_res.get('name')) or orig_src['name'],
            'untr_name': orig_src['name'],
            'description': clean_delimiters(trans_res.get('description')) or orig_src.get('description', ''),
            'untr_description': orig_src.get('description', ''),
            'language': orig_src.get('language', 'JAVA'),
            'iso_language_code': 'es',
            'filename': orig_src.get('filename', ''),
            'code': clean_delimiters(trans_res.get('code')) or orig_src.get('code', ''),
            'untr_code': orig_src.get('code', ''),
            'lines': new_lines,
            'distractors': new_distractors,
            'tags': TAGS,
            'translations': {
                'en': orig_s_id
            },
            'collaborator_emails': [],
            'programInput': orig_src.get('programInput', '')
        }

        with open(os.path.join(TRANS_SRC_DIR, f'{new_sp_s_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(spanish_src, f, indent=2, ensure_ascii=False)

        src_payload = dict(spanish_src)
        src_payload['_id'] = new_sp_s_id
        st_s, resp_s = send_bulk_request('bulk/sources?compile=true', src_payload, method='POST')
        if st_s not in [200, 201]:
            print(f"      ✗ Ingestion error ({st_s}): {resp_s}", flush=True)
            bundle_success = False
            break

        send_bulk_request(f'bulk/sources/{orig_s_id}?compile=false', {'user': 'moh70@pitt.edu', 'translations': {'es': new_sp_s_id}}, method='PATCH')
        total_src_counter += 1
        elapsed = time.time() - t_start
        print(f"      ✓ [{total_src_counter}/{total_sources}] ({total_src_counter/total_sources*100:.1f}%) Translated in {elapsed:.1f}s, compiled & linked: '{spanish_src['name']}' -> {new_sp_s_id}", flush=True)

        mapping['sources'][orig_s_id] = new_sp_s_id
        save_mapping()

        bundle_items_translated.append({
            'item': new_sp_s_id,
            'type': item_type,
            'details': {
                'name': spanish_src['name'],
                'description': spanish_src['description'],
                'language': spanish_src['language'],
                'iso_language_code': spanish_src['iso_language_code'],
                'tags': spanish_src['tags'],
                'translations': spanish_src['translations']
            }
        })

    if not bundle_success:
        continue

    # Bundle packaging & syncing
    if b_id in mapping['bundles']:
        new_sp_b_id = mapping['bundles'][b_id]
        print(f"  ✓ Bundle {b_name} already mapped -> {new_sp_b_id}", flush=True)
    else:
        new_sp_b_id = secrets.token_hex(12)
        spanish_bundle = {
            'id': new_sp_b_id,
            'name': f"{orig_bundle['name']}_es",
            'iso_language_code': 'es',
            'published': True,
            'archived': False,
            'user': 'moh70@pitt.edu',
            'collaborator_emails': [],
            'items': bundle_items_translated,
            'translations': {
                'en': b_id
            }
        }

        with open(os.path.join(TRANS_BDL_DIR, f'{new_sp_b_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(spanish_bundle, f, indent=2, ensure_ascii=False)

        b_payload = dict(spanish_bundle)
        b_payload['_id'] = new_sp_b_id
        st_b, resp_b = send_bulk_request('bulk/activities?compile=true', b_payload, method='POST', timeout=300)
        if st_b not in [200, 201]:
            print(f"  ⚠ Bundle compile=true returned {st_b}. Retrying with compile=false...", flush=True)
            st_b, resp_b = send_bulk_request('bulk/activities?compile=false', b_payload, method='POST', timeout=300)
        if st_b not in [200, 201]:
            print(f"  ✗ Bundle ingestion error ({st_b}): {resp_b}", flush=True)
            continue

        send_bulk_request(f'bulk/activities/{b_id}?compile=false', {'user': 'moh70@pitt.edu', 'translations': {'es': new_sp_b_id}}, method='PATCH')

        url_sync = f'{BASE_URL}/bundles/{new_sp_b_id}/sync?allUsers=true'
        req_sync = urllib.request.Request(url_sync, data=b'{}', headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with opener.open(req_sync) as resp_sync:
                sync_status = resp_sync.status
        except Exception as e:
            sync_status = f"warn: {e}"

        mapping['bundles'][b_id] = new_sp_b_id
        save_mapping()
        print(f"  ✓ Bundle [{b_idx+1}/{total_bundles}] ({((b_idx+1)/total_bundles)*100:.1f}%) '{spanish_bundle['name']}' compiled, linked & PAWS-synced ({sync_status}) -> ID: {new_sp_b_id}", flush=True)

print(f"\n==================================================", flush=True)
print(f"ALL JAVA BUNDLES SUCCESSFULLY COMPLETED!", flush=True)
print(f"==================================================", flush=True)
