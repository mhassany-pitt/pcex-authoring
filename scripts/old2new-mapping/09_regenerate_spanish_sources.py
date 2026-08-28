#!/usr/bin/env python3
"""
09_regenerate_spanish_sources.py

Regenerates line explanations, distractors, and distractor explanations in English
for all sources and bundles that previously generated Spanish explanations due to online config discrepancy.

Supports multi-threaded parallelism (--workers / -w) to process multiple sources concurrently.

For each finished source, it:
1. Generates English line explanations and distractors via POST /gpt-genai
2. Updates and saves the local augmented source JSON file (augmented_sources/<id>.json)
3. Updates the local augmented bundle JSON files (augmented_bundles/<id>.json)
4. Pushes the updated version directly to the PCEX Authoring server via PATCH /bulk/sources/<cloned_id>
5. Updates and recompiles affected activities/bundles on the server via PATCH /bulk/activities/<cloned_bundle_id>
"""

import os
import sys
import glob
import json
import time
import uuid
import ssl
import re
import argparse
import getpass
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue
import urllib.request
import urllib.error
import urllib.parse
import http.cookiejar

# Default server URLs
DEFAULT_API_URL = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")

# Collaborators to maintain on bundles
COLLABORATOR_EMAILS = [
    "rah225@pitt.edu",
    "peterb@pitt.edu",
    "arl122@pitt.edu",
    "quinnkwolter@pitt.edu",
    "hua1007.yu@connect.polyu.hk"
]

# Language detection markers for identifying Spanish content
ES_SYNTAX_WORDS = set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "en", "que", "es", "por", "para", "con",
    "su", "sus", "al", "del", "se", "lo", "le", "les", "este", "esta", "estos", "estas", "como", "más", "mas",
    "pero", "cuando", "donde", "cual", "cuál", "línea", "linea", "código", "codigo", "función", "funcion",
    "valor", "valores", "variable", "variables", "imprime", "muestra", "devuelve", "propósito", "proposito",
    "sintaxis", "semántica", "semantica", "buenas", "prácticas", "practicas", "errores", "comunes",
    "malentendidos", "paso", "tú", "tu", "puedes", "debes", "tener", "hacer", "usar", "programa", "ejecuta",
    "condición", "condicion", "bucle", "cadena", "número", "numero", "entero", "lista", "elemento", "elementos",
    "usuario", "entrada", "porque", "elegir", "esto", "comprobación", "comprobacion", "sentencia", "bloque",
    "salida", "primero", "segundo", "tercero", "después", "despues", "anterior", "siguiente", "aquí", "aqui",
    "cada", "sobre", "entre", "también", "tambien", "así", "asi", "solo", "sólo", "otra", "otro", "otros", "otras"
])

EN_SYNTAX_WORDS = set([
    "the", "a", "an", "is", "are", "was", "were", "to", "in", "of", "that", "this", "these", "those",
    "it", "its", "with", "as", "by", "on", "at", "from", "be", "which", "line", "code", "function",
    "value", "values", "variable", "variables", "prints", "shows", "returns", "purpose", "syntax",
    "semantics", "best", "practices", "common", "errors", "misconceptions", "step", "you", "can", "should",
    "have", "do", "use", "program", "runs", "condition", "loop", "string", "number", "integer", "list",
    "element", "elements", "user", "input", "because", "choose", "statement", "block", "output", "check",
    "might", "pick", "first", "second", "third", "after", "previous", "next", "here", "each", "about",
    "between", "also", "so", "only", "other", "others", "another"
])

# Thread synchronization locks
cache_lock = threading.Lock()
mapping_lock = threading.Lock()
bundle_lock = threading.Lock()
print_lock = threading.Lock()


def safe_print(*args, **kwargs):
    """Thread-safe print function."""
    with print_lock:
        print(*args, **kwargs)
        sys.stdout.flush()


def is_spanish_source(source_data):
    """Detects whether a source has Spanish line or distractor explanations."""
    line_texts = []
    for ln, l_data in source_data.get("lines", {}).items():
        if isinstance(l_data, dict):
            for c in l_data.get("commentList", []):
                if isinstance(c, str) and c.strip():
                    line_texts.append(c.strip())

    dist_texts = []
    for d in source_data.get("distractors", []):
        if isinstance(d, dict):
            seen = set()
            for c in d.get("line", {}).get("commentList", []):
                if isinstance(c, str) and c.strip():
                    seen.add(c.strip())
            for h in d.get("helpList", []):
                if isinstance(h, str) and h.strip():
                    seen.add(h.strip())
            dist_texts.extend(list(seen))

    line_words = []
    for t in line_texts:
        line_words.extend(re.findall(r"\b[a-záéíóúñü]+\b", t.lower()))
    dist_words = []
    for t in dist_texts:
        dist_words.extend(re.findall(r"\b[a-záéíóúñü]+\b", t.lower()))

    line_es = sum(1 for w in line_words if w in ES_SYNTAX_WORDS)
    line_en = sum(1 for w in line_words if w in EN_SYNTAX_WORDS)
    dist_es = sum(1 for w in dist_words if w in ES_SYNTAX_WORDS)
    dist_en = sum(1 for w in dist_words if w in EN_SYNTAX_WORDS)

    has_es_lines = (line_es > line_en and line_es >= 3)
    has_es_dist = (dist_es > dist_en and dist_es >= 3)
    return has_es_lines or has_es_dist


def get_credentials(script_dir):
    """Loads saved login credentials or prompts interactively."""
    creds_file = os.path.join(script_dir, "auth_credentials.json")
    if os.path.exists(creds_file):
        try:
            with open(creds_file, "r", encoding="utf-8") as f:
                creds = json.load(f)
                if creds.get("email") and creds.get("password"):
                    return creds["email"], creds["password"]
        except Exception:
            pass

    print("\n--- PCEX Authoring Login ---")
    email = input("Enter email (username): ").strip()
    password = getpass.getpass("Enter password: ")

    with open(creds_file, "w", encoding="utf-8") as f:
        json.dump({"email": email, "password": password}, f, indent=2)
    return email, password


def get_api_token(script_dir):
    """Loads bulk API token from environment, file, or interactive prompt."""
    if os.environ.get("PCEX_API_TOKEN"):
        return os.environ["PCEX_API_TOKEN"]
    token_file = os.path.join(script_dir, "api_token.txt")
    if os.path.exists(token_file):
        with open(token_file, "r", encoding="utf-8") as f:
            t = f.read().strip()
            if t:
                return t
    return input("Enter PCEX Bulk API Token: ").strip()


def get_genai_session(base_url, email, password, ssl_ctx):
    """Creates authenticated opener for POST /gpt-genai using CookieJar."""
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        urllib.request.HTTPSHandler(context=ssl_ctx)
    )

    login_url = f"{base_url}/auth/login"
    print(f"Logging in as {email} to {login_url}...")
    login_data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "PCEX-Regenerator/1.0"
        },
        method="POST"
    )
    try:
        with opener.open(req, timeout=20) as resp:
            if resp.status in (200, 201):
                print("✓ Session authenticated for GenAI generation.\n")
                return opener
            else:
                raise Exception(f"Login returned unexpected HTTP status {resp.status}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        raise Exception(f"Login failed (HTTP {e.code}): {err_body}")


def call_genai_api(opener, base_url, payload, retries=3):
    """Calls POST /gpt-genai with retry logic using the authenticated opener."""
    url = f"{base_url}/gpt-genai"
    data_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Regenerator/1.0"
    }

    err = "Unknown error"
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        try:
            with opener.open(req, timeout=90) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body), None
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            err = f"HTTP {e.code}: {err_body}"
        except Exception as e:
            err = str(e)
        if attempt < retries:
            time.sleep(2 * attempt)
    return None, err


def send_json_request(url, headers, payload, ctx, method="PATCH"):
    """Sends JSON PATCH or POST request to bulk API."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)


def transform_source_for_editor(source_payload, compile_flag=True):
    """Transforms lines and distractors to match the PCEX editor schema."""
    lines = source_payload.get("lines", {})
    for ln_str, info in lines.items():
        comm_list = info.get("commentList", [])
        info["comments"] = [{"content": c} if isinstance(c, str) else c for c in comm_list]

    new_dist = []
    for d in source_payload.get("distractors", []):
        if "code" in d:
            new_dist.append(d)
        else:
            d_line = d.get("line") or {}
            code = d_line.get("content", "")
            comms = d_line.get("commentList", []) or d.get("helpList", [])
            desc = comms[0] if comms else ""
            line_num = d_line.get("number", 0)
            new_dist.append({
                "code": code,
                "description": desc,
                "line_number": line_num
            })
    source_payload["distractors"] = new_dist
    source_payload["compile"] = compile_flag
    return source_payload


class Dashboard:
    def __init__(self, total_count, num_workers):
        self.total_count = total_count
        self.num_workers = num_workers
        self.completed_count = 0
        self.pushed_count = 0
        self.worker_slots = [
            {"sid": "", "name": "", "status": "Idle", "detail": ""}
            for _ in range(num_workers)
        ]
        self.completed_history = []
        self.lock = threading.Lock()
        self.slot_queue = queue.Queue()
        for i in range(num_workers):
            self.slot_queue.put(i)
        self.rendered_lines = 0
        self.is_tty = sys.stdout.isatty()
        self.start_time = time.time()

    def acquire_slot(self):
        return self.slot_queue.get()

    def release_slot(self, slot):
        with self.lock:
            self.worker_slots[slot] = {"sid": "", "name": "", "status": "Idle", "detail": ""}
            self.render()
        self.slot_queue.put(slot)

    def update_worker(self, slot, sid, name, status, detail=""):
        with self.lock:
            self.worker_slots[slot] = {
                "sid": sid,
                "name": name,
                "status": status,
                "detail": detail
            }
            self.render()

    def mark_completed(self, slot, idx, sid, name, pushed=False):
        with self.lock:
            self.completed_count += 1
            if pushed:
                self.pushed_count += 1
            self.completed_history.append((self.completed_count, sid, name))
            if len(self.completed_history) > 4:
                self.completed_history.pop(0)
            self.worker_slots[slot] = {"sid": sid, "name": name, "status": "Done", "detail": "Completed"}
            self.render()

    def render(self):
        if not self.is_tty:
            return
        
        pct = (self.completed_count / self.total_count * 100) if self.total_count else 0
        bar_len = 25
        filled = int(bar_len * self.completed_count / self.total_count) if self.total_count else 0
        bar = "█" * filled + "░" * (bar_len - filled)
        elapsed = time.time() - self.start_time
        mins, secs = divmod(int(elapsed), 60)

        lines = []
        lines.append("=" * 82)
        lines.append(f" 🚀 PCEX ENGLISH REGENERATION DASHBOARD | Workers: {self.num_workers} | Elapsed: {mins:02d}:{secs:02d}")
        lines.append(f" Progress: [{bar}] {self.completed_count:2d}/{self.total_count:2d} ({pct:5.1f}%) | Server Pushes: {self.pushed_count}")
        lines.append("-" * 82)

        for slot_idx, slot in enumerate(self.worker_slots):
            sid_abbr = slot["sid"][:8] if slot["sid"] else "        "
            status = slot["status"]
            detail = slot["detail"]
            if slot["sid"]:
                line_str = f" Worker {slot_idx+1}: [{sid_abbr}] {status:<24} | {detail}"
            else:
                line_str = f" Worker {slot_idx+1}: [Idle]"
            lines.append(line_str[:80])

        if self.completed_history:
            lines.append("-" * 82)
            lines.append(" Recent Completed Sources:")
            for c_idx, c_sid, c_name in reversed(self.completed_history[-3:]):
                lines.append(f"   ✓ [{c_idx:2d}/{self.total_count}] {c_sid[:8]} | {c_name[:48]}")

        lines.append("=" * 82)

        # Clear and redraw in-place using ANSI escape sequences
        output = ""
        if self.rendered_lines > 0:
            output += f"\033[{self.rendered_lines}A"

        for line in lines:
            output += f"\r\033[K{line}\n"

        sys.stdout.write(output)
        sys.stdout.flush()
        self.rendered_lines = len(lines)

    def finish(self):
        if self.is_tty and self.rendered_lines > 0:
            sys.stdout.write("\n")
            sys.stdout.flush()


def process_single_source(
    sid,
    idx,
    total_count,
    api_url,
    compile_param,
    args,
    session,
    bulk_headers,
    ssl_ctx,
    matched_sources_dir,
    augmented_sources_dir,
    augmented_bundles_dir,
    mapping_file,
    cache_file,
    mapping,
    cache,
    dashboard
):
    """Processes a single source: generates English explanations & pushes immediately."""
    slot = dashboard.acquire_slot()
    pushed = False

    try:
        matched_path = os.path.join(matched_sources_dir, f"{sid}.json")
        aug_path = os.path.join(augmented_sources_dir, f"{sid}.json")

        base_path = matched_path if os.path.exists(matched_path) else aug_path
        with open(base_path, "r", encoding="utf-8") as f:
            source = json.load(f)

        source_name = source.get("name", sid)
        language = source.get("language", "PYTHON")
        statement = source.get("description", "")
        solution = source.get("code", "")
        lines = source.get("lines", {})

        dashboard.update_worker(slot, sid, source_name, "Starting...", f"'{source_name[:30]}'")

        if not args.push_only:
            # 1. Regenerate line explanations
            for ln_str, line_info in lines.items():
                ln_num = int(ln_str)
                existing_comms = line_info.get("commentList", [])
                had_expl = bool(existing_comms) or line_info.get("blank")

                if os.path.exists(matched_path):
                    with open(matched_path, "r", encoding="utf-8") as mf:
                        m_data = json.load(mf)
                        had_expl = bool(m_data.get("lines", {}).get(ln_str, {}).get("commentList"))

                if had_expl:
                    dashboard.update_worker(slot, sid, source_name, f"Explain Line {ln_num}", "Requesting LLM...")
                    payload = {
                        "action": "explain-line",
                        "id": sid,
                        "language": language,
                        "statement": statement,
                        "solution": solution,
                        "line_number": ln_num
                    }
                    res, err = call_genai_api(session, api_url, payload)
                    if res:
                        if isinstance(res, dict):
                            gen_comms = res.get(str(ln_num), res.get(ln_num, []))
                        elif isinstance(res, list):
                            gen_comms = res
                        else:
                            gen_comms = [str(res)]
                        line_info["commentList"] = gen_comms
                        
                        exp_cache_key = f"{language}::{ln_num}::{solution}::{statement}"
                        with cache_lock:
                            cache["line_explanations"][exp_cache_key] = gen_comms
                        dashboard.update_worker(slot, sid, source_name, f"Explain Line {ln_num}", f"✓ Done ({len(gen_comms)} parts)")
                    else:
                        dashboard.update_worker(slot, sid, source_name, f"Explain Line {ln_num}", f"✗ Failed: {err}")

            # 2. Regenerate distractors for blank lines
            blank_lines = [int(ln) for ln, info in lines.items() if info.get("blank")]
            distractors = []

            for blank_ln in blank_lines:
                dashboard.update_worker(slot, sid, source_name, f"Distractors Line {blank_ln}", "Requesting LLM...")
                payload = {
                    "action": "generate-distractors",
                    "id": sid,
                    "language": language,
                    "statement": statement,
                    "solution": solution,
                    "line_number": blank_ln,
                    "n_distractors": 3
                }
                res, err = call_genai_api(session, api_url, payload)
                gen_distractors = []
                if res:
                    if isinstance(res, dict):
                        gen_distractors = res.get(str(blank_ln), res.get(blank_ln, []))
                    elif isinstance(res, list):
                        gen_distractors = res
                    dist_cache_key = f"{language}::{blank_ln}::{solution}::{statement}"
                    with cache_lock:
                        cache["distractors"][dist_cache_key] = gen_distractors
                    dashboard.update_worker(slot, sid, source_name, f"Distractors Line {blank_ln}", f"✓ Done ({len(gen_distractors)} opts)")
                else:
                    dashboard.update_worker(slot, sid, source_name, f"Distractors Line {blank_ln}", f"✗ Failed: {err}")

                for gd in gen_distractors:
                    g_code = gd.get("distractor", "")
                    g_exp = gd.get("explanation", "")
                    if g_code:
                        distractors.append({
                            "id": str(uuid.uuid4()),
                            "line": {
                                "number": 0,
                                "content": g_code,
                                "commentList": [g_exp] if g_exp else [],
                                "indentLevel": lines.get(str(blank_ln), {}).get("indentLevel", 0)
                            },
                            "helpList": [g_exp] if g_exp else []
                        })

            # 3. For any distractor without explanation, generate one
            for d_item in distractors:
                d_line = d_item.get("line") or {}
                d_content = d_line.get("content", "")
                d_comms = [c for c in d_line.get("commentList", []) if c.strip()]
                if not d_comms and d_content:
                    dashboard.update_worker(slot, sid, source_name, "Distractor Expl", f"'{d_content[:20]}'")
                    payload = {
                        "action": "generate-distractor-explanation",
                        "id": sid,
                        "language": language,
                        "statement": statement,
                        "solution": solution,
                        "line_number": blank_lines[0] if blank_lines else 1,
                        "distractor": d_content
                    }
                    res, err = call_genai_api(session, api_url, payload)
                    d_exp = ""
                    if res and isinstance(res, dict):
                        d_exp = res.get("explanation", "")
                        d_key = f"{language}::{d_content}::{solution}::{statement}"
                        with cache_lock:
                            cache["distractor_explanations"][d_key] = d_exp
                    if d_exp:
                        d_line["commentList"] = [d_exp]
                        d_item["helpList"] = [d_exp]
                        dashboard.update_worker(slot, sid, source_name, "Distractor Expl", f"✓ Done for '{d_content[:15]}'")

            source["lines"] = lines
            source["distractors"] = distractors

            # Save updated source locally
            with open(aug_path, "w", encoding="utf-8") as f:
                json.dump(source, f, indent=2)

            with cache_lock:
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)

        # 4. Push updated source immediately to server
        if not args.dry_run:
            dashboard.update_worker(slot, sid, source_name, "Pushing to server...", "")
            with mapping_lock:
                cloned_src_id = mapping.get("sources", {}).get(sid)

            with open(aug_path, "r", encoding="utf-8") as f:
                push_payload = json.load(f)

            push_payload.pop("id", None)
            push_payload.pop("_id", None)
            push_payload.pop("author", None)
            push_payload = transform_source_for_editor(push_payload, compile_flag=args.compile)

            if cloned_src_id:
                patch_url = f"{api_url}/bulk/sources/{cloned_src_id}?compile={compile_param}"
                status, resp = send_json_request(patch_url, bulk_headers, push_payload, ssl_ctx, method="PATCH")
                if status in (200, 201):
                    pushed = True
            else:
                post_url = f"{api_url}/bulk/sources?compile={compile_param}"
                status, resp = send_json_request(post_url, bulk_headers, push_payload, ssl_ctx, method="POST")
                if status in (200, 201) and isinstance(resp, dict):
                    new_src_id = resp.get("id")
                    if new_src_id:
                        with mapping_lock:
                            mapping["sources"][sid] = new_src_id
                            with open(mapping_file, "w", encoding="utf-8") as f:
                                json.dump(mapping, f, indent=2)
                        pushed = True

            # 5. Update local bundles referencing this source & push parent bundles
            with bundle_lock:
                for b_path in glob.glob(os.path.join(augmented_bundles_dir, "*.json")):
                    with open(b_path, "r", encoding="utf-8") as bf:
                        b_wrap = json.load(bf)
                    bundle = b_wrap.get("bundle", b_wrap)
                    bundle_modified = False

                    for item in bundle.get("items", []):
                        if item.get("item") == sid:
                            item["details"] = item.get("details", {})
                            item["details"]["name"] = source.get("name", item["details"].get("name", ""))
                            item["details"]["description"] = source.get("description", item["details"].get("description", ""))
                            bundle_modified = True

                    if bundle_modified:
                        with open(b_path, "w", encoding="utf-8") as bf:
                            json.dump(b_wrap, bf, indent=2)

                        old_b_id = os.path.splitext(os.path.basename(b_path))[0]
                        with mapping_lock:
                            cloned_b_id = mapping.get("bundles", {}).get(old_b_id)
                        if cloned_b_id:
                            remapped_items = []
                            for item in bundle.get("items", []):
                                i_old_id = item.get("item")
                                with mapping_lock:
                                    i_new_id = mapping.get("sources", {}).get(i_old_id, i_old_id)
                                remapped_items.append({
                                    "item": i_new_id,
                                    "type": item.get("type", "example"),
                                    "details": item.get("details", {})
                                })

                            b_payload = {
                                "name": bundle.get("name", "Untitled Activity"),
                                "user": bundle.get("user") or "moh70@pitt.edu",
                                "iso_language_code": "en",
                                "published": bundle.get("published", True),
                                "collaborator_emails": COLLABORATOR_EMAILS,
                                "items": remapped_items,
                                "compile": args.compile
                            }
                            b_patch_url = f"{api_url}/bulk/activities/{cloned_b_id}?compile={compile_param}"
                            send_json_request(b_patch_url, bulk_headers, b_payload, ssl_ctx, method="PATCH")

        dashboard.mark_completed(slot, idx, sid, source_name, pushed=pushed)
        return sid, True, pushed

    finally:
        dashboard.release_slot(slot)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    matched_sources_dir = os.path.join(script_dir, "matched_sources")
    augmented_sources_dir = os.path.join(script_dir, "augmented_sources")
    augmented_bundles_dir = os.path.join(script_dir, "augmented_bundles")
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
    cache_file = os.path.join(script_dir, "genai_cache.json")

    default_api = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")
    parser = argparse.ArgumentParser(description="Regenerate English explanations for Spanish sources and immediately push updates to server (with parallel execution support).")
    parser.add_argument("--api", default=default_api, help=f"API Base URL (default: {default_api})")
    parser.add_argument("-w", "--workers", type=int, default=4, help="Number of parallel workers for concurrent generation & push (default: 4)")
    parser.add_argument("--compile", action="store_true", default=False, help="Recompile sources & activities on server (default: False)")
    parser.add_argument("--no-compile", dest="compile", action="store_false", help="Disable compilation on server during push")
    parser.add_argument("--push-only", action="store_true", help="Skip generation and only push existing local augmented files to server")
    parser.add_argument("--dry-run", action="store_true", help="Perform generation and local saves without pushing to remote server")
    parser.add_argument("--source-id", default=None, help="Process a single specific source ID instead of all Spanish sources")
    args = parser.parse_args()

    api_url = args.api.rstrip("/")
    compile_param = "true" if args.compile else "false"

    print("=" * 82)
    print("PCEX SPANISH REGENERATION PIPELINE")
    print("=" * 82)
    print(f"Target API:          {api_url}")
    print(f"Parallel Workers:    {args.workers}")
    print(f"Auto-push to server: {'DISABLED (--dry-run)' if args.dry_run else 'ENABLED (immediate per source)'}")
    print(f"Compile on server:   {'N/A (--dry-run)' if args.dry_run else ('ENABLED (compile=true)' if args.compile else 'DISABLED (compile=false)')}")
    print(f"Mapping File:        {mapping_file}\n")

    # Load mapping
    mapping = {"sources": {}, "bundles": {}}
    if os.path.exists(mapping_file):
        with open(mapping_file, "r", encoding="utf-8") as f:
            mapping = json.load(f)

    # Find sources to regenerate
    aug_files = sorted(glob.glob(os.path.join(augmented_sources_dir, "*.json")))
    spanish_source_ids = []

    for f_path in aug_files:
        with open(f_path, "r", encoding="utf-8") as f:
            s_data = json.load(f)
        sid = s_data.get("id") or s_data.get("_id")
        if args.source_id and sid != args.source_id:
            continue
        if args.source_id or is_spanish_source(s_data):
            spanish_source_ids.append(sid)

    print(f"Found {len(spanish_source_ids)} Spanish source(s) to process.\n")
    if not spanish_source_ids:
        print("No Spanish sources found! All sources appear to be in English.")
        return

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    # Authenticate
    session = None
    if not args.push_only:
        email, password = get_credentials(script_dir)
        session = get_genai_session(api_url, email, password, ssl_ctx)

    api_token = get_api_token(script_dir) if not args.dry_run else ""
    bulk_headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Regenerator/1.0"
    }

    # Cache
    cache = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}
    for bucket in ["line_explanations", "distractors", "distractor_explanations"]:
        if bucket not in cache:
            cache[bucket] = {}

    total_count = len(spanish_source_ids)
    effective_workers = min(args.workers, total_count)
    dashboard = Dashboard(total_count, effective_workers)
    dashboard.render()

    start_time = time.time()

    if effective_workers > 1:
        with ThreadPoolExecutor(max_workers=effective_workers) as executor:
            futures = {
                executor.submit(
                    process_single_source,
                    sid,
                    idx,
                    total_count,
                    api_url,
                    compile_param,
                    args,
                    session,
                    bulk_headers,
                    ssl_ctx,
                    matched_sources_dir,
                    augmented_sources_dir,
                    augmented_bundles_dir,
                    mapping_file,
                    cache_file,
                    mapping,
                    cache,
                    dashboard
                ): sid
                for idx, sid in enumerate(spanish_source_ids, 1)
            }

            for future in as_completed(futures):
                sid = futures[future]
                try:
                    future.result()
                except Exception as e:
                    pass
    else:
        # Sequential execution
        for idx, sid in enumerate(spanish_source_ids, 1):
            try:
                process_single_source(
                    sid,
                    idx,
                    total_count,
                    api_url,
                    compile_param,
                    args,
                    session,
                    bulk_headers,
                    ssl_ctx,
                    matched_sources_dir,
                    augmented_sources_dir,
                    augmented_bundles_dir,
                    mapping_file,
                    cache_file,
                    mapping,
                    cache,
                    dashboard
                )
            except Exception as e:
                pass

    dashboard.finish()
    elapsed = time.time() - start_time
    print("\n" + "=" * 82)
    print("REGENERATION COMPLETE!")
    print("=" * 82)
    print(f"Total Sources Completed: {dashboard.completed_count}/{total_count}")
    if not args.dry_run:
        print(f"Total Sources Pushed:    {dashboard.pushed_count}/{total_count}")
    print(f"Total Elapsed Time:      {elapsed:.1f}s ({elapsed/60:.1f} mins)")
    print("=" * 82)


if __name__ == "__main__":
    main()
