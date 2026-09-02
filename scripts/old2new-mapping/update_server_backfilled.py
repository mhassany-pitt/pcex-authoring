#!/usr/bin/env python3
"""
update_server_backfilled.py

Pushes the 33 backfilled sources to the PCEX Authoring server via PATCH /bulk/sources/<id>:
- Reads updated JSON from 'backfilled_sources/<sid>.json'
- Ensures 'validation-pending;color=orange' tag is attached for reviewer queue
- Uses the bulk API token to update the server without compiling on the fly (?compile=false)
"""

import os
import sys
import json
import glob
import time
import ssl
import urllib.request
import urllib.error

DEFAULT_API_URL = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")

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

def send_json_patch(url, headers, payload, ssl_ctx):
    """Sends a JSON PATCH request to the PCEX bulk API."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def transform_source_for_editor(source_payload):
    """Transforms lines.comments and distractors for compiler & editor schema."""
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
    return source_payload

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backfilled_dir = os.path.join(script_dir, "backfilled_sources")
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")

    if not os.path.exists(mapping_file):
        print(f"Error: Mapping file not found at {mapping_file}")
        sys.exit(1)

    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    sources_map = mapping.get("sources", {})

    api_token = get_api_token(script_dir)
    api_url = DEFAULT_API_URL.rstrip("/")

    headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Backfill-Pusher/1.0"
    }

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    # Find the 33 sources that have [backfilled] distractors
    all_backfilled_files = sorted(glob.glob(os.path.join(backfilled_dir, "*.json")))
    sources_to_update = []

    for f_path in all_backfilled_files:
        sid = os.path.splitext(os.path.basename(f_path))[0]
        with open(f_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        has_backfilled = any(d.get("description", "").startswith("[backfilled]") for d in data.get("distractors", []))
        if has_backfilled:
            server_id = sources_map.get(sid)
            if server_id:
                sources_to_update.append((sid, server_id, f_path, data))
            else:
                print(f"Warning: No mapped server ID found for {sid}")

    print("=" * 75)
    print("PUSHING BACKFILLED SOURCES TO PCEX AUTHORING SERVER")
    print("=" * 75)
    print(f"Target API:          {api_url}")
    print(f"Sources to Update:   {len(sources_to_update)}")
    print(f"Compilation:         DISABLED (compile=false)\n")

    success_count = 0
    fail_count = 0

    for idx, (old_sid, server_id, f_path, source_data) in enumerate(sources_to_update, 1):
        # Prepare payload
        payload = dict(source_data)
        payload.pop("id", None)
        payload.pop("_id", None)
        payload.pop("author", None)
        payload["user"] = payload.get("user") or "moh70@pitt.edu"
        payload["compile"] = False

        # Ensure validation-pending tag is present
        tags = payload.get("tags", [])
        if not any("validation-pending" in t for t in tags):
            tags.append("validation-pending;color=orange")
        payload["tags"] = list(dict.fromkeys(tags))

        # Format lines.comments and distractors
        payload = transform_source_for_editor(payload)

        patch_url = f"{api_url}/bulk/sources/{server_id}?compile=false"
        status, resp = send_json_patch(patch_url, headers, payload, ssl_ctx)

        dist_cnt = len(payload.get("distractors", []))
        b_cnt = sum(1 for d in payload.get("distractors", []) if d.get("description", "").startswith("[backfilled]"))

        if status in (200, 201):
            success_count += 1
            print(f"[{idx:2d}/{len(sources_to_update)}] ✓ Source patched: {server_id} (old: {old_sid}) - {payload.get('name', '')[:35]} ({dist_cnt} distr, {b_cnt} backfilled)")
        else:
            fail_count += 1
            print(f"[{idx:2d}/{len(sources_to_update)}] ✗ Failed {server_id} ({status}): {resp}")

    print("\n" + "=" * 75)
    print(f"SERVER UPDATE COMPLETE!")
    print(f"✓ Successfully Patched: {success_count}/{len(sources_to_update)}")
    if fail_count > 0:
        print(f"✗ Failed:               {fail_count}/{len(sources_to_update)}")
    print("=" * 75)

if __name__ == "__main__":
    main()
