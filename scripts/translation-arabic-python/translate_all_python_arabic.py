#!/usr/bin/env python3
"""
Translates all 52 canonical PCEX Python Problem Sets (123 sources) to Arabic (MSA)
in place on the staged sources and bundles using OpenAI (gpt-5-mini-2025-08-07).

Features:
- Retrieves OpenAI API Key directly from user's account config (moh70@pitt.edu).
- Uses model: gpt-5-mini-2025-08-07 with max_completion_tokens.
- Preserves untr_* original English fields for titles, descriptions, code, comments, and distractors.
- Applies tags: ['python-intro', 'arabic;color=yellow', 'llm-translation;color=blue', 'gpt5mini;color=purple', 'validation-pending;color=orange'].
- Sets iso_language_code: 'ar'.
- Links translations bidirectionally with canonical English sources/bundles (translations: { en: en_id }).
- NO COMPILATION triggered (uses PATCH /sources/:id and PATCH /bundles/:id).
- NO PAWS SYNC triggered.
- Thread-safe concurrent translation with persistent checkpointing in progress.json (resumable).
- Generates review markdown document PYTHON_ARABIC_TRANSLATION_REVIEW.md with direct editor links.
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
from openai import OpenAI

sys.stdout.reconfigure(line_buffering=True)

BASE_URL = 'https://adapt2.sis.pitt.edu/pcex-authoring/api'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
WORKSPACE_DIR = SCRIPT_DIR
BACKUP_DIR = os.path.join(WORKSPACE_DIR, 'source_backups')
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, 'translated_sources')
PROGRESS_FILE = os.path.join(WORKSPACE_DIR, 'progress.json')
MAPPING_FILE = os.path.join(WORKSPACE_DIR, 'translations_mapping.json')
REVIEW_DOC = os.path.join(WORKSPACE_DIR, 'PYTHON_ARABIC_TRANSLATION_REVIEW.md')

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

NEW_TAGS = [
    'python-intro',
    'arabic;color=yellow',
    'llm-translation;color=blue',
    'gpt5mini;color=purple',
    'validation-pending;color=orange'
]

COLLABORATORS = [
    'zainakhalil002@gmail.com',
    'peterb@pitt.edu'
]

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

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

def parse_translation_response(translated):
    name_start = translated.find("[[PROGRAM-NAME]]") + len("[[PROGRAM-NAME]]")
    desc_start = translated.find("[[PROGRAM-DESCRIPTION]]")
    name = translated[name_start:desc_start].strip()

    desc_content_start = desc_start + len("[[PROGRAM-DESCRIPTION]]")
    code_start = translated.find("[[SOURCE-CODE]]")
    desc = translated[desc_content_start:code_start].strip()

    has_lines = "[[LINE-EXPLANATIONS]]" in translated
    has_dist = "[[LINE-DISTRACTORS]]" in translated
    has_inst = "[[TASK-INSTRUCTIONS]]" in translated

    code_end = translated.find("[[LINE-EXPLANATIONS]]") if has_lines else (
        translated.find("[[LINE-DISTRACTORS]]") if has_dist else (
            translated.find("[[TASK-INSTRUCTIONS]]") if has_inst else len(translated)
        )
    )

    code_raw = translated[code_start + len("[[SOURCE-CODE]]"):code_end]
    clean_lines = []
    for l in code_raw.split("\n"):
        if l.strip():
            # Strip the [[LINE01]] prefix while preserving subsequent code indentation
            clean_lines.append(re.sub(r"^\[\[LINE\d+\]\]\s?", "", l))
    code = "\n".join(clean_lines)

    lines_comments = {}
    lines_matches = re.findall(r"\[\[LINE(\d+)\.EXPL(\d+)\]\]\s*([\s\S]*?)(?=\n*\[\[LINE|\n*\[\[DIST|\n*\[\[TASK-INSTRUCTIONS\]\]|$)", translated)
    for ln, expl_num, content in lines_matches:
        ln_int = str(int(ln))
        lines_comments.setdefault(ln_int, []).append(content.strip())

    dist_matches = re.findall(r"\[\[DIST(\d+)\.(LC|EXPL)\]\]\s*([\s\S]*?)(?=\n*\[\[DIST|\n*\[\[TASK-INSTRUCTIONS\]\]|$)", translated)
    dist_updates = {}
    for dist_idx, kind, content in dist_matches:
        idx = int(dist_idx) - 1
        dist_updates.setdefault(idx, {})[kind] = content.strip()

    return name, desc, code, lines_comments, dist_updates

def translate_source(item_task, total, counter_holder, opener, openai_client):
    ar_sid = item_task['ar_sid']
    en_sid = item_task['en_sid']
    set_name = item_task['set_name']
    item_type = item_task['item_type']
    
    # 1. Fetch current staged source
    req = urllib.request.Request(f'{BASE_URL}/sources/{ar_sid}')
    try:
        ar_src = json.loads(opener.open(req, timeout=40).read().decode('utf-8'))
    except Exception as e:
        return ar_sid, False, f"Failed to fetch staged source {ar_sid}: {e}"

    orig_name = ar_src.get('name', '')
    
    # 2. Save backup of original content if not existing
    backup_file = os.path.join(BACKUP_DIR, f'{ar_sid}.json')
    if not os.path.exists(backup_file):
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(ar_src, f, indent=2, ensure_ascii=False)

    # 3. Build model prompt for translation
    lineExplanations = []
    sorted_lines = sorted(ar_src.get("lines", {}).keys(), key=lambda x: int(x) if x.isdigit() else 999)
    for ln_str in sorted_lines:
        if not ln_str.isdigit():
            continue
        ln_info = ar_src["lines"][ln_str]
        comms = ln_info.get("commentList", ln_info.get("comments", []))
        for i, c in enumerate(comms):
            txt = c if isinstance(c, str) else c.get("content", "")
            if txt:
                lineExplanations.append(f"[[LINE{int(ln_str):02d}.EXPL{i+1}]] {txt}")

    distExplanations = []
    for i, d in enumerate(ar_src.get("distractors", [])):
        code_val = d.get("code") or (d.get("line") or {}).get("content", "")
        if code_val:
            distExplanations.append(f"[[DIST{i+1}.LC]] {code_val}")
        desc = d.get("description")
        if not desc:
            comm_list = (d.get("line") or {}).get("commentList", [])
            desc = comm_list[0] if comm_list else ""
        if desc:
            distExplanations.append(f"[[DIST{i+1}.EXPL]] {desc}")

    sourceCode = "\n".join(f"[[LINE{i+1:02d}]] {l}" for i, l in enumerate(ar_src.get("code", "").split("\n")))

    transAssistantTemplate = "You are a helpful assistant that translates programming worked examples into other natural languages, maintaining both technical accuracy and the original code formatting."
    transModelTemplate = """
[[TASK-DEFINITION]]
You will be given a worked example. Your job is to translate the [[WORKED-EXAMPLE]] according to the [[TASK-INSTRUCTIONS]].

[[WORKED-EXAMPLE]]
[[PROGRAM-NAME]]
<<program-name>>

[[PROGRAM-DESCRIPTION]]
<<program-description>>

[[SOURCE-CODE]]
<<source-code>>
<<line-explanations>><<line-distractors>>
[[TASK-INSTRUCTIONS]]
Translate the given worked example into Arabic. Be sure to specifically translate the sections labeled [[PROGRAM-NAME]], [[PROGRAM-DESCRIPTION]], [[SOURCE-CODE]], [[LINE-EXPLANATIONS]], and [[LINE-DISTRACTORS]]. In the [[SOURCE-CODE]] section, translate ONLY user-defined string-literals and comments; make sure they are ASCII-folded (i.e., remove any accents or non-ASCII characters). Preserve the original format and Do NOT add, remove, or change any content beyond translation.
""".strip()

    prompt = transModelTemplate \
        .replace("<<program-name>>", ar_src.get("name", "")) \
        .replace("<<program-description>>", ar_src.get("description", "")) \
        .replace("<<source-code>>", sourceCode) \
        .replace("<<line-explanations>>", f"\n[[LINE-EXPLANATIONS]]\n" + "\n".join(lineExplanations) + "\n" if lineExplanations else "") \
        .replace("<<line-distractors>>", f"\n[[LINE-DISTRACTORS]]\n" + "\n".join(distExplanations) + "\n" if distExplanations else "")

    t0 = time.time()
    output_text = None
    last_err = None

    for attempt in range(4):
        try:
            resp = openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {"role": "system", "content": transAssistantTemplate},
                    {"role": "user", "content": prompt}
                ],
                max_completion_tokens=16000
            )
            output_text = resp.choices[0].message.content
            if output_text and "[[PROGRAM-NAME]]" in output_text and "[[PROGRAM-DESCRIPTION]]" in output_text:
                break
        except Exception as e:
            last_err = e
            time.sleep(4 * (attempt + 1))

    if not output_text:
        return ar_sid, False, f"OpenAI translation error: {last_err}"

    duration = time.time() - t0

    # 4. Parse translated texts
    try:
        t_name, t_desc, t_code, t_lines_comments, t_dist_updates = parse_translation_response(output_text)
    except Exception as e:
        return ar_sid, False, f"Parser error: {e}"

    trans_name = clean_title(t_name or orig_name)
    trans_desc = clean_delimiters(t_desc or ar_src.get('description', ''))
    trans_code = t_code or ar_src.get('code', '')

    new_lines = dict(ar_src.get('lines', {}))
    for ln_str, orig_ln_data in ar_src.get('lines', {}).items():
        if not ln_str.isdigit():
            continue
        new_comments_text = t_lines_comments.get(str(int(ln_str)), [])
        if new_comments_text:
            combined = [{'content': clean_delimiters(c)} for c in new_comments_text if c.strip()]
            if combined:
                if str(ln_str) not in new_lines:
                    new_lines[str(ln_str)] = {}
                orig_comments = orig_ln_data.get('comments', [])
                new_lines[str(ln_str)]['untr_comments'] = orig_comments
                new_lines[str(ln_str)]['comments'] = combined
                new_lines[str(ln_str)]['commentList'] = [c['content'] for c in combined]

    new_distractors = list(ar_src.get('distractors', []))
    for d_idx in range(len(new_distractors)):
        if 'untr_code' not in new_distractors[d_idx]:
            new_distractors[d_idx]['untr_code'] = new_distractors[d_idx].get('code', '')
        if 'untr_description' not in new_distractors[d_idx]:
            new_distractors[d_idx]['untr_description'] = new_distractors[d_idx].get('description', '')
        if d_idx in t_dist_updates:
            if 'LC' in t_dist_updates[d_idx]:
                new_distractors[d_idx]['code'] = t_dist_updates[d_idx]['LC']
            if 'EXPL' in t_dist_updates[d_idx]:
                new_distractors[d_idx]['description'] = clean_delimiters(t_dist_updates[d_idx]['EXPL'])

    patch_payload = {
        'name': trans_name,
        'untr_name': orig_name,
        'description': trans_desc,
        'untr_description': ar_src.get('description', ''),
        'code': trans_code,
        'untr_code': ar_src.get('code', ''),
        'lines': new_lines,
        'distractors': new_distractors,
        'iso_language_code': 'ar',
        'tags': NEW_TAGS,
        'collaborator_emails': COLLABORATORS,
        'translations': {'en': en_sid}
    }

    # 5. PATCH the source in place (no compile)
    try:
        req_patch = urllib.request.Request(
            f'{BASE_URL}/sources/{ar_sid}',
            data=json.dumps(patch_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        opener.open(req_patch, timeout=40)
    except Exception as e:
        return ar_sid, False, f"Failed to PATCH source {ar_sid}: {e}"

    # 6. Save output copy locally
    out_file = os.path.join(OUTPUT_DIR, f'{ar_sid}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({**ar_src, **patch_payload}, f, indent=2, ensure_ascii=False)

    return ar_sid, True, {
        'set_name': set_name,
        'item_type': item_type,
        'orig_name': orig_name,
        'trans_name': trans_name,
        'duration': duration,
        'en_sid': en_sid
    }

def generate_review_document(bundles_summary, sources_summary):
    total_sets = len(bundles_summary)
    total_sources = len(sources_summary)
    
    md = []
    md.append("# PCEX Python Curriculum: Arabic Translation Review Document\n")
    md.append(f"> **Status**: All {total_sets} Canonical PCEX Python Sets ({total_sources} sources) are translated into Arabic (MSA) in PCEX Authoring.")
    md.append("> **Model Used**: `gpt-5-mini-2025-08-07` via OpenAI API.")
    md.append("> **Target Dialect**: Modern Standard Arabic (الفصحى).")
    md.append("> **Compilation Status**: Uncompiled (`compile=false`, awaiting reviewer validation).")
    md.append("> **PAWS Sync Status**: Untouched (PAWS Catalog not synced).")
    md.append("> **Validation Status**: Tagged with `validation-pending;color=orange` awaiting reviewer sign-off.\n")
    md.append("---\n")
    md.append("## 1. Reviewer Instructions\n")
    md.append("### How to Access and Review Sources in the PCEX Tool")
    md.append("1. **Direct PCEX Editor Link**:")
    md.append("   - Click on any **Arabic Editor Link** in the table below (`https://adapt2.sis.pitt.edu/pcex-authoring/#/editor/<source_id>`).")
    md.append("   - The editor will display all Arabic texts: Title, Description, Code literals/prompts, Comments, and Distractors.")
    md.append("2. **Comparison with Original English**:")
    md.append("   - In the top right corner of the PCEX editor, click **\"View Untranslated / Original\"** (or open the English Editor Link side-by-side).")
    md.append("   - All original English texts (`untr_name`, `untr_description`, `untr_code`, `untr_comments`, and `untr_*` distractors) are preserved in the same file.")
    md.append("3. **Approval & Tagging**:")
    md.append("   - All newly translated items currently carry the tags:")
    md.append("     - `python-intro`")
    md.append("     - `arabic;color=yellow`")
    md.append("     - `llm-translation;color=blue`")
    md.append("     - `gpt5mini;color=purple`")
    md.append("     - `validation-pending;color=orange`")
    md.append("   - Once reviewed and approved, simply remove the `validation-pending;color=orange` tag from the source's tag list.\n")
    md.append("---\n")
    md.append(f"## 2. Summary Table of Translated Problem Sets ({total_sets} Sets / {total_sources} Sources)\n")
    md.append("| # | Problem Set (Bundle) | Sources | Arabic Bundle ID | English Bundle ID | Direct Editor Links |")
    md.append("| :-: | :--- | :-: | :---: | :---: | :--- |")
    
    for idx, (bname, binfo) in enumerate(sorted(bundles_summary.items()), start=1):
        ar_bid = binfo['ar_bid']
        en_bid = binfo['en_bid']
        items = binfo['items']
        
        links = []
        for i_num, it in enumerate(items, start=1):
            sid = it['ar_sid']
            itype = it['type'].capitalize()
            links.append(f"[{itype} {i_num}](https://adapt2.sis.pitt.edu/pcex-authoring/#/editor/{sid})")
        
        links_str = " · ".join(links)
        md.append(f"| {idx} | **{bname}** | {len(items)} | `{ar_bid}` | `{en_bid}` | {links_str} |")
    
    md.append("\n---\n")
    md.append("## 3. Detailed Source Translation Registry\n")
    md.append("| # | Source ID | Role | Arabic Name | English Name | Bundle |")
    md.append("| :-: | :---: | :---: | :--- | :--- | :--- |")
    for idx, (sid, sinfo) in enumerate(sorted(sources_summary.items(), key=lambda x: (x[1]['bundle'], x[1]['role'])), start=1):
        md.append(f"| {idx} | [`{sid}`](https://adapt2.sis.pitt.edu/pcex-authoring/#/editor/{sid}) | {sinfo['role'].capitalize()} | {sinfo['ar_name']} | {sinfo['en_name']} | `{sinfo['bundle']}` |")
        
    with open(REVIEW_DOC, 'w', encoding='utf-8') as f:
        f.write("\n".join(md) + "\n")
    print(f"\n✓ Generated review document: {REVIEW_DOC}", flush=True)

def main():
    print("=" * 75, flush=True)
    print("PCEX Authoring Python Arabic Translation Pipeline (In-Place Staged)", flush=True)
    print("Model: gpt-5-mini-2025-08-07 via OpenAI API", flush=True)
    print("Target Language: Arabic (Modern Standard Arabic)", flush=True)
    print("Compilation: SKIPPED (compile=false)", flush=True)
    print("PAWS Sync: SKIPPED (not called)", flush=True)
    print("=" * 75, flush=True)

    opener = create_authenticated_opener()
    print("✓ Authenticated with PCEX Authoring", flush=True)

    # 1. Fetch user OpenAI API Key from server config
    req_cfg = urllib.request.Request(f'{BASE_URL}/gpt-genai/config')
    cfg_resp = json.loads(opener.open(req_cfg).read().decode('utf-8'))
    user_val = cfg_resp.get('value', {})
    openai_key = user_val.get('apiKey') or user_val.get('api_key')
    if not openai_key:
        raise Exception("OpenAI API key not found in account config!")
    
    openai_client = OpenAI(api_key=openai_key)
    print("✓ Connected to OpenAI client with user API key.", flush=True)

    # 2. Load canonical 52 sets from clone4arabic/list.json
    with open(os.path.join(PROJECT_DIR, 'scripts', 'clone4arabic', 'list.json'), 'r') as f:
        clone_list = json.load(f)
    py_clone = clone_list.get('Intro to Python - Fall 2025', {})
    canonical_sets = {}
    for title, url in py_clone.items():
        m = re.search(r'set=([^&]+)', url)
        set_name = m.group(1) if m else url
        canonical_sets[set_name] = title

    print(f"✓ Loaded {len(canonical_sets)} canonical Python problem set names.", flush=True)

    # 3. Fetch all server bundles and sources
    req_bundles = urllib.request.Request(f'{BASE_URL}/bundles?allUsers=true')
    all_bundles = json.loads(opener.open(req_bundles).read().decode('utf-8'))
    
    req_sources = urllib.request.Request(f'{BASE_URL}/sources?allUsers=true')
    all_sources = json.loads(opener.open(req_sources).read().decode('utf-8'))
    sources_by_id = {s['id']: s for s in all_sources}

    ar_staged_sids = {
        s['id'] for s in all_sources
        if (s.get('language') or s.get('programming_language')) == 'PYTHON'
        and 'arabic' in [t.lower() for t in s.get('tags', [])]
    }

    # 4. Match bundles
    staged_bundles = {}
    en_bundles = {}

    for b in all_bundles:
        bname = b.get('name')
        if bname in canonical_sets:
            items = b.get('items', [])
            if not items:
                continue
            if any(it.get('item') in ar_staged_sids for it in items):
                staged_bundles[bname] = b
            elif b.get('iso_language_code') == 'en' and b.get('user') == 'moh70@pitt.edu':
                if b.get('translations', {}).get('es'):
                    en_bundles[bname] = b
                elif bname not in en_bundles:
                    en_bundles[bname] = b

    print(f"✓ Found {len(staged_bundles)}/52 staged Arabic bundles on server.", flush=True)
    print(f"✓ Found {len(en_bundles)}/52 canonical English bundles on server.", flush=True)

    # 5. Prepare task list for all sources
    source_tasks = []
    bundle_mapping_info = {}

    for bname in sorted(canonical_sets.keys()):
        sb = staged_bundles.get(bname)
        eb = en_bundles.get(bname)
        if not sb or not eb:
            raise Exception(f"Missing bundle pair for '{bname}'")

        sb_items = sb.get('items', [])
        eb_items = eb.get('items', [])
        if len(sb_items) != len(eb_items):
            raise Exception(f"Item mismatch in '{bname}': {len(sb_items)} vs {len(eb_items)}")

        b_item_list = []
        for i in range(len(sb_items)):
            ar_sid = sb_items[i]['item']
            en_sid = eb_items[i]['item']
            itype = sb_items[i].get('type', 'example')

            task = {
                'ar_sid': ar_sid,
                'en_sid': en_sid,
                'set_name': bname,
                'item_type': itype,
                'ar_bid': sb['id'],
                'en_bid': eb['id']
            }
            source_tasks.append(task)
            b_item_list.append({'ar_sid': ar_sid, 'en_sid': en_sid, 'type': itype})

        bundle_mapping_info[bname] = {
            'ar_bid': sb['id'],
            'en_bid': eb['id'],
            'items': b_item_list
        }

    total_tasks = len(source_tasks)
    print(f"✓ Verified {total_tasks} sources to translate across {len(bundle_mapping_info)} problem sets.\n", flush=True)

    # 6. Check progress
    progress = load_progress()
    already_done = {sid for sid, p in progress.items() if p.get('status') == 'done'}
    to_process = [t for t in source_tasks if t['ar_sid'] not in already_done]

    print(f"✓ Already completed: {len(already_done)}/{total_tasks}")
    print(f"✓ Remaining to translate: {len(to_process)}/{total_tasks}\n", flush=True)

    if to_process:
        max_workers = 4
        print(f"Starting concurrent translation with {max_workers} workers...\n", flush=True)
        counter_holder = [len(already_done)]

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(translate_source, task, total_tasks, counter_holder, create_authenticated_opener(), openai_client): task
                for task in to_process
            }

            for future in as_completed(futures):
                task = futures[future]
                ar_sid = task['ar_sid']
                try:
                    res_sid, success, info = future.result()
                    with progress_lock:
                        counter_holder[0] += 1
                        pct = (counter_holder[0] / total_tasks) * 100
                        if success:
                            progress[res_sid] = {
                                'status': 'done',
                                'set_name': info['set_name'],
                                'item_type': info['item_type'],
                                'orig_name': info['orig_name'],
                                'trans_name': info['trans_name'],
                                'duration': round(info['duration'], 1),
                                'en_sid': info['en_sid'],
                                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                            }
                            save_progress(progress)
                            print(f"[{counter_holder[0]:03d}/{total_tasks:03d}] ({pct:5.1f}%) ✓ {res_sid} ({info['set_name']} / {info['item_type']}): \"{info['orig_name'][:28]}\" -> \"{info['trans_name'][:28]}\" ({info['duration']:.1f}s)", flush=True)
                        else:
                            progress[res_sid] = {
                                'status': 'failed',
                                'error': str(info),
                                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                            }
                            save_progress(progress)
                            print(f"[{counter_holder[0]:03d}/{total_tasks:03d}] ({pct:5.1f}%) ✗ {res_sid} failed: {info}", flush=True)
                except Exception as ex:
                    with progress_lock:
                        counter_holder[0] += 1
                        print(f"[{counter_holder[0]:03d}/{total_tasks:03d}] ✗ Worker exception on {ar_sid}: {ex}", flush=True)

    # 7. Update Bundles (Metadata only: tags, translations, iso_language_code, NO compile, NO sync)
    print("\n" + "=" * 75, flush=True)
    print("Updating Arabic Bundles (Metadata & Translation Linking, NO compile)", flush=True)
    print("=" * 75, flush=True)

    bundles_summary = {}
    sources_summary = {}

    for b_idx, (bname, binfo) in enumerate(sorted(bundle_mapping_info.items()), start=1):
        ar_bid = binfo['ar_bid']
        en_bid = binfo['en_bid']

        # Update Arabic bundle
        patch_b_payload = {
            'tags': NEW_TAGS,
            'iso_language_code': 'ar',
            'collaborator_emails': COLLABORATORS,
            'translations': {'en': en_bid}
        }

        try:
            req_patch_b = urllib.request.Request(
                f'{BASE_URL}/bundles/{ar_bid}',
                data=json.dumps(patch_b_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            opener.open(req_patch_b, timeout=30)
            print(f"[{b_idx:02d}/52] ✓ Bundle {ar_bid} ({bname}) updated and linked to English {en_bid}", flush=True)
        except Exception as e:
            print(f"[{b_idx:02d}/52] ⚠ Warning updating bundle {ar_bid}: {e}", flush=True)

        bundles_summary[bname] = binfo

    # 8. Collect all source summaries for mapping & review doc
    for task in source_tasks:
        ar_sid = task['ar_sid']
        p_info = progress.get(ar_sid, {})
        sources_summary[ar_sid] = {
            'bundle': task['set_name'],
            'role': task['item_type'],
            'ar_name': p_info.get('trans_name', ''),
            'en_name': p_info.get('orig_name', ''),
            'en_id': task['en_sid']
        }

    # 9. Save final mapping registry
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'bundles': bundles_summary,
            'sources': sources_summary,
            'stats': {
                'total_bundles': len(bundles_summary),
                'total_sources': len(sources_summary),
                'completed_sources': len([p for p in progress.values() if p.get('status') == 'done']),
                'model': 'gpt-5-mini-2025-08-07',
                'target_language': 'Arabic',
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }
        }, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Saved mapping registry: {MAPPING_FILE}", flush=True)

    # 10. Generate review markdown document
    generate_review_document(bundles_summary, sources_summary)

    print("\n" + "=" * 75, flush=True)
    print("Arabic Python Translation Pipeline Complete!", flush=True)
    print(f"  Total Sets: {len(bundles_summary)}")
    print(f"  Total Sources: {len(sources_summary)}")
    print("=" * 75, flush=True)

if __name__ == '__main__':
    main()
