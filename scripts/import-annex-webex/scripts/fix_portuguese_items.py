#!/usr/bin/env python3
"""
fix_portuguese_items.py

Finds all AnnEx activities that contain "This is the portuguese version." as the description:
1. Clears the description text (removes "This is the portuguese version.").
2. Sets natural language iso_language_code to "pt" on both Activity and Source.
3. Patches both on the live PCEX server via Bulk API.
4. Synchronizes local files (downloads/annex/*.json, pcex_sources.json, pcex_activities.json).
"""

import os
import sys
import json
import time
import glob
import urllib.request
import urllib.error
import ssl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
ANNEX_DIR = os.path.join(DOWNLOADS_DIR, "annex")
SOURCES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_sources.json")
ACTIVITIES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_activities.json")
PROGRESS_FILE = os.path.join(DOWNLOADS_DIR, "import_progress.json")

API_BASE = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
API_TOKEN_FILE = os.path.join(BASE_DIR, "..", "load-annex_sql-into-weat", "weat_api_token.txt")
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

    with open(PROGRESS_FILE) as f:
        progress = json.load(f)

    # 1. Fetch current Hub bundles to ensure we have live state
    print("Fetching Hub bundles...")
    req = urllib.request.Request(f"{API_BASE}/hub")
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        hub_data = json.loads(r.read().decode("utf-8"))

    hub_by_id = {b["id"]: b for b in hub_data}

    # 2. Identify all AnnEx files with "This is the portuguese version."
    annex_files = glob.glob(os.path.join(ANNEX_DIR, "*.json"))
    target_items = []
    for fpath in annex_files:
        with open(fpath) as f:
            d = json.load(f)
        desc = (d.get("description") or "").strip()
        if "portuguese" in desc.lower():
            iid = d.get("id")
            target_items.append((iid, fpath, d))

    print(f"Found {len(target_items)} items with 'portuguese' in description.")

    patched_count = 0
    for idx, (iid, fpath, d) in enumerate(target_items, 1):
        info = progress.get(iid)
        if not info:
            print(f"[{idx}/{len(target_items)}] Warning: {iid} not found in progress ledger!")
            continue

        b_id = info["bundle_id"]
        s_id = info["source_id"]
        live_bundle = hub_by_id.get(b_id)

        print(f"[{idx}/{len(target_items)}] Updating {iid} (Bundle: {b_id}, Source: {s_id})...")

        # 1. Patch Source on server
        payload_src = {
            "user": USER_EMAIL,
            "description": "",
            "iso_language_code": "pt"
        }
        try:
            api_patch(f"bulk/sources/{s_id}", payload_src, token, params={"compile": "false"})
        except Exception as e:
            print(f"  Error patching source {s_id}: {e}")

        # 2. Patch Activity Bundle on server
        items = live_bundle.get("items", []) if live_bundle else []
        for it in items:
            it_details = it.get("details", {})
            it_details["description"] = ""
            it_details["iso_language_code"] = "pt"

        collabs = live_bundle.get("collaborators", ["rah225@pitt.edu"]) if live_bundle else ["rah225@pitt.edu"]
        if "rah225@pitt.edu" not in collabs:
            collabs.append("rah225@pitt.edu")

        payload_act = {
            "user": USER_EMAIL,
            "iso_language_code": "pt",
            "items": items,
            "collaborator_emails": collabs,
            "published": True
        }
        try:
            api_patch(f"bulk/activities/{b_id}", payload_act, token, params={"compile": "true"})
            patched_count += 1
        except Exception as e:
            print(f"  Error patching bundle {b_id}: {e}")

        # 3. Update local individual JSON file
        d["description"] = ""
        d["iso_language_code"] = "pt"
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(d, f, indent=2, ensure_ascii=False)

        time.sleep(0.03)

    print(f"\nSuccessfully patched {patched_count}/{len(target_items)} items on server and in local downloads/annex/.")

    # 4. Synchronize local pcex_sources.json and pcex_activities.json
    print("\nSynchronizing local pcex_sources.json and pcex_activities.json...")
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        sources = json.load(f)
    with open(ACTIVITIES_FILE, "r", encoding="utf-8") as f:
        activities = json.load(f)

    target_ids_set = set(t[0] for t in target_items)

    for s in sources:
        if s.get("_origin_id") in target_ids_set:
            s["description"] = ""
            s["iso_language_code"] = "pt"

    for a in activities:
        if a.get("_origin_id") in target_ids_set:
            a["iso_language_code"] = "pt"
            for it in a.get("items", []):
                it.get("details", {})["description"] = ""
                it.get("details", {})["iso_language_code"] = "pt"

    with open(SOURCES_FILE, "w", encoding="utf-8") as f:
        json.dump(sources, f, indent=2, ensure_ascii=False)
    with open(ACTIVITIES_FILE, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2, ensure_ascii=False)

    print("Local pcex_sources.json and pcex_activities.json updated.")
    print("Done!")

if __name__ == "__main__":
    main()
