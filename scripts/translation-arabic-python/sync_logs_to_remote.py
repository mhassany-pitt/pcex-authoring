#!/usr/bin/env python3
"""
Sync staged PCEX Python Arabic translation logs to the remote storage mount.
Target: <STORAGE_PATH>/gpt-genai/moh70@pitt.edu/<ar_sid>/<timestamp>-translation.json
Cleans up any incomplete probe files (request-only) from earlier test runs.
"""

import os
import shutil
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STAGED_DIR = os.path.join(BASE_DIR, "staged_logs")

REMOTE_STORAGE = (
    "/Users/jone30rw/Library/CloudStorage/MountainDuck-pawscomp2.sis.pitt.edu–SFTP"
    "/pcex-authoring-app/pcex-authoring-storage"
)
DEST_MOH = os.path.join(REMOTE_STORAGE, "gpt-genai", "moh70@pitt.edu")

def sync():
    if not os.path.exists(DEST_MOH):
        print(f"Error: Destination path not accessible: {DEST_MOH}")
        return False

    staged_sids = sorted(os.listdir(STAGED_DIR))
    print(f"Found {len(staged_sids)} source log directories to sync to remote...")

    synced_count = 0
    cleaned_probes = 0

    for idx, ar_sid in enumerate(staged_sids, 1):
        src_dir = os.path.join(STAGED_DIR, ar_sid)
        if not os.path.isdir(src_dir):
            continue

        dest_dir = os.path.join(DEST_MOH, ar_sid)
        os.makedirs(dest_dir, exist_ok=True)

        # Clean up any incomplete probe logs if present
        existing_files = [f for f in os.listdir(dest_dir) if f.endswith("-translation.json")]
        for ef in existing_files:
            ef_path = os.path.join(dest_dir, ef)
            try:
                with open(ef_path, "r", encoding="utf-8") as f:
                    content = f.read()
                if '"response"' not in content:
                    os.remove(ef_path)
                    cleaned_probes += 1
            except Exception as e:
                print(f"  Warning removing probe {ef}: {e}")

        # Copy staged file
        staged_files = [f for f in os.listdir(src_dir) if f.endswith("-translation.json")]
        for sf in staged_files:
            src_file = os.path.join(src_dir, sf)
            dest_file = os.path.join(dest_dir, sf)
            shutil.copy2(src_file, dest_file)

        synced_count += 1
        if idx % 20 == 0 or idx == len(staged_sids):
            print(f"  Synced [{idx}/{len(staged_sids)}] sources...", flush=True)

    print(f"\n✓ Completed sync: {synced_count} sources synced.")
    if cleaned_probes > 0:
        print(f"✓ Cleaned up {cleaned_probes} incomplete test probe files.")

    # Verification
    print("\nVerifying remote files...")
    verified = 0
    for ar_sid in staged_sids:
        dest_dir = os.path.join(DEST_MOH, ar_sid)
        if os.path.exists(dest_dir):
            files = [f for f in os.listdir(dest_dir) if f.endswith("-translation.json")]
            for f in files:
                fpath = os.path.join(dest_dir, f)
                with open(fpath, "r", encoding="utf-8") as fp:
                    d = json.load(fp)
                if "request" in d and "response" in d:
                    verified += 1
                    break

    print(f"✓ Verification: {verified} / {len(staged_sids)} remote sources have complete translation logs.")
    return verified == len(staged_sids)

if __name__ == "__main__":
    sync()
