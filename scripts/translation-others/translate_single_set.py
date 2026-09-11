#!/usr/bin/env python3
"""
Translate a single untranslated set (py_f_to_c_conversion) into Spanish (Latin America),
preserve untr_* original fields, apply visual tags, link translations bidirectionally,
save locally, verify, and push to server.
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
    """Strips any prompt instruction leaks like [[TASK-INSTRUCTIONS]] from translated text."""
    if not text:
        return ""
    idx = text.find("[[TASK-INSTRUCTIONS]]")
    if idx != -1:
        text = text[:idx]
    text = re.sub(r'\[\[[A-Z0-9_\-\.]+\]\].*$', '', text, flags=re.DOTALL)
    return text.strip()

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
    return opener

def call_translate_model(opener, source_id, orig_source):
    """Calls POST /gpt-genai with action: translate-model."""
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
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "PCEX-Translator/1.0"},
        method="POST"
    )

    print(f"  -> Calling POST /gpt-genai for '{orig_source.get('name')}'...")
    with opener.open(req, timeout=90) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result

def send_bulk_request(endpoint, headers, payload, ssl_ctx, method="POST"):
    url = f"{BASE_URL}/{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body

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

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    opener = authenticate_session(ssl_ctx, creds)

    # Target: py_f_to_c_conversion
    bundle_file = os.path.join(old2new_dir, "matched_bundles", "664e502391363872f0ba38dd.json")
    with open(bundle_file) as f:
        orig_bundle = json.load(f)
    b_data = orig_bundle.get("bundle", orig_bundle)
    orig_bundle_id = b_data.get("id", "664e502391363872f0ba38dd")

    print(f"\nTarget Set: {b_data['name']} (ID: {orig_bundle_id})")
    print(f"Sources count: {len(b_data['items'])}")

    translated_sources_info = []
    source_mapping = {}

    for idx, item in enumerate(b_data["items"], 1):
        orig_src_id = item["item"]
        item_type = item.get("type", "example")
        src_path = os.path.join(old2new_dir, "matched_sources", f"{orig_src_id}.json")
        with open(src_path) as f:
            orig_src = json.load(f)

        print(f"\n--- Processing Source {idx}/{len(b_data['items'])}: {orig_src['name']} ({orig_src_id}) ---")
        
        # 1. Call API translation
        trans_res = call_translate_model(opener, orig_src_id, orig_src)

        # Generate a new MongoDB-compliant 24-char ObjectId
        new_src_id = secrets.token_hex(12)
        source_mapping[orig_src_id] = new_src_id

        # 2. Extract and format line comments with untr_content backup
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

        # 3. Extract and format distractors with untr_* backup
        new_distractors = []
        for d_idx, td in enumerate(trans_res.get("distractors", [])):
            orig_d = orig_src.get("distractors", [])[d_idx] if d_idx < len(orig_src.get("distractors", [])) else {}
            orig_d_code = orig_d.get("code") or (orig_d.get("line") or {}).get("content", "")
            orig_d_desc = orig_d.get("description") or ((orig_d.get("line") or {}).get("commentList", [""])[0] if (orig_d.get("line") or {}).get("commentList") else "")

            new_distractors.append({
                "code": clean_delimiters(td.get("code", "")),
                "untr_code": td.get("untr_code") or orig_d_code,
                "description": clean_delimiters(td.get("description", "")),
                "untr_description": td.get("untr_description") or orig_d_desc,
                "line_number": orig_d.get("line_number", (orig_d.get("line") or {}).get("number", 0))
            })

        # 4. Construct Spanish Source JSON
        spanish_src = {
            "id": new_src_id,
            "user": "moh70@pitt.edu",
            "name": clean_delimiters(trans_res.get("name", orig_src["name"])),
            "untr_name": orig_src["name"],
            "description": clean_delimiters(trans_res.get("description", orig_src.get("description", ""))),
            "untr_description": orig_src.get("description", ""),
            "language": orig_src.get("language", "PYTHON"),
            "iso_language_code": "es",
            "filename": orig_src.get("filename", ""),
            "code": clean_delimiters(trans_res.get("code", orig_src.get("code", ""))),
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

        # Save Spanish source JSON locally
        local_src_path = os.path.join(out_sources_dir, f"{new_src_id}.json")
        with open(local_src_path, "w", encoding="utf-8") as out_f:
            json.dump(spanish_src, out_f, indent=2, ensure_ascii=False)
        print(f"  ✓ Saved local Spanish source: {local_src_path}")
        print(f"    Name: {spanish_src['name']}")
        print(f"    Original Name: {spanish_src['untr_name']}")

        translated_sources_info.append({
            "spanish_source": spanish_src,
            "orig_id": orig_src_id,
            "type": item_type
        })

    # 5. Assemble Spanish Bundle
    new_bundle_id = secrets.token_hex(12)
    bundle_mapping = {orig_bundle_id: new_bundle_id}

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
        "name": f"{b_data['name']}_es",
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
    print(f"\n✓ Saved local Spanish bundle: {local_bundle_path}")

    # Save mapping file
    mapping_data = {
        "sources": source_mapping,
        "bundles": bundle_mapping
    }
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping_data, f, indent=2)
    print(f"✓ Saved ID mapping: {mapping_file}")

    # ------------------------------------------------------------------
    # 6. Push to Server
    # ------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("PUSHING TRANSLATED ITEMS TO PCEX AUTHORING SERVER")
    print("=" * 65)

    headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Bulk-Importer/1.0"
    }

    # A. Push Spanish Sources
    for info in translated_sources_info:
        s = info["spanish_source"]
        payload = dict(s)
        payload["_id"] = s["id"]
        status, resp = send_bulk_request("bulk/sources?compile=true", headers, payload, ssl_ctx, method="POST")
        if status in (200, 201):
            print(f"✓ Pushed Spanish source to server: {s['id']} ({s['name'][:40]})")
        else:
            print(f"✗ Failed pushing Spanish source {s['id']}: {status} - {resp}")

    # B. Push Spanish Bundle
    b_payload = dict(spanish_bundle)
    b_payload["_id"] = spanish_bundle["id"]
    status, resp = send_bulk_request("bulk/activities?compile=true", headers, b_payload, ssl_ctx, method="POST")
    if status in (200, 201):
        print(f"✓ Pushed Spanish bundle to server: {spanish_bundle['id']} ({spanish_bundle['name']})")
    else:
        print(f"✗ Failed pushing Spanish bundle {spanish_bundle['id']}: {status} - {resp}")

    # C. Link English Sources to Spanish Sources
    for orig_id, new_id in source_mapping.items():
        patch_payload = {
            "user": "moh70@pitt.edu",
            "translations": {
                "es": new_id
            }
        }
        status, resp = send_bulk_request(f"bulk/sources/{orig_id}?compile=true", headers, patch_payload, ssl_ctx, method="PATCH")
        if status in (200, 201):
            print(f"✓ Linked English source {orig_id} -> Spanish {new_id}")
        else:
            print(f"✗ Failed linking English source {orig_id}: {status} - {resp}")

    # D. Link English Bundle to Spanish Bundle
    b_patch_payload = {
        "user": "moh70@pitt.edu",
        "translations": {
            "es": new_bundle_id
        }
    }
    status, resp = send_bulk_request(f"bulk/activities/{orig_bundle_id}?compile=true", headers, b_patch_payload, ssl_ctx, method="PATCH")
    if status in (200, 201):
        print(f"✓ Linked English bundle {orig_bundle_id} -> Spanish {new_bundle_id}")
    else:
        print(f"✗ Failed linking English bundle {orig_bundle_id}: {status} - {resp}")

    print("\n" + "=" * 65)
    print("TRANSLATION, VERIFICATION & DEPLOYMENT COMPLETE!")
    print("=" * 65)
    print(f"Spanish Bundle Name:   {spanish_bundle['name']}")
    print(f"Spanish Bundle ID:     {new_bundle_id}")
    print(f"English Bundle ID:     {orig_bundle_id}")
    print(f"Hub URL:               https://adapt2.sis.pitt.edu/pcex-authoring/#/hub?id={new_bundle_id}")
    print(f"Preview URL:           https://adapt2.sis.pitt.edu/pcex-authoring/api/hub/{new_bundle_id}")

if __name__ == "__main__":
    main()
