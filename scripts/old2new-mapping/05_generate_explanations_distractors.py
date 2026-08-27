import os
import json
import glob
import time
import requests
import uuid
import getpass

# Server Configuration
BASE_URL = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")

def get_credentials(script_dir):
    """
    Loads saved credentials or prompts interactively from CLI and saves them.
    """
    creds_file = os.path.join(script_dir, "auth_credentials.json")
    if os.path.exists(creds_file):
        try:
            with open(creds_file, "r", encoding="utf-8") as f:
                creds = json.load(f)
                if creds.get("email") and creds.get("password"):
                    print(f"Loaded credentials for: {creds['email']} from auth_credentials.json")
                    return creds["email"], creds["password"]
        except Exception:
            pass

    print("\n--- PCEX Authoring Login ---")
    email = input("Enter email (username): ").strip()
    password = getpass.getpass("Enter password: ")

    # Save to auth_credentials.json
    with open(creds_file, "w", encoding="utf-8") as f:
        json.dump({"email": email, "password": password}, f, indent=2)
    print(f"✓ Saved credentials to {creds_file}\n")

    return email, password

def get_session(email, password):
    """
    Creates an authenticated requests Session.
    """
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    session = requests.Session()
    session.verify = False
    session.headers.update({"User-Agent": "PCEX-Augmentation-Script/1.0"})
    
    print(f"Logging in as {email} to {BASE_URL}/auth/login...")
    try:
        resp = session.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        }, timeout=15)
        if resp.status_code == 200 or resp.status_code == 201:
            print("✓ Login successful!\n")
            return session
        else:
            raise Exception(f"Login failed (HTTP {resp.status_code}): {resp.text}")
    except Exception as e:
        print(f"Error during login to {BASE_URL}: {e}")
        raise e

def load_cache(cache_file):
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache_data, cache_file):
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)

def call_genai_api(session, payload):
    """
    Calls POST /gpt-genai endpoint.
    """
    url = f"{BASE_URL}/gpt-genai"
    try:
        resp = session.post(url, json=payload, timeout=60)
        if resp.status_code in (200, 201):
            return resp.json(), None
        else:
            return None, f"HTTP {resp.status_code}: {resp.text}"
    except Exception as e:
        return None, str(e)

def normalize_code_str(code):
    if not code:
        return ""
    return " ".join(code.strip().split())

def get_cached_distractor_explanations_from_step2(lines, language, solution, statement, cache):
    """
    Returns a dict of {normalized_distractor_code: explanation} for distractors
    already generated and cached for blank lines in this activity.
    """
    step2_exps = {}
    for ln_str, info in lines.items():
        if info.get("blank"):
            key = f"{language}::{int(ln_str)}::{solution}::{statement}"
            if key in cache.get("distractors", {}):
                for gd in cache["distractors"][key]:
                    g_code = normalize_code_str(gd.get("distractor", ""))
                    g_exp = gd.get("explanation", "")
                    if g_code and g_exp:
                        step2_exps[g_code] = g_exp
    return step2_exps


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sources_dir = os.path.join(script_dir, "matched_sources")
    output_dir = os.path.join(script_dir, "augmented_sources")
    cache_file = os.path.join(script_dir, "genai_cache.json")
    
    os.makedirs(output_dir, exist_ok=True)
    
    source_files = sorted(glob.glob(os.path.join(sources_dir, "*.json")))
    print(f"Reading from: {sources_dir}")
    print(f"Saving augmented copies to: {output_dir}\n")
    print(f"Found {len(source_files)} source files.\n")
    
    email, password = get_credentials(script_dir)
    session = get_session(email, password)
    cache = load_cache(cache_file)
    
    # Cache buckets:
    if "line_explanations" not in cache:
        cache["line_explanations"] = {}
    if "distractors" not in cache:
        cache["distractors"] = {}
    if "distractor_explanations" not in cache:
        cache["distractor_explanations"] = {}

    # Pre-scan to count total tasks and cached tasks for progress tracking
    print("Pre-scanning files to calculate total generation tasks...")
    total_line_exp_tasks = 0
    total_dist_tasks = 0
    total_dist_exp_tasks = 0
    
    cached_line_exp = 0
    cached_dist = 0
    cached_dist_exp = 0
    
    for s_path in source_files:
        with open(s_path, "r", encoding="utf-8") as f:
            s_data = json.load(f)
            
        lang = s_data.get("language", "PYTHON")
        stmt = s_data.get("description", "")
        sol = s_data.get("code", "")
        lines = s_data.get("lines", {})
        distractors = s_data.get("distractors", [])
        
        # 1. Line explanations
        for ln_str, info in lines.items():
            if any(c.strip() for c in info.get("commentList", [])):
                total_line_exp_tasks += 1
                key = f"{lang}::{int(ln_str)}::{sol}::{stmt}"
                if key in cache["line_explanations"]:
                    cached_line_exp += 1
                    
        # 2. Blank line distractors
        for ln_str, info in lines.items():
            if info.get("blank"):
                total_dist_tasks += 1
                key = f"{lang}::{int(ln_str)}::{sol}::{stmt}"
                if key in cache["distractors"]:
                    cached_dist += 1
                    
        # 3. Distractor explanations
        step2_cached_exps = get_cached_distractor_explanations_from_step2(lines, lang, sol, stmt, cache)
        for d in distractors:
            d_content = (d.get("line") or {}).get("content", "")
            d_comms = [c for c in (d.get("line") or {}).get("commentList", []) if c.strip()]
            if not d_comms and d_content:
                total_dist_exp_tasks += 1
                key = f"{lang}::{d_content}::{sol}::{stmt}"
                d_norm = normalize_code_str(d_content)
                if key in cache["distractor_explanations"] or d_norm in step2_cached_exps:
                    cached_dist_exp += 1

    total_tasks = total_line_exp_tasks + total_dist_tasks + total_dist_exp_tasks
    cached_total = cached_line_exp + cached_dist + cached_dist_exp
    
    print(f"Total generation tasks across all files: {total_tasks}")
    print(f"  - Line explanations: {total_line_exp_tasks} ({cached_line_exp} already cached)")
    print(f"  - Blank line distractors: {total_dist_tasks} ({cached_dist} already cached)")
    print(f"  - Distractor explanations: {total_dist_exp_tasks} ({cached_dist_exp} already cached)")
    print(f"Starting execution with {cached_total}/{total_tasks} ({cached_total/total_tasks*100:.1f}%) already completed.\n" if total_tasks else "No tasks found.\n")

    completed_tasks = cached_total

    for idx, s_path in enumerate(source_files, 1):
        filename = os.path.basename(s_path)
        with open(s_path, "r", encoding="utf-8") as f:
            source = json.load(f)
            
        source_id = source.get("id") or source.get("_id")
        source_name = source.get("name", "")
        language = source.get("language", "PYTHON")
        statement = source.get("description", "")
        solution = source.get("code", "")
        
        print(f"[{idx}/{len(source_files)}] File: {s_path}")
        print(f"       Activity: {source_name}")
        modified = False
        
        lines = source.get("lines", {})
        distractors = source.get("distractors", [])
        
        # -------------------------------------------------------------
        # 1. Generate line explanations for lines that have explanations
        # -------------------------------------------------------------
        for ln_str, line_info in lines.items():
            ln_num = int(ln_str)
            existing_comms = line_info.get("commentList", [])
            has_existing_expl = any(c.strip() for c in existing_comms)
            
            if has_existing_expl:
                exp_cache_key = f"{language}::{ln_num}::{solution}::{statement}"
                
                if exp_cache_key in cache["line_explanations"]:
                    gen_comms = cache["line_explanations"][exp_cache_key]
                else:
                    progress_pct = (completed_tasks / total_tasks * 100) if total_tasks else 100.0
                    print(f"  [{progress_pct:5.1f}% | {completed_tasks}/{total_tasks}] Generating explanation for Line {ln_num}...")
                    payload = {
                        "action": "explain-line",
                        "id": source_id,
                        "language": language,
                        "statement": statement,
                        "solution": solution,
                        "line_number": ln_num
                    }
                    res, err = call_genai_api(session, payload)
                    if res:
                        if isinstance(res, dict):
                            gen_comms = res.get(str(ln_num), res.get(ln_num, []))
                        elif isinstance(res, list):
                            gen_comms = res
                        else:
                            gen_comms = [str(res)]
                            
                        cache["line_explanations"][exp_cache_key] = gen_comms
                        save_cache(cache, cache_file)
                        completed_tasks += 1
                    else:
                        print(f"  ✗ Failed to generate explanation for Line {ln_num}: {err}")
                        gen_comms = None
                        
                if gen_comms:
                    line_info["commentList"] = gen_comms
                    modified = True
                    
        # -------------------------------------------------------------
        # 2. For blank lines, generate distractors
        # -------------------------------------------------------------
        initial_step2_cached_exps = get_cached_distractor_explanations_from_step2(lines, language, solution, statement, cache)
        blank_lines = [int(ln) for ln, info in lines.items() if info.get("blank")]
        
        for blank_ln in blank_lines:
            dist_cache_key = f"{language}::{blank_ln}::{solution}::{statement}"
            
            if dist_cache_key in cache["distractors"]:
                gen_distractors = cache["distractors"][dist_cache_key]
            else:
                progress_pct = (completed_tasks / total_tasks * 100) if total_tasks else 100.0
                print(f"  [{progress_pct:5.1f}% | {completed_tasks}/{total_tasks}] Generating distractors for blank Line {blank_ln}...")
                payload = {
                    "action": "generate-distractors",
                    "id": source_id,
                    "language": language,
                    "statement": statement,
                    "solution": solution,
                    "line_number": blank_ln,
                    "n_distractors": 3
                }
                res, err = call_genai_api(session, payload)
                if res:
                    if isinstance(res, dict):
                        gen_distractors = res.get(str(blank_ln), res.get(blank_ln, []))
                    elif isinstance(res, list):
                        gen_distractors = res
                    else:
                        gen_distractors = []
                        
                    cache["distractors"][dist_cache_key] = gen_distractors
                    save_cache(cache, cache_file)
                    completed_tasks += 1
                else:
                    print(f"  ✗ Failed to generate distractors for Line {blank_ln}: {err}")
                    gen_distractors = []
                    
            # Check matches with current distractors
            for g_dist in gen_distractors:
                g_code = g_dist.get("distractor", "")
                g_exp = g_dist.get("explanation", "")
                g_norm = normalize_code_str(g_code)
                
                matched_existing = False
                for curr_d in distractors:
                    curr_d_line = curr_d.get("line") or {}
                    curr_norm = normalize_code_str(curr_d_line.get("content", ""))
                    curr_comms = [c for c in curr_d_line.get("commentList", []) if c.strip()]
                    if g_norm and g_norm == curr_norm:
                        if not curr_comms and g_exp:
                            d_key = f"{language}::{curr_d_line.get('content', '')}::{solution}::{statement}"
                            if d_key not in cache.get("distractor_explanations", {}) and curr_norm not in initial_step2_cached_exps:
                                completed_tasks += 1
                        curr_d_line["commentList"] = [g_exp] if g_exp else []
                        curr_d["helpList"] = [g_exp] if g_exp else []
                        matched_existing = True
                        modified = True
                        break
                        
                if not matched_existing and g_code:
                    new_dist_item = {
                        "id": str(uuid.uuid4()),
                        "line": {
                            "number": 0,
                            "content": g_code,
                            "commentList": [g_exp] if g_exp else [],
                            "indentLevel": lines.get(str(blank_ln), {}).get("indentLevel", 0)
                        },
                        "helpList": [g_exp] if g_exp else []
                    }
                    distractors.append(new_dist_item)
                    modified = True

        # -------------------------------------------------------------
        # 3. For any distractor still without explanation, generate one
        # -------------------------------------------------------------
        for d_idx, d_item in enumerate(distractors):
            d_line = d_item.get("line") or {}
            d_content = d_line.get("content", "")
            d_comms = [c for c in d_line.get("commentList", []) if c.strip()]
            
            if not d_comms and d_content:
                d_exp_cache_key = f"{language}::{d_content}::{solution}::{statement}"
                if d_exp_cache_key in cache["distractor_explanations"]:
                    d_exp = cache["distractor_explanations"][d_exp_cache_key]
                else:
                    progress_pct = (completed_tasks / total_tasks * 100) if total_tasks else 100.0
                    print(f"  [{progress_pct:5.1f}% | {completed_tasks}/{total_tasks}] Generating explanation for distractor: '{d_content}'...")
                    payload = {
                        "action": "generate-distractor-explanation",
                        "id": source_id,
                        "language": language,
                        "statement": statement,
                        "solution": solution,
                        "line_number": blank_lines[0] if blank_lines else 1,
                        "distractor": d_content
                    }
                    res, err = call_genai_api(session, payload)
                    if res and isinstance(res, dict):
                        d_exp = res.get("explanation", "")
                        cache["distractor_explanations"][d_exp_cache_key] = d_exp
                        save_cache(cache, cache_file)
                        completed_tasks += 1
                    else:
                        print(f"  ✗ Failed to generate distractor explanation: {err}")
                        d_exp = ""
                        
                if d_exp:
                    d_line["commentList"] = [d_exp]
                    d_item["helpList"] = [d_exp]
                    modified = True

        # Always save full augmented copy to output_dir
        dest_path = os.path.join(output_dir, filename)
        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(source, f, indent=2)
        if modified:
            print(f"  ✓ Saved augmented copy: {dest_path}\n")
        else:
            print(f"  - Saved copy (no changes needed): {dest_path}\n")

    final_pct = (completed_tasks / total_tasks * 100) if total_tasks else 100.0
    print(f"All {len(source_files)} sources processed successfully! Saved to: {output_dir}")
    print(f"Total tasks completed: {completed_tasks}/{total_tasks} ({final_pct:.1f}%)")

if __name__ == "__main__":
    main()
