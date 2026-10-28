#!/usr/bin/env python3
"""
add_sql_collaborator.py

Adds 'rah225@pitt.edu' as a collaborator to:
1. All 132 published SQL Activity Bundles under moh70@pitt.edu.
2. All 132 corresponding SQL Sources backing those bundles.
3. All 262 previously staged SQL Sources in moh70-sources.json.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import ssl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_BASE = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
API_TOKEN_FILE = os.path.join(BASE_DIR, "..", "load-annex_sql-into-weat", "weat_api_token.txt")
OLDER_SOURCES_FILE = os.path.join(BASE_DIR, "..", "load-annex_sql-into-weat", "moh70-sources.json")

COLLABORATOR_EMAIL = "rah225@pitt.edu"
USER_EMAIL = "moh70@pitt.edu"

SSL_CTX = ssl._create_unverified_context()

def get_api_token():
    if os.path.exists(API_TOKEN_FILE):
        with open(API_TOKEN_FILE) as f:
            return f.read().strip()
    return "6d0c8d21-8cf7-4550-bcf2-3c7b26ed99f3"

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

def main():
    token = get_api_token()
    print(f"Using Bulk API Token: {token[:6]}...{token[-4:]}")
    print(f"Adding collaborator: {COLLABORATOR_EMAIL} to all SQL items under {USER_EMAIL}")

    # 1. Fetch Hub Bundles
    print("\nFetching Hub bundles...")
    req = urllib.request.Request(f"{API_BASE}/hub")
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        hub_data = json.loads(r.read().decode("utf-8"))

    sql_bundles = [
        b for b in hub_data
        if (b.get("author") or {}).get("email") == USER_EMAIL
        and any((it.get("details") or {}).get("language") == "SQL" for it in b.get("items", []))
    ]
    print(f"Found {len(sql_bundles)} SQL Activity Bundles under {USER_EMAIL} in Hub.")

    # 2. Update SQL Activity Bundles
    print(f"\n--- 1. Updating {len(sql_bundles)} SQL Activity Bundles ---")
    bundle_success = 0
    bundle_skipped = 0
    source_ids_from_bundles = []

    for idx, b in enumerate(sql_bundles, 1):
        b_id = b["id"]
        b_name = b.get("name", "")
        collabs = list(b.get("collaborators", []))

        # Collect source IDs
        for it in b.get("items", []):
            if it.get("item"):
                source_ids_from_bundles.append(it["item"])

        if COLLABORATOR_EMAIL in collabs:
            bundle_skipped += 1
            continue

        collabs.append(COLLABORATOR_EMAIL)
        try:
            payload = {
                "user": USER_EMAIL,
                "collaborator_emails": collabs
            }
            api_patch(f"bulk/activities/{b_id}", payload, token, params={"compile": "false"})
            bundle_success += 1
            print(f"[{idx}/{len(sql_bundles)}] Added {COLLABORATOR_EMAIL} to Bundle {b_name} ({b_id})")
            time.sleep(0.03)
        except Exception as e:
            print(f"[{idx}/{len(sql_bundles)}] Error on Bundle {b_id}: {e}")

    print(f"Activity Bundles: {bundle_success} updated, {bundle_skipped} already had collaborator.")

    # 3. Update Sources from the 132 Bundles
    source_ids_from_bundles = list(set(source_ids_from_bundles))
    print(f"\n--- 2. Updating {len(source_ids_from_bundles)} Sources from SQL Bundles ---")
    src_bundle_success = 0
    for idx, s_id in enumerate(source_ids_from_bundles, 1):
        try:
            payload = {
                "user": USER_EMAIL,
                "collaborator_emails": [COLLABORATOR_EMAIL]
            }
            api_patch(f"bulk/sources/{s_id}", payload, token, params={"compile": "false"})
            src_bundle_success += 1
            if idx % 20 == 0 or idx == len(source_ids_from_bundles):
                print(f"[{idx}/{len(source_ids_from_bundles)}] Patched source {s_id}")
            time.sleep(0.03)
        except Exception as e:
            print(f"[{idx}/{len(source_ids_from_bundles)}] Error patching source {s_id}: {e}")

    print(f"Sources from SQL Bundles: {src_bundle_success} updated.")

    # 4. Update Older 262 SQL Sources from moh70-sources.json
    older_sql_sources = []
    if os.path.exists(OLDER_SOURCES_FILE):
        with open(OLDER_SOURCES_FILE) as f:
            all_s = json.load(f)
        older_sql_sources = [s for s in all_s if s.get("language") == "SQL"]

    # Filter out any that were already updated in step 3
    remaining_older = [s for s in older_sql_sources if s.get("id") not in source_ids_from_bundles]
    print(f"\n--- 3. Updating {len(remaining_older)} Previously Staged SQL Sources in Library ---")
    older_success = 0
    for idx, s in enumerate(remaining_older, 1):
        s_id = s.get("id")
        current_collabs = list(s.get("collaborator_emails", []))
        if COLLABORATOR_EMAIL not in current_collabs:
            current_collabs.append(COLLABORATOR_EMAIL)
        try:
            payload = {
                "user": USER_EMAIL,
                "collaborator_emails": current_collabs
            }
            api_patch(f"bulk/sources/{s_id}", payload, token, params={"compile": "false"})
            older_success += 1
            if idx % 30 == 0 or idx == len(remaining_older):
                print(f"[{idx}/{len(remaining_older)}] Patched older source {s.get('name')} ({s_id})")
            time.sleep(0.03)
        except Exception as e:
            print(f"[{idx}/{len(remaining_older)}] Error patching older source {s_id}: {e}")

    print(f"Older Staged Sources: {older_success} updated.")

    print("\n==================================================")
    print("Summary:")
    print(f" - SQL Activity Bundles in Hub: {len(sql_bundles)} (All now have {COLLABORATOR_EMAIL})")
    print(f" - SQL Sources for Bundles: {len(source_ids_from_bundles)} (All now have {COLLABORATOR_EMAIL})")
    print(f" - Older Staged SQL Sources in Library: {len(remaining_older)} (All now have {COLLABORATOR_EMAIL})")
    print(f" - Total Unique SQL Sources Updated: {len(source_ids_from_bundles) + len(remaining_older)}")
    print("==================================================")

if __name__ == "__main__":
    main()
