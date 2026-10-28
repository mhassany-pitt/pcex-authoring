#!/usr/bin/env python3
"""
import_to_pcex.py

Imports converted AnnEx and WebEx sources and activity bundles into PCEX Authoring
under moh70@pitt.edu via the Bulk API.

Features:
- Safe dry-run mode (--dry-run)
- Batch limiting for testing (--limit N)
- Provider filtering (--provider annex|webex)
- Tag synchronization for existing CSEdPad bundles (--update-csedpad)
- Bulk import with compile=false to prevent server load spikes
- Progress tracking, error logging, and resumption capability
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error
import ssl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
SOURCES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_sources.json")
ACTIVITIES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_activities.json")
IMPORT_LOG_FILE = os.path.join(DOWNLOADS_DIR, "import_progress.json")

API_BASE = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
API_TOKEN_FILE = os.path.join(BASE_DIR, "..", "load-annex_sql-into-weat", "weat_api_token.txt")

SSL_CTX = ssl._create_unverified_context()

def get_api_token():
    if os.path.exists(API_TOKEN_FILE):
        with open(API_TOKEN_FILE) as f:
            return f.read().strip()
    return "6d0c8d21-8cf7-4550-bcf2-3c7b26ed99f3"

def api_post(endpoint, data, token, params=None):
    url = f"{API_BASE}/{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "api-token": token,
            "User-Agent": "Mozilla/5.0"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def api_patch(endpoint, data, token, params=None):
    url = f"{API_BASE}/{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "api-token": token,
            "User-Agent": "Mozilla/5.0"
        },
        method="PATCH"
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def update_existing_csedpad(token, dry_run=False):
    print("\n--- Updating Existing CSEdPad Bundles with Tags ---")
    req = urllib.request.Request(f"{API_BASE}/hub")
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        hub_data = json.loads(r.read().decode("utf-8"))

    csedpad_bundles = [b for b in hub_data if "csedpad" in b.get("name", "").lower() and (b.get("author") or {}).get("email") == "moh70@pitt.edu"]
    print(f"Found {len(csedpad_bundles)} CSEdPad bundles under moh70@pitt.edu in Hub.")

    updated_count = 0
    for idx, b in enumerate(csedpad_bundles, 1):
        b_id = b["id"]
        b_name = b.get("name", "")
        items = b.get("items", [])
        modified = False

        for it in items:
            details = it.get("details", {})
            current_tags = details.get("tags", [])
            new_tags = list(current_tags)

            # Ensure annex;color=green is present
            if "annex;color=green" not in new_tags:
                new_tags.append("annex;color=green")
                modified = True
            if "csedpad" not in new_tags:
                new_tags.append("csedpad")
                modified = True
            key_tag = f"annex_key:{b_name}"
            if key_tag not in new_tags:
                new_tags.append(key_tag)
                modified = True

            details["tags"] = new_tags

        if modified:
            print(f"[{idx}/{len(csedpad_bundles)}] Patching {b_name} ({b_id})...")
            if not dry_run:
                try:
                    payload = {
                        "user": "moh70@pitt.edu",
                        "name": b_name,
                        "items": items,
                        "published": True
                    }
                    api_patch(f"bulk/activities/{b_id}", payload, token, params={"compile": "true"})
                    updated_count += 1
                except Exception as e:
                    print(f"  Error updating {b_id}: {e}")
            else:
                updated_count += 1

    print(f"CSEdPad Tag Update complete. Updated: {updated_count}/{len(csedpad_bundles)}")

def main():
    parser = argparse.ArgumentParser(description="Import AnnEx and WebEx into PCEX")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of items to import")
    parser.add_argument("--provider", type=str, choices=["annex", "webex", "all"], default="all", help="Filter provider")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without posting to server")
    parser.add_argument("--update-csedpad", action="store_true", help="Update existing CSEdPad bundles tags")
    args = parser.parse_args()

    token = get_api_token()
    print(f"Using Bulk API Token: {token[:6]}...{token[-4:]}")

    if args.update_csedpad:
        update_existing_csedpad(token, dry_run=args.dry_run)
        if not args.limit and args.provider == "all":
            return

    if not os.path.exists(SOURCES_FILE) or not os.path.exists(ACTIVITIES_FILE):
        print("Error: Converted source/activity JSON files not found. Run convert_to_pcex.py first.")
        sys.exit(1)

    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        sources = json.load(f)
    with open(ACTIVITIES_FILE, "r", encoding="utf-8") as f:
        activities = json.load(f)

    # Filter by provider if specified
    if args.provider != "all":
        prov_target = "AnnEx" if args.provider == "annex" else "WebEx"
        paired = [(s, a) for s, a in zip(sources, activities) if s.get("_provider") == prov_target]
    else:
        paired = list(zip(sources, activities))

    if args.limit:
        paired = paired[:args.limit]

    print(f"\nReady to import {len(paired)} items (Dry run: {args.dry_run})")
    print(f"Target account: moh70@pitt.edu")

    progress = {}
    if os.path.exists(IMPORT_LOG_FILE):
        try:
            with open(IMPORT_LOG_FILE) as f:
                progress = json.load(f)
        except Exception:
            pass

    success_count = 0
    skipped_count = 0
    fail_count = 0

    for idx, (source, activity) in enumerate(paired, 1):
        origin_id = source.get("_origin_id")
        provider = source.get("_provider")
        title = source.get("name")

        # Check if already imported in progress log
        if origin_id in progress and not args.dry_run:
            print(f"[{idx}/{len(paired)}] (Skipping already imported) {provider} {origin_id}")
            skipped_count += 1
            continue

        print(f"[{idx}/{len(paired)}] Importing {provider} - {title} ({origin_id})...")

        if args.dry_run:
            success_count += 1
            continue

        # Clean private internal metadata before API submission
        s_payload = {k: v for k, v in source.items() if not k.startswith("_")}
        a_payload = {k: v for k, v in activity.items() if not k.startswith("_")}

        try:
            # 1. Create Source
            src_res = api_post("bulk/sources", s_payload, token, params={"compile": "false"})
            source_id = src_res.get("id")
            if not source_id:
                raise Exception(f"Failed to get created source_id: {src_res}")

            # 2. Attach created source_id to activity bundle
            a_payload["items"][0]["item"] = source_id

            # 3. Create Activity Bundle and trigger preview compilation (without paws-sync)
            act_res = api_post("bulk/activities", a_payload, token, params={"compile": "true"})
            bundle_id = act_res.get("id")
            if not bundle_id:
                raise Exception(f"Failed to get created bundle_id: {act_res}")

            print(f"   -> Success: Source={source_id}, Bundle={bundle_id}")
            progress[origin_id] = {
                "origin_id": origin_id,
                "provider": provider,
                "source_id": source_id,
                "bundle_id": bundle_id,
                "timestamp": time.time()
            }
            success_count += 1

            # Save progress incrementally
            with open(IMPORT_LOG_FILE, "w") as f:
                json.dump(progress, f, indent=2)

            time.sleep(0.05)  # Politeness delay
        except Exception as e:
            print(f"   -> Error: {e}")
            fail_count += 1

    print("\n==================================================")
    print(f"Import Summary:")
    print(f" - Total target items: {len(paired)}")
    print(f" - Successfully imported: {success_count}")
    print(f" - Skipped (already imported): {skipped_count}")
    print(f" - Failed: {fail_count}")
    print("==================================================")

if __name__ == "__main__":
    main()
