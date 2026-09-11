#!/usr/bin/env python3
"""
unpublish_and_delete_roya.py

Cleanly removes legacy Java items created under rah225@pitt.edu from the PCEX Authoring server
and the PAWS Catalog / Hub:
1. Marks all created bundles (English and Spanish) as published: false via PATCH.
2. Triggers PAWS sync (/bundles/:id/sync?allUsers=true) for each bundle so they are unlinked/removed
   from the PAWS Catalog and Hub.
3. Deletes all created bundles from the PCEX server via DELETE /bulk/activities/:id?user=rah225@pitt.edu.
4. Deletes all created sources from the PCEX server via DELETE /bulk/sources/:id?user=rah225@pitt.edu.
5. Preserves all local files in scripts/translation-java-roya/.
"""

import os
import sys
import json
import time
import ssl
import urllib.request
import urllib.error
import urllib.parse
import http.cookiejar

BASE_URL = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
USER_EMAIL = "rah225@pitt.edu"

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    old2new_dir = os.path.join(os.path.dirname(script_dir), "old2new-mapping")
    mapping_file = os.path.join(script_dir, "mapping.json")

    with open(os.path.join(old2new_dir, "auth_credentials.json")) as f:
        creds = json.load(f)
    with open(os.path.join(old2new_dir, "api_token.txt")) as f:
        api_token = f.read().strip()

    if not os.path.exists(mapping_file):
        print(f"Error: {mapping_file} not found.")
        sys.exit(1)

    with open(mapping_file) as f:
        mapping = json.load(f)

    en_bundles = list(mapping.get("bundles", {}).items()) # (name, id)
    es_bundles = list(mapping.get("roya_to_spanish_bundles", {}).items()) # (name, id)
    all_bundles = []
    # Deduplicate bundle IDs while keeping labels
    seen_bids = set()
    for name, bid in en_bundles:
        if bid and bid not in seen_bids:
            seen_bids.add(bid)
            all_bundles.append((f"[EN] {name}", bid))
    for name, bid in es_bundles:
        if bid and bid not in seen_bids:
            seen_bids.add(bid)
            all_bundles.append((f"[ES] {name}_es", bid))

    en_sources = list(mapping.get("sources", {}).keys()) # old roya source ids that were created under rah225
    es_sources = list(mapping.get("roya_to_spanish_sources", {}).values()) # spanish source ids created under rah225
    all_source_ids = list(dict.fromkeys(en_sources + es_sources))

    print("=" * 70)
    print("PCEX AUTHORING - UNPUBLISH, PAWS SYNC & SERVER CLEANUP")
    print(f"Author User Scope: {USER_EMAIL}")
    print(f"Total Bundles to Unpublish, Sync & Delete: {len(all_bundles)}")
    print(f"Total Sources to Delete: {len(all_source_ids)}")
    print("=" * 70)

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    # Authenticate session for PAWS sync
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        urllib.request.HTTPSHandler(context=ssl_ctx)
    )
    login_req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps(creds).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "PCEX-Cleanup/1.0"},
        method="POST"
    )
    with opener.open(login_req, timeout=20) as resp:
        if resp.status not in (200, 201):
            raise Exception(f"Login failed: status {resp.status}")
    print("✓ Successfully authenticated admin session for PAWS sync.\n")

    headers_token = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Cleanup/1.0"
    }

    # STEP 1: Unpublish all bundles
    print("--- STEP 1: Unpublishing Bundles (published = False) ---")
    unpublished_count = 0
    for idx, (label, bid) in enumerate(all_bundles, 1):
        url = f"{BASE_URL}/bulk/activities/{bid}?compile=false"
        payload = json.dumps({"user": USER_EMAIL, "published": False}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers_token, method="PATCH")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                if resp.status == 200:
                    unpublished_count += 1
                    print(f"  [{idx}/{len(all_bundles)}] ✓ Unpublished bundle {bid} ({label})")
                else:
                    print(f"  [{idx}/{len(all_bundles)}] ⚠️ Unexpected status {resp.status} for bundle {bid}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [{idx}/{len(all_bundles)}] - Bundle {bid} not found on server (already gone).")
            else:
                print(f"  [{idx}/{len(all_bundles)}] ✗ HTTP {e.code} for bundle {bid}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"  [{idx}/{len(all_bundles)}] ✗ Error for bundle {bid}: {e}")

    print(f"\nCompleted Step 1: {unpublished_count} bundles set to published=False.\n")

    # STEP 2: Sync each bundle to PAWS to remove from PAWS Catalog & Hub
    print("--- STEP 2: Syncing Bundles to PAWS (Removal from Catalog & Hub) ---")
    synced_count = 0
    for idx, (label, bid) in enumerate(all_bundles, 1):
        url = f"{BASE_URL}/bundles/{bid}/sync?allUsers=true"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with opener.open(req, timeout=45) as resp:
                if resp.status in (200, 201):
                    synced_count += 1
                    print(f"  [{idx}/{len(all_bundles)}] ✓ Synced to PAWS (unpublish): {bid} ({label})")
                else:
                    print(f"  [{idx}/{len(all_bundles)}] ⚠️ Status {resp.status} syncing {bid}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [{idx}/{len(all_bundles)}] - Bundle {bid} not found on server.")
            else:
                print(f"  [{idx}/{len(all_bundles)}] ✗ HTTP {e.code} syncing {bid}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"  [{idx}/{len(all_bundles)}] ✗ Error syncing {bid}: {e}")

    print(f"\nCompleted Step 2: {synced_count} bundles synced to PAWS for unpublishing.\n")

    # STEP 3: Delete bundles from PCEX Authoring server
    print("--- STEP 3: Deleting Bundles from Server ---")
    deleted_bundles = 0
    for idx, (label, bid) in enumerate(all_bundles, 1):
        url = f"{BASE_URL}/bulk/activities/{bid}?user={urllib.parse.quote(USER_EMAIL)}"
        req = urllib.request.Request(url, headers=headers_token, method="DELETE")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                if resp.status in (200, 204):
                    deleted_bundles += 1
                    print(f"  [{idx}/{len(all_bundles)}] ✓ Deleted bundle {bid} ({label})")
                else:
                    print(f"  [{idx}/{len(all_bundles)}] ⚠️ Status {resp.status} deleting bundle {bid}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [{idx}/{len(all_bundles)}] - Bundle {bid} not found (already deleted).")
            else:
                print(f"  [{idx}/{len(all_bundles)}] ✗ HTTP {e.code} deleting bundle {bid}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"  [{idx}/{len(all_bundles)}] ✗ Error deleting bundle {bid}: {e}")

    print(f"\nCompleted Step 3: {deleted_bundles} bundles deleted from server.\n")

    # STEP 4: Delete sources from PCEX Authoring server
    print("--- STEP 4: Deleting Sources from Server ---")
    deleted_sources = 0
    for idx, sid in enumerate(all_source_ids, 1):
        url = f"{BASE_URL}/bulk/sources/{sid}?user={urllib.parse.quote(USER_EMAIL)}"
        req = urllib.request.Request(url, headers=headers_token, method="DELETE")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                if resp.status in (200, 204):
                    deleted_sources += 1
                    print(f"  [{idx}/{len(all_source_ids)}] ✓ Deleted source {sid}")
                else:
                    print(f"  [{idx}/{len(all_source_ids)}] ⚠️ Status {resp.status} deleting source {sid}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [{idx}/{len(all_source_ids)}] - Source {sid} not found (already deleted).")
            else:
                print(f"  [{idx}/{len(all_source_ids)}] ✗ HTTP {e.code} deleting source {sid}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"  [{idx}/{len(all_source_ids)}] ✗ Error deleting source {sid}: {e}")

    print(f"\nCompleted Step 4: {deleted_sources} sources deleted from server.\n")

    # STEP 5: Verify removal from Hub
    print("--- STEP 5: Verifying Hub Status ---")
    hub_url = f"{BASE_URL}/hub"
    req = urllib.request.Request(hub_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
        hub_data = json.loads(resp.read().decode("utf-8"))

    all_target_ids = set(seen_bids)
    remaining_in_hub = [item for item in hub_data if (item.get("id") in all_target_ids or item.get("_id") in all_target_ids)]

    print(f"Total items in Hub: {len(hub_data)}")
    print(f"Target items remaining in Hub: {len(remaining_in_hub)}")
    if remaining_in_hub:
        for it in remaining_in_hub:
            print(f"  ⚠️ Still in Hub: {it.get('id') or it.get('_id')} - {it.get('name')}")
    else:
        print("  ✓ Verification confirmed: 0 target items remain in PCEX Hub!")

    print("\n" + "=" * 70)
    print("CLEANUP SUMMARY:")
    print(f"  • Bundles unpublished: {unpublished_count}/{len(all_bundles)}")
    print(f"  • Bundles synced to PAWS: {synced_count}/{len(all_bundles)}")
    print(f"  • Bundles deleted from server: {deleted_bundles}/{len(all_bundles)}")
    print(f"  • Sources deleted from server: {deleted_sources}/{len(all_source_ids)}")
    print(f"  • Local files preserved in: {script_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
