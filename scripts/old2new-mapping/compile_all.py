#!/usr/bin/env python3
"""
compile_all.py

Compiles all 123 sources and all 52 bundles on the PCEX Authoring server:
1. Supports --skip-sources to skip source compilation if already finished.
2. Supports --skip-bundles to compile only sources.
3. Uses configurable delays (--delay for sources, --bundle-delay for bundles).
4. Auto-retries on 503 Service Unavailable with exponential backoff.
"""

import os
import sys
import json
import glob
import time
import ssl
import argparse
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

def send_json_patch_with_retry(url, headers, payload, ssl_ctx, max_retries=5, base_backoff=3.0):
    """Sends a JSON PATCH request with exponential retry on 503 / 502 / network errors."""
    data_bytes = json.dumps(payload).encode("utf-8")
    for attempt in range(max_retries):
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="PATCH")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=90) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            if e.code in (502, 503, 504) and attempt < max_retries - 1:
                wait_time = base_backoff * (1.5 ** attempt)
                print(f"    [503 Server Busy] Retrying in {wait_time:.1f}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait_time)
                continue
            return e.code, err_body
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = base_backoff * (1.5 ** attempt)
                print(f"    [Connection Error] Retrying in {wait_time:.1f}s: {e}")
                time.sleep(wait_time)
                continue
            return 0, str(e)
    return 0, "Max retries exceeded"

def main():
    parser = argparse.ArgumentParser(description="Compile all PCEX sources and activity bundles on the server.")
    parser.add_argument("--skip-sources", action="store_true", help="Skip source compilation (useful if sources already compiled)")
    parser.add_argument("--skip-bundles", action="store_true", help="Skip bundle compilation")
    parser.add_argument("--delay", type=float, default=5.0, help="Delay in seconds between source compilations (default: 5.0s)")
    parser.add_argument("--bundle-delay", type=float, default=10.0, help="Delay in seconds between bundle compilations (default: 10.0s)")
    parser.add_argument("--sources-dir", default=None, help="Sources directory (default: backups/2026-09-01_reviewed/sources)")
    parser.add_argument("--bundles-dir", default=None, help="Bundles directory (default: augmented_bundles)")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    sources_dir = args.sources_dir or os.path.join(script_dir, "backups", "2026-09-01_reviewed", "sources")
    bundles_dir = args.bundles_dir or os.path.join(script_dir, "augmented_bundles")
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")

    if not os.path.exists(mapping_file):
        print(f"Error: mapping file not found at {mapping_file}")
        sys.exit(1)

    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    sources_map = mapping.get("sources", {})
    bundles_map = mapping.get("bundles", {})

    api_token = get_api_token(script_dir)
    api_url = DEFAULT_API_URL.rstrip("/")

    headers = {
        "api-token": api_token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-Compiler/1.0"
    }

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    source_files = sorted(glob.glob(os.path.join(sources_dir, "*.json")))
    bundle_files = sorted(glob.glob(os.path.join(bundles_dir, "*.json")))

    print("=" * 80)
    print("PCEX SEQUENTIAL ROBUST COMPILATION RUNNER")
    print("=" * 80)
    print(f"Target API:          {api_url}")
    print(f"Total Sources:       {len(source_files)} (from {sources_dir})")
    print(f"Total Bundles:       {len(bundle_files)} (from {bundles_dir})")
    print(f"Source Delay:        {args.delay}s")
    print(f"Bundle Delay:        {args.bundle_delay}s")
    print(f"Skip Sources:        {args.skip_sources}")
    print(f"Skip Bundles:        {args.skip_bundles}")
    print("=" * 80)

    # --------------------------------------------------------------------------
    # PHASE 1: COMPILE ALL SOURCES
    # --------------------------------------------------------------------------
    source_success = 0
    source_fail = 0
    sources_duration = 0

    if not args.skip_sources:
        print("\n🚀 [PHASE 1/2] Compiling all 123 sources on server...")
        start_sources = time.time()

        for idx, sf in enumerate(source_files, 1):
            old_sid = os.path.splitext(os.path.basename(sf))[0]
            server_sid = sources_map.get(old_sid)
            if not server_sid:
                print(f"  [{idx:3d}/{len(source_files)}] ✗ No mapped server ID for {old_sid}")
                source_fail += 1
                continue

            with open(sf, "r", encoding="utf-8") as f:
                src_data = json.load(f)

            payload = dict(src_data)
            payload.pop("id", None)
            payload.pop("_id", None)
            payload.pop("author", None)
            payload["user"] = "moh70@pitt.edu"

            name = payload.get("name", "Untitled")

            patch_url = f"{api_url}/bulk/sources/{server_sid}?compile=true"
            status, resp = send_json_patch_with_retry(patch_url, headers, payload, ssl_ctx)

            if status in (200, 201):
                source_success += 1
                print(f"  [{idx:3d}/{len(source_files)}] ✓ Source compiled: {server_sid} - {name[:40]}")
            else:
                source_fail += 1
                print(f"  [{idx:3d}/{len(source_files)}] ✗ FAILED Source: {server_sid} ({status}): {resp}")

            if args.delay > 0:
                time.sleep(args.delay)

        sources_duration = time.time() - start_sources
        print(f"\n✓ Sources compilation complete in {sources_duration:.1f}s ({source_success}/{len(source_files)} succeeded, {source_fail} failed)")
    else:
        print("\n⏭️ Skipping Phase 1 (Sources already compiled).")

    # --------------------------------------------------------------------------
    # PHASE 2: COMPILE ALL BUNDLES
    # --------------------------------------------------------------------------
    bundle_success = 0
    bundle_fail = 0
    bundles_duration = 0

    if not args.skip_bundles:
        print(f"\n🚀 [PHASE 2/2] Compiling all 52 activity bundles on server (pacing: {args.bundle_delay}s)...")
        start_bundles = time.time()

        for idx, bf in enumerate(bundle_files, 1):
            old_bid = os.path.splitext(os.path.basename(bf))[0]
            server_bid = bundles_map.get(old_bid)
            if not server_bid:
                print(f"  [{idx:2d}/{len(bundle_files)}] ✗ No mapped server ID for bundle {old_bid}")
                bundle_fail += 1
                continue

            with open(bf, "r", encoding="utf-8") as f:
                bundle_data = json.load(f)

            bundle_obj = bundle_data.get("bundle", bundle_data)
            payload = dict(bundle_obj)
            payload["id"] = server_bid
            payload["user"] = "moh70@pitt.edu"

            name = payload.get("name", "Untitled")

            patch_url = f"{api_url}/bulk/activities/{server_bid}?compile=true"
            status, resp = send_json_patch_with_retry(patch_url, headers, payload, ssl_ctx)

            if status in (200, 201):
                bundle_success += 1
                print(f"  [{idx:2d}/{len(bundle_files)}] ✓ Bundle compiled: {server_bid} - {name[:40]}")
            else:
                bundle_fail += 1
                print(f"  [{idx:2d}/{len(bundle_files)}] ✗ FAILED Bundle: {server_bid} ({status}): {resp}")

            if args.bundle_delay > 0:
                time.sleep(args.bundle_delay)

        bundles_duration = time.time() - start_bundles
        print(f"\n✓ Bundles compilation complete in {bundles_duration:.1f}s ({bundle_success}/{len(bundle_files)} succeeded, {bundle_fail} failed)")
    else:
        print("\n⏭️ Skipping Phase 2 (Bundles).")

    # --------------------------------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("FINAL COMPILATION REPORT")
    print("=" * 80)
    if not args.skip_sources:
        print(f"Sources Compilation:  {source_success}/{len(source_files)} succeeded ({sources_duration:.1f}s)")
    if not args.skip_bundles:
        print(f"Bundles Compilation:  {bundle_success}/{len(bundle_files)} succeeded ({bundles_duration:.1f}s)")
    print(f"Total Time Elapsed:   {sources_duration + bundles_duration:.1f}s")
    if source_fail == 0 and bundle_fail == 0:
        print("🎉 ALL REQUESTED COMPILATIONS FINISHED SUCCESSFULLY!")
    else:
        print("⚠️ SOME COMPILATIONS FAILED. Please check the logs above.")
    print("=" * 80)

if __name__ == "__main__":
    main()
