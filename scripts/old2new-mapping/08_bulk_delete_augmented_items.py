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

def send_delete_request(url, headers, ctx):
    """Sends an HTTP DELETE request using standard urllib."""
    req = urllib.request.Request(
        url,
        headers=headers,
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def main():
    parser = argparse.ArgumentParser(description="Bulk delete previously imported augmented items via PCEX Bulk API.")
    parser.add_argument("--api", default=DEFAULT_API_URL, help=f"API Base URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--token", default=None, help="Bulk API token (default: read from api_token.txt)")
    parser.add_argument("--user", default="moh70@pitt.edu", help="Author email associated with items (default: moh70@pitt.edu)")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")

    if not os.path.exists(mapping_file):
        print(f"No mapping file found at {mapping_file}. Nothing to delete.")
        return

    mapping = load_mapping(mapping_file)
    sources_map = mapping.get("sources", {})
    bundles_map = mapping.get("bundles", {})

    if not sources_map and not bundles_map:
        print("Mapping file contains 0 imported items. Nothing to delete.")
        return

    api_url = args.api.rstrip("/")
    api_token = args.token or get_api_token(script_dir)
    user_email = args.user

    headers = {
        "api-token": api_token,
        "User-Agent": "PCEX-Bulk-Deleter/1.0"
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print("=" * 65)
    print("PCEX Bulk Deletion / Rollback")
    print("=" * 65)
    print(f"Target API Base URL: {api_url}")
    print(f"Author User: {user_email}")
    print(f"Bundles to Delete: {len(bundles_map)}")
    print(f"Sources to Delete: {len(sources_map)}\n")

    # 1. Delete Bundles (Activities) first
    deleted_bundles = 0
    for old_bid, new_act_id in list(bundles_map.items()):
        del_url = f"{api_url}/bulk/activities/{new_act_id}?user={urllib.parse.quote(user_email)}"
        status_code, resp = send_delete_request(del_url, headers, ctx)
        if status_code in (200, 204):
            deleted_bundles += 1
            print(f"  ✓ Deleted bundle: {new_act_id} (old: {old_bid})")
            del bundles_map[old_bid]
        elif status_code == 404:
            print(f"  - Bundle not found (already deleted): {new_act_id}")
            del bundles_map[old_bid]
        else:
            print(f"  ✗ Failed to delete bundle {new_act_id} ({status_code}): {resp}")

    # 2. Delete Sources
    deleted_sources = 0
    for old_sid, new_src_id in list(sources_map.items()):
        del_url = f"{api_url}/bulk/sources/{new_src_id}?user={urllib.parse.quote(user_email)}"
        status_code, resp = send_delete_request(del_url, headers, ctx)
        if status_code in (200, 204):
            deleted_sources += 1
            print(f"  ✓ Deleted source: {new_src_id} (old: {old_sid})")
            del sources_map[old_sid]
        elif status_code == 404:
            print(f"  - Source not found (already deleted): {new_src_id}")
            del sources_map[old_sid]
        else:
            print(f"  ✗ Failed to delete source {new_src_id} ({status_code}): {resp}")

    # Save updated mapping file
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)

    print("=" * 65)
    print(f"Deletion Complete! Deleted {deleted_bundles} bundles and {deleted_sources} sources.")
    print(f"Mapping file updated: {mapping_file}")
    print("=" * 65)

if __name__ == "__main__":
    import urllib.parse
    main()

