import os
import glob
import json
import argparse
import ssl
import urllib.request
import urllib.error

DEFAULT_API_URL = os.environ.get("PCEX_API_URL", "http://localhost:3000/api")

def get_api_token(script_dir):
    """Retrieves API token from environment, file, or interactive prompt."""
    if os.environ.get("PCEX_API_TOKEN"):
        return os.environ["PCEX_API_TOKEN"]
        
    token_file = os.path.join(script_dir, "api_token.txt")
    if os.path.exists(token_file):
        with open(token_file, "r", encoding="utf-8") as f:
            token = f.read().strip()
            if token:
                return token
                
    token = input("Enter PCEX Bulk API Token: ").strip()
    return token

def load_mapping(mapping_file):
    if os.path.exists(mapping_file):
        try:
            with open(mapping_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"sources": {}, "bundles": {}}

def save_mapping(mapping_data, mapping_file):
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping_data, f, indent=2)

def send_json_request(url, headers, payload, ctx):
    """Sends a JSON POST request using standard urllib."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def transform_source_for_editor(source_payload):
    """
    Transforms lines and distractors to match the PCEX editor & compiler schema:
    - lines[ln].comments: [{'content': '...'}]
    - distractors: [{'code': '...', 'description': '...', 'line_number': 0}]
    """
    lines = source_payload.get("lines", {})
    for ln_str, info in lines.items():
        if "comments" not in info or info["comments"] is None:
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
    parser = argparse.ArgumentParser(description="Bulk insert augmented sources and bundles into PCEX Authoring database as clones.")
    parser.add_argument("--api", default=DEFAULT_API_URL, help=f"API Base URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--token", default=None, help="Bulk API token (default: read from api_token.txt)")
    parser.add_argument("--compile", action="store_true", default=False, help="Compile sources and activities during ingestion (default: False)")
    parser.add_argument("--skip-bundles", action="store_true", help="Only insert sources, skip bundles")
    parser.add_argument("--reset", action="store_true", help="Reset mapping and re-import all items")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    augmented_sources_dir = os.path.join(script_dir, "augmented_sources")
    augmented_bundles_dir = os.path.join(script_dir, "augmented_bundles")
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")

    api_url = args.api.rstrip("/")
    api_token = args.token or get_api_token(script_dir)
    
    if args.reset and os.path.exists(mapping_file):
        os.remove(mapping_file)
        print("Reset mapping file.")

    mapping = load_mapping(mapping_file)
    if "sources" not in mapping:
        mapping["sources"] = {}
    if "bundles" not in mapping:
        mapping["bundles"] = {}

    headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Bulk-Importer/1.0"
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    compile_query = "true" if args.compile else "false"

    print("=" * 65)
    print("PCEX Bulk Ingestion: Augmented Clones")
    print("=" * 65)
    print(f"Target API Base URL: {api_url}")
    print(f"Compilation during import: {'ENABLED' if args.compile else 'DISABLED (compile=false)'}")
    print(f"Mapping / Checkpoint File: {mapping_file}")
    print(f"Sources Dir: {augmented_sources_dir}")
    print(f"Bundles Dir: {augmented_bundles_dir}\n")

    # ---------------------------------------------------------
    # 1. Ingest Augmented Sources
    # ---------------------------------------------------------
    source_files = sorted(glob.glob(os.path.join(augmented_sources_dir, "*.json")))
    print(f"--- [1/2] Ingesting Sources ({len(source_files)} total) ---")
    
    sources_to_insert = []
    for sf in source_files:
        old_id = os.path.splitext(os.path.basename(sf))[0]
        if old_id not in mapping["sources"]:
            sources_to_insert.append((old_id, sf))

    print(f"  • {len(mapping['sources'])} already imported.")
    print(f"  • {len(sources_to_insert)} pending insertion.\n")

    sources_endpoint = f"{api_url}/bulk/sources?compile={compile_query}"

    for idx, (old_src_id, s_path) in enumerate(sources_to_insert, 1):
        with open(s_path, "r", encoding="utf-8") as f:
            source_payload = json.load(f)

        # Remove old IDs to ensure creation as a new clone
        source_payload.pop("id", None)
        source_payload.pop("_id", None)
        source_payload.pop("author", None)  # Mongoose expects 'user' email string
        source_payload["compile"] = args.compile

        # Transform lines.comments and distractors for compiler & editor schema
        source_payload = transform_source_for_editor(source_payload)

        status_code, resp_data = send_json_request(sources_endpoint, headers, source_payload, ctx)
        if status_code in (200, 201) and isinstance(resp_data, dict):
            new_src_id = resp_data.get("id")
            if new_src_id:
                mapping["sources"][old_src_id] = new_src_id
                save_mapping(mapping, mapping_file)
                print(f"  [{idx}/{len(sources_to_insert)}] ✓ Source cloned: {old_src_id} -> {new_src_id} ({source_payload.get('name', '')[:40]})")
            else:
                print(f"  [{idx}/{len(sources_to_insert)}] ✗ Invalid response: {resp_data}")
        else:
            print(f"  [{idx}/{len(sources_to_insert)}] ✗ Failed ({status_code}): {resp_data}")

    print(f"\nFinished Sources: {len(mapping['sources'])}/{len(source_files)} total mapped.\n")

    if args.skip_bundles:
        print("Skipping bundle ingestion as requested (--skip-bundles).")
        return

    # ---------------------------------------------------------
    # 2. Ingest Augmented Bundles (Activities)
    # ---------------------------------------------------------
    bundle_files = sorted(glob.glob(os.path.join(augmented_bundles_dir, "*.json")))
    print(f"--- [2/2] Ingesting Bundles ({len(bundle_files)} total) ---")

    bundles_to_insert = []
    for bf in bundle_files:
        old_bundle_id = os.path.splitext(os.path.basename(bf))[0]
        if old_bundle_id not in mapping["bundles"]:
            bundles_to_insert.append((old_bundle_id, bf))

    print(f"  • {len(mapping['bundles'])} already imported.")
    print(f"  • {len(bundles_to_insert)} pending insertion.\n")

    activities_endpoint = f"{api_url}/bulk/activities?compile={compile_query}"

    for idx, (old_bundle_id, b_path) in enumerate(bundles_to_insert, 1):
        with open(b_path, "r", encoding="utf-8") as f:
            wrapper = json.load(f)

        bundle = wrapper.get("bundle", wrapper)
        user_email = bundle.get("user") or (bundle.get("author") or {}).get("email", "")

        # Map each item's source ID from old to new clone ID
        remapped_items = []
        missing_source = False

        for item in bundle.get("items", []):
            old_src_id = item.get("item")
            new_src_id = mapping["sources"].get(old_src_id)
            if not new_src_id:
                print(f"  ✗ Warning: Bundle {old_bundle_id} references unmapped source {old_src_id}. Skipping bundle.")
                missing_source = True
                break

            remapped_items.append({
                "item": new_src_id,
                "type": item.get("type", "example"),
                "details": item.get("details", {})
            })

        if missing_source:
            continue

        activity_payload = {
            "name": bundle.get("name", "Untitled Activity"),
            "user": user_email,
            "iso_language_code": bundle.get("iso_language_code", "en"),
            "published": bundle.get("published", True),
            "collaborator_emails": bundle.get("collaborator_emails", []),
            "items": remapped_items,
            "compile": args.compile
        }

        status_code, resp_data = send_json_request(activities_endpoint, headers, activity_payload, ctx)
        if status_code in (200, 201) and isinstance(resp_data, dict):
            new_act_id = resp_data.get("id")
            if new_act_id:
                mapping["bundles"][old_bundle_id] = new_act_id
                save_mapping(mapping, mapping_file)
                print(f"  [{idx}/{len(bundles_to_insert)}] ✓ Bundle cloned: {old_bundle_id} -> {new_act_id} ({activity_payload['name']})")
            else:
                print(f"  [{idx}/{len(bundles_to_insert)}] ✗ Invalid response: {resp_data}")
        else:
            print(f"  [{idx}/{len(bundles_to_insert)}] ✗ Failed ({status_code}): {resp_data}")

    print("=" * 65)
    print("Ingestion Complete!")
    print(f"Total Sources Cloned: {len(mapping['sources'])}/{len(source_files)}")
    print(f"Total Bundles Cloned: {len(mapping['bundles'])}/{len(bundle_files)}")
    print(f"Mapping saved to: {mapping_file}")
    print("=" * 65)

if __name__ == "__main__":
    main()
