#!/usr/bin/env python3
"""
Translates all remaining sets from the 52 canonical PCEX sets into Spanish (Latin America).
Features:
- Preserves untr_* original fields for title, description, code, lines, and distractors.
- Applies standard tags (spanish-latam, llm-translation, gpt5mini, validation-pending).
- Links translations bidirectionally between English originals and Spanish clones.
- Compiles on server via bulk API (compile=true).
- Syncs every bundle to PAWS Catalog (/bundles/:id/sync).
- Saves local JSON files in translated_sources/ and translated_bundles/.
- Persistent checkpointing in mapping.json (safe to resume at any time).
- Concurrent source translation per bundle for optimal speed.
"""

import os
import sys
import json
import time
import ssl
import re
import secrets
import urllib.request
import urllib.error
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://adapt2.sis.pitt.edu/pcex-authoring/api"

TAGS = [
    "spanish-latam;color=yellow",
    "llm-translation;color=blue",
    "gpt5mini;color=purple",
    "validation-pending;color=orange"
]

COLLABORATORS = [
    "rah225@pitt.edu",
    "peterb@pitt.edu",
    "arl122@pitt.edu",
    "quinnkwolter@pitt.edu",
    "hua1007.yu@connect.polyu.hk"
]

def clean_delimiters(text):
    if not text:
        return ""
    if not isinstance(text, str):
        return text
    idx = text.find("[[TASK-INSTRUCTIONS]]")
    if idx != -1:
        text = text[:idx]
    text = re.sub(r'\[\[[A-Z0-9_\-\.]+\]\].*$', '', text, flags=re.DOTALL)
    return text.strip()

SESSION_HOLDER = {}

def authenticate_session(ssl_ctx, creds):
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        urllib.request.HTTPSHandler(context=ssl_ctx)
    )
    login_url = f"{BASE_URL}/auth/login"
    req = urllib.request.Request(
        login_url,
        data=json.dumps(creds).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "PCEX-Translator/1.0"},
        method="POST"
    )
    with opener.open(req, timeout=20) as resp:
        if resp.status not in (200, 201):
            raise Exception(f"Login failed: status {resp.status}")
    print("✓ Successfully authenticated session with PCEX API.")
    SESSION_HOLDER["opener"] = opener
    return opener

def call_translate_model(source_id, orig_source, max_retries=5):
    lines_model = {}
    for ln_str, info in orig_source.get("lines", {}).items():
        comm_list = info.get("commentList", info.get("comments", []))
        clean_comments = []
        for c in comm_list:
            if isinstance(c, str):
                clean_comments.append({"content": c})
            elif isinstance(c, dict) and "content" in c:
                clean_comments.append({"content": c["content"]})
        lines_model[str(ln_str)] = {"comments": clean_comments}

    dist_model = []
    for d in orig_source.get("distractors", []):
        code = d.get("code") or (d.get("line") or {}).get("content", "")
        desc = d.get("description")
        if not desc:
            comm_list = (d.get("line") or {}).get("commentList", [])
            if comm_list:
                desc = comm_list[0]
            elif d.get("helpList"):
                desc = d["helpList"][0]
            else:
                desc = ""
        dist_model.append({"code": code, "description": desc})

    payload = {
        "action": "translate-model",
        "id": source_id,
        "model": {
            "name": orig_source.get("name", ""),
            "description": orig_source.get("description", ""),
            "code": orig_source.get("code", ""),
            "lines": lines_model,
            "distractors": dist_model
        },
        "translation": {
            "target_language": "Spanish (Latin America)",
            "translate_classes": False,
            "translate_functions": False,
            "translate_variables": False,
            "translate_strings": True,
            "translate_comments": True
        }
    }

    url = f"{BASE_URL}/gpt-genai"
    data_bytes = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "User-Agent": "PCEX-Translator/1.0"}

    for attempt in range(1, max_retries + 1):
        try:
            opener = SESSION_HOLDER["opener"]
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
            with opener.open(req, timeout=90) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            if he.code in (401, 403):
                print(f"  [Notice] Session expired (code {he.code}), re-authenticating...")
                authenticate_session(SESSION_HOLDER["ssl_ctx"], SESSION_HOLDER["creds"])
            if attempt < max_retries:
                time.sleep(3 * attempt)
            else:
                raise Exception(f"Translation API failed for {source_id} after {max_retries} attempts: {he}")
        except Exception as e:
            if attempt < max_retries:
                time.sleep(3 * attempt)
            else:
                raise Exception(f"Translation API failed for {source_id} after {max_retries} attempts: {e}")

def send_bulk_request(endpoint, headers, payload, ssl_ctx, method="POST", max_retries=3, timeout=300):
    url = f"{BASE_URL}/{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8")
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            return e.code, err_body
        except Exception as e:
            print(f"  [Warning] Network/Timeout in {endpoint} (attempt {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                time.sleep(5 * attempt)
            else:
                raise e

def sync_bundle_to_paws(bundle_id):
    url = f"{BASE_URL}/bundles/{bundle_id}/sync?allUsers=true"
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"}, method="POST")
    try:
        opener = SESSION_HOLDER.get("opener")
        with opener.open(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as he:
        if he.code in (401, 403):
            authenticate_session(SESSION_HOLDER["ssl_ctx"], SESSION_HOLDER["creds"])
            opener = SESSION_HOLDER.get("opener")
            with opener.open(req, timeout=45) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body) if body else {}
        return he.code, str(he)
    except Exception as e:
        return 0, str(e)

def process_source(orig_src_id, item_type, orig_src, out_sources_dir, existing_mapping):
    if orig_src_id in existing_mapping["sources"]:
        new_src_id = existing_mapping["sources"][orig_src_id]
        local_src_path = os.path.join(out_sources_dir, f"{new_src_id}.json")
        if os.path.exists(local_src_path):
            with open(local_src_path) as f:
                cached_src = json.load(f)
            return {
                "spanish_source": cached_src,
                "orig_id": orig_src_id,
                "type": item_type,
                "reused": True
            }

    # Check if already translated locally
    if os.path.exists(out_sources_dir):
        for fname in os.listdir(out_sources_dir):
            if fname.endswith(".json"):
                fpath = os.path.join(out_sources_dir, fname)
                try:
                    with open(fpath) as f:
                        cand = json.load(f)
                    if cand.get("translations", {}).get("en") == orig_src_id:
                        existing_mapping["sources"][orig_src_id] = cand["id"]
                        return {
                            "spanish_source": cand,
                            "orig_id": orig_src_id,
                            "type": item_type,
                            "reused": True
                        }
                except Exception:
                    pass

    # Call API translation
    trans_res = call_translate_model(orig_src_id, orig_src)
    new_src_id = secrets.token_hex(12)

    # Format lines with untr_content backup
    new_lines = {}
    for ln_str, orig_ln_data in orig_src.get("lines", {}).items():
        trans_ln_data = trans_res.get("lines", {}).get(str(ln_str), {})
        trans_comments = trans_ln_data.get("comments", [])
        orig_comments = orig_ln_data.get("commentList", orig_ln_data.get("comments", []))

        combined_comments = []
        for c_idx, tc in enumerate(trans_comments):
            c_text = clean_delimiters(tc.get("content", ""))
            orig_c_text = ""
            if c_idx < len(orig_comments):
                orig_c_text = orig_comments[c_idx] if isinstance(orig_comments[c_idx], str) else orig_comments[c_idx].get("content", "")
            elif "untr_content" in tc:
                orig_c_text = tc["untr_content"]
            combined_comments.append({
                "content": c_text,
                "untr_content": orig_c_text
            })

        new_lines[str(ln_str)] = {
            "content": orig_ln_data.get("content", ""),
            "blank": orig_ln_data.get("blank", False),
            "indentLevel": orig_ln_data.get("indentLevel", 0),
            "comments": combined_comments
        }

    # Format distractors with untr_* backup
    new_distractors = []
    trans_distractors = trans_res.get("distractors", [])
    orig_distractors = orig_src.get("distractors", [])
    max_d = max(len(trans_distractors), len(orig_distractors))
    for d_idx in range(max_d):
        td = trans_distractors[d_idx] if d_idx < len(trans_distractors) else {}
        orig_d = orig_distractors[d_idx] if d_idx < len(orig_distractors) else {}
        orig_d_code = orig_d.get("code") or (orig_d.get("line") or {}).get("content", "")
        orig_d_desc = orig_d.get("description") or ((orig_d.get("line") or {}).get("commentList", [""])[0] if (orig_d.get("line") or {}).get("commentList") else "")

        new_distractors.append({
            "code": clean_delimiters(td.get("code", "")) or orig_d_code,
            "untr_code": td.get("untr_code") or orig_d_code,
            "description": clean_delimiters(td.get("description", "")) or orig_d_desc,
            "untr_description": td.get("untr_description") or orig_d_desc,
            "line_number": orig_d.get("line_number", (orig_d.get("line") or {}).get("number", 0))
        })

    trans_code = clean_delimiters(trans_res.get("code")) or orig_src.get("code", "")
    trans_name = clean_delimiters(trans_res.get("name")) or orig_src.get("name", "")
    trans_desc = clean_delimiters(trans_res.get("description")) or orig_src.get("description", "")

    spanish_src = {
        "id": new_src_id,
        "user": "moh70@pitt.edu",
        "name": trans_name,
        "untr_name": orig_src["name"],
        "description": trans_desc,
        "untr_description": orig_src.get("description", ""),
        "language": orig_src.get("language", "PYTHON"),
        "iso_language_code": "es",
        "filename": orig_src.get("filename", ""),
        "code": trans_code,
        "untr_code": orig_src.get("code", ""),
        "lines": new_lines,
        "distractors": new_distractors,
        "tags": TAGS,
        "translations": {
            "en": orig_src_id
        },
        "collaborator_emails": COLLABORATORS,
        "programInput": orig_src.get("programInput", "")
    }

    local_src_path = os.path.join(out_sources_dir, f"{new_src_id}.json")
    with open(local_src_path, "w", encoding="utf-8") as out_f:
        json.dump(spanish_src, out_f, indent=2, ensure_ascii=False)

    return {
        "spanish_source": spanish_src,
        "orig_id": orig_src_id,
        "type": item_type,
        "reused": False
    }

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    old2new_dir = os.path.join(workspace_dir, "scripts", "old2new-mapping")
    
    out_sources_dir = os.path.join(script_dir, "translated_sources")
    out_bundles_dir = os.path.join(script_dir, "translated_bundles")
    mapping_file = os.path.join(script_dir, "mapping.json")

    os.makedirs(out_sources_dir, exist_ok=True)
    os.makedirs(out_bundles_dir, exist_ok=True)

    with open(os.path.join(old2new_dir, "auth_credentials.json")) as f:
        creds = json.load(f)
    with open(os.path.join(old2new_dir, "api_token.txt")) as f:
        api_token = f.read().strip()

    mapping_data = {"sources": {}, "bundles": {}}
    if os.path.exists(mapping_file):
        try:
            with open(mapping_file) as f:
                mapping_data = json.load(f)
        except Exception:
            pass

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    SESSION_HOLDER["ssl_ctx"] = ssl_ctx
    SESSION_HOLDER["creds"] = creds
    opener = authenticate_session(ssl_ctx, creds)

    # Fetch live hub to find which bases are already translated
    url = f"{BASE_URL}/hub"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
        hub_data = json.loads(resp.read().decode("utf-8"))

    def clean_to_base(n):
        n = re.sub(r'__[a-f0-9]{24}$', '', n)
        n = re.sub(r'_es$', '', n)
        n = re.sub(r'_llm$', '', n)
        return n

    # Find which sets already have Spanish version
    es_bases = set(clean_to_base(a["name"]) for a in hub_data if a.get("iso_language_code") == "es")

    # Load 52 matched bundles
    bundle_files = sorted(glob_files(os.path.join(old2new_dir, "matched_bundles", "*.json")))
    
    pending_bundles = []
    for bf in bundle_files:
        with open(bf) as f:
            d = json.load(f)
        b = d.get("bundle", d)
        b_base = clean_to_base(b["name"])
        # If not in es_bases and not already in mapping bundles
        if b_base not in es_bases and b["id"] not in mapping_data["bundles"]:
            pending_bundles.append((bf, b))

    print(f"\nFound {len(pending_bundles)} bundles pending translation:")
    total_sources_pending = sum(len(b["items"]) for _, b in pending_bundles)
    print(f"Total sources pending: {total_sources_pending}\n")

    headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Bulk-Importer/1.0"
    }

    processed_sources_count = 0
    total_bundles = len(pending_bundles)

    for b_idx, (bf, b_data) in enumerate(pending_bundles, 1):
        orig_bundle_id = b_data["id"]
        b_name = b_data["name"]
        items = b_data.get("items", [])
        print("=" * 70)
        print(f"[{b_idx}/{total_bundles}] BUNDLE: {b_name} ({len(items)} sources)")
        print("=" * 70)

        # 1. Translate sources in parallel for this bundle
        translated_sources_info = []
        with ThreadPoolExecutor(max_workers=min(len(items), 4)) as executor:
            future_to_src = {}
            for item in items:
                orig_src_id = item["item"]
                item_type = item.get("type", "example")
                src_path = os.path.join(old2new_dir, "matched_sources", f"{orig_src_id}.json")
                with open(src_path) as f:
                    orig_src = json.load(f)
                
                fut = executor.submit(process_source, orig_src_id, item_type, orig_src, out_sources_dir, mapping_data)
                future_to_src[fut] = (orig_src_id, orig_src.get("name"))

            for fut in as_completed(future_to_src):
                orig_src_id, src_name = future_to_src[fut]
                try:
                    res = fut.result()
                    translated_sources_info.append(res)
                    reused_str = " (cached)" if res.get("reused") else ""
                    print(f"  ✓ Source translated{reused_str}: '{res['spanish_source']['name']}' [{orig_src_id} -> {res['spanish_source']['id']}]")
                except Exception as e:
                    print(f"  ✗ Error translating source {orig_src_id} ({src_name}): {e}")
                    raise e

        # Order sources to match original bundle items order
        order_map = {item["item"]: i for i, item in enumerate(items)}
        translated_sources_info.sort(key=lambda x: order_map.get(x["orig_id"], 0))

        # 2. Push Spanish sources to server & link English sources
        for info in translated_sources_info:
            s = info["spanish_source"]
            orig_src_id = info["orig_id"]
            mapping_data["sources"][orig_src_id] = s["id"]

            payload = dict(s)
            payload["_id"] = s["id"]
            status, resp = send_bulk_request("bulk/sources?compile=true", headers, payload, ssl_ctx, method="POST")
            if status not in (200, 201):
                print(f"  ⚠️ Warning pushing source {s['id']}: {status} - {resp}")

            # Link English source to Spanish
            patch_payload = {
                "user": "moh70@pitt.edu",
                "translations": {
                    "es": s["id"]
                }
            }
            send_bulk_request(f"bulk/sources/{orig_src_id}?compile=true", headers, patch_payload, ssl_ctx, method="PATCH")
            processed_sources_count += 1
            print(f"  ✓ Ingested source [{processed_sources_count}/{total_sources_pending}] ({(processed_sources_count/total_sources_pending)*100:.1f}%): '{s['name']}'")

            with open(mapping_file, "w", encoding="utf-8") as f:
                json.dump(mapping_data, f, indent=2)

        # 3. Assemble Spanish Bundle
        new_bundle_id = secrets.token_hex(12)
        mapping_data["bundles"][orig_bundle_id] = new_bundle_id

        spanish_bundle_items = []
        for info in translated_sources_info:
            s = info["spanish_source"]
            spanish_bundle_items.append({
                "item": s["id"],
                "type": info["type"],
                "details": {
                    "name": s["name"],
                    "description": s["description"],
                    "language": s["language"],
                    "iso_language_code": s["iso_language_code"],
                    "tags": s["tags"],
                    "translations": s["translations"]
                }
            })

        spanish_bundle = {
            "id": new_bundle_id,
            "name": f"{b_name}_es",
            "iso_language_code": "es",
            "published": True,
            "archived": False,
            "user": "moh70@pitt.edu",
            "collaborator_emails": COLLABORATORS,
            "items": spanish_bundle_items,
            "translations": {
                "en": orig_bundle_id
            }
        }

        local_bundle_path = os.path.join(out_bundles_dir, f"{new_bundle_id}.json")
        with open(local_bundle_path, "w", encoding="utf-8") as out_f:
            json.dump(spanish_bundle, out_f, indent=2, ensure_ascii=False)

        # 4. Push Spanish Bundle & Link English Bundle
        b_payload = dict(spanish_bundle)
        b_payload["_id"] = new_bundle_id
        status, resp = send_bulk_request("bulk/activities?compile=true", headers, b_payload, ssl_ctx, method="POST")
        if status in (200, 201):
            print(f"  ✓ Pushed & compiled Spanish bundle: {new_bundle_id} ({spanish_bundle['name']})")
        else:
            # If already created or timed out, attempt PATCH to recompile and update
            p_status, p_resp = send_bulk_request(f"bulk/activities/{new_bundle_id}?compile=true", headers, b_payload, ssl_ctx, method="PATCH")
            if p_status in (200, 201):
                print(f"  ✓ Updated & compiled Spanish bundle: {new_bundle_id} ({spanish_bundle['name']})")
            else:
                print(f"  ⚠️ Warning pushing bundle {new_bundle_id}: {status} - {resp}")

        # Link English bundle
        b_patch_payload = {
            "user": "moh70@pitt.edu",
            "translations": {
                "es": new_bundle_id
            }
        }
        send_bulk_request(f"bulk/activities/{orig_bundle_id}?compile=true", headers, b_patch_payload, ssl_ctx, method="PATCH")

        # 5. Sync to PAWS Catalog
        paws_status, paws_resp = sync_bundle_to_paws(new_bundle_id)
        sync_ok = "✓ Synced to PAWS" if paws_status == 201 else f"⚠️ PAWS sync warning ({paws_status})"
        print(f"  {sync_ok} for {spanish_bundle['name']}")

        # Save mapping checkpoint
        with open(mapping_file, "w", encoding="utf-8") as f:
            json.dump(mapping_data, f, indent=2)

        print(f"  ✓ Checkpoint saved. Overall progress: [{b_idx}/{total_bundles} bundles ({(b_idx/total_bundles)*100:.1f}%) | {processed_sources_count}/{total_sources_pending} sources ({(processed_sources_count/total_sources_pending)*100:.1f}%)]\n")

    print("=" * 70)
    print("ALL REMAINING BUNDLES SUCCESSFULLY TRANSLATED, COMPILED & SYNCED!")
    print("=" * 70)

def glob_files(pattern):
    import glob
    return glob.glob(pattern)

if __name__ == "__main__":
    main()
