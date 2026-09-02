#!/usr/bin/env python3
"""
backup_sources.py

Downloads the latest state of all cloned sources from the PCEX Authoring server
into 'backups/<date>/sources/' directory as a local backup.

Reads mapping from 'bulk_import_mapping.json':
- Fetches source by its server ID (mapping['sources'][old_id])
- Saves JSON as 'backups/<date>/sources/<old_id>.json'
"""

import os
import sys
import json
import glob
import time
import ssl
import getpass
import argparse
from datetime import datetime
import urllib.request
import urllib.error
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor, as_completed

DEFAULT_API_URL = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")

def get_credentials(script_dir):
    """Loads saved login credentials or prompts interactively."""
    creds_file = os.path.join(script_dir, "auth_credentials.json")
    if os.path.exists(creds_file):
        try:
            with open(creds_file, "r", encoding="utf-8") as f:
                creds = json.load(f)
                if creds.get("email") and creds.get("password"):
                    print(f"Loaded credentials for: {creds['email']} from auth_credentials.json")
                    return creds["email"], creds["password"]
        except Exception:
            pass

    print("\n--- PCEX Authoring Login ---")
    email = input("Enter email (username): ").strip()
    password = getpass.getpass("Enter password: ")

    with open(creds_file, "w", encoding="utf-8") as f:
        json.dump({"email": email, "password": password}, f, indent=2)
    return email, password

def get_session_opener(base_url, email, password, ssl_ctx):
    """Logs in and returns an authenticated urllib opener with cookies."""
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
            "User-Agent": "PCEX-Backup-Downloader/1.0"
        },
        method="POST"
    )
    try:
        with opener.open(req, timeout=20) as resp:
            if resp.status in (200, 201):
                print("✓ Successfully authenticated session.\n")
                return opener
            else:
                raise Exception(f"Login returned unexpected status: {resp.status}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        raise Exception(f"Login failed (HTTP {e.code}): {err_body}")

def fetch_single_source(opener, base_url, old_id, server_id, output_dir, retries=3):
    """Fetches a single source from GET /sources/<server_id> and saves to disk."""
    url = f"{base_url}/sources/{server_id}?_t={int(time.time() * 1000)}"
    headers = {"User-Agent": "PCEX-Backup-Downloader/1.0"}
    
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with opener.open(req, timeout=30) as resp:
                data = resp.read()
            
            source_json = json.loads(data.decode("utf-8"))
            out_file = os.path.join(output_dir, f"{old_id}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(source_json, f, indent=2)
                
            return old_id, server_id, True, source_json.get("name", "")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            last_err = f"HTTP {e.code}: {err_body}"
        except Exception as e:
            last_err = str(e)
            
        if attempt < retries:
            time.sleep(1.0 * attempt)
            
    return old_id, server_id, False, last_err

def main():
    parser = argparse.ArgumentParser(description="Download latest backup copies of sources from PCEX Authoring server.")
    parser.add_argument("--api", default=DEFAULT_API_URL, help=f"API Base URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"), help="Date string for the backup directory (default: today YYYY-MM-DD)")
    parser.add_argument("--output-dir", default=None, help="Custom output directory (overrides backups/<date>/sources)")
    parser.add_argument("-w", "--workers", type=int, default=8, help="Number of parallel download threads (default: 8)")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")

    if args.output_dir:
        output_dir = os.path.abspath(args.output_dir)
    else:
        output_dir = os.path.join(script_dir, "backups", args.date, "sources")

    if not os.path.exists(mapping_file):
        print(f"Error: Mapping file not found at {mapping_file}")
        sys.exit(1)

    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    sources_map = mapping.get("sources", {})
    if not sources_map:
        print("Error: No sources found in mapping file.")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    email, password = get_credentials(script_dir)
    api_url = args.api.rstrip("/")
    opener = get_session_opener(api_url, email, password, ssl_ctx)

    print(f"Starting download of {len(sources_map)} sources to '{output_dir}'...")
    start_time = time.time()
    
    success_count = 0
    fail_count = 0
    items_to_fetch = list(sources_map.items())

    # Download in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(fetch_single_source, opener, api_url, old_id, server_id, output_dir): (old_id, server_id)
            for old_id, server_id in items_to_fetch
        }

        for idx, future in enumerate(as_completed(futures), 1):
            old_id, server_id, success, detail = future.result()
            if success:
                success_count += 1
                print(f"[{idx:3d}/{len(items_to_fetch)}] ✓ {old_id} (server: {server_id}) - {detail[:45]}")
            else:
                fail_count += 1
                print(f"[{idx:3d}/{len(items_to_fetch)}] ✗ {old_id} (server: {server_id}) - Error: {detail}")

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"BACKUP DOWNLOAD COMPLETED in {elapsed:.1f}s")
    print(f"✓ Successfully downloaded: {success_count}/{len(items_to_fetch)}")
    if fail_count > 0:
        print(f"✗ Failed:                 {fail_count}/{len(items_to_fetch)}")
    print(f"Saved to:                 {output_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
