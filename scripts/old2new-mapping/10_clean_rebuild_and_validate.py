#!/usr/bin/env python3
"""
10_clean_rebuild_and_validate.py

Full end-to-end clean rebuild workflow:
1. Deletes previously imported augmented items from the PCEX Authoring server (08_bulk_delete_augmented_items.py)
2. Regenerates English explanations & distractors for Spanish sources locally (09_regenerate_spanish_sources.py --dry-run)
3. Reassembles augmented bundles locally (06_create_augmented_bundles.py)
4. Bulk inserts clean English sources & bundles into the database (07_bulk_insert_augmented_items.py --reset)
5. Regenerates the validation checklist and CSV task list (generate_validation_list.py)
"""

import os
import sys
import subprocess
import argparse

def run_step(step_name, cmd_args, cwd):
    print("\n" + "=" * 75)
    print(f"STEP: {step_name}")
    print(f"Running: {' '.join(cmd_args)}")
    print("=" * 75)
    res = subprocess.run(cmd_args, cwd=cwd)
    if res.returncode != 0:
        print(f"\n❌ Step '{step_name}' failed with exit code {res.returncode}. Aborting.")
        sys.exit(res.returncode)
    print(f"✓ Step '{step_name}' completed successfully.\n")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_api = os.environ.get("PCEX_API_URL", "https://adapt2.sis.pitt.edu/pcex-authoring/api")

    parser = argparse.ArgumentParser(description="End-to-end clean rebuild: delete old clones, regenerate in English, re-import, and update task list.")
    parser.add_argument("--api", default=default_api, help=f"API Base URL (default: {default_api})")
    parser.add_argument("-w", "--workers", type=int, default=6, help="Number of parallel workers for regeneration (default: 6)")
    parser.add_argument("--skip-delete", action="store_true", help="Skip remote deletion step")
    parser.add_argument("--spanish-only", action="store_true", help="Only delete and rebuild Spanish items, keeping existing English clones")
    parser.add_argument("--compile", action="store_true", default=False, help="Compile sources during bulk insert (default: False)")
    args = parser.parse_args()

    python_bin = sys.executable

    print("=" * 75)
    print("PCEX CLEAN REBUILD & VALIDATION PIPELINE")
    print("=" * 75)
    print(f"Target API:        {args.api}")
    print(f"Parallel Workers:  {args.workers}")
    print(f"Scope:             {'SPANISH ONLY' if args.spanish_only else 'ALL PCEX CLONES'}")
    print(f"Skip Delete:       {args.skip_delete}")
    print(f"Compilation:       {args.compile}")
    print("=" * 75)

    # 1. Delete previous imports from server
    if not args.skip_delete:
        del_cmd = [python_bin, "08_bulk_delete_augmented_items.py", "--api", args.api]
        if args.spanish_only:
            del_cmd.append("--spanish-only")
        run_step(
            "1. Bulk Delete Clones from Server",
            del_cmd,
            script_dir
        )
    else:
        print("\n⏩ Skipping deletion step (--skip-delete).")

    # 2. Regenerate Spanish sources into English locally
    regen_cmd = [python_bin, "09_regenerate_spanish_sources.py", "--api", args.api, "--dry-run", "-w", str(args.workers)]
    if args.compile:
        regen_cmd.append("--compile")
    else:
        regen_cmd.append("--no-compile")
    run_step(
        "2. Regenerate Spanish Sources in English (Local)",
        regen_cmd,
        script_dir
    )

    # 3. Assemble bundles
    run_step(
        "3. Assemble Augmented Bundles",
        [python_bin, "06_create_augmented_bundles.py"],
        script_dir
    )

    # 4. Bulk insert clean clones into server database
    insert_cmd = [python_bin, "07_bulk_insert_augmented_items.py", "--api", args.api]
    if not args.spanish_only:
        insert_cmd.append("--reset")
    if args.compile:
        insert_cmd.append("--compile")
    run_step(
        "4. Bulk Insert Clean Clones into Server",
        insert_cmd,
        script_dir
    )

    # 5. Generate validation checklist and CSV
    run_step(
        "5. Generate Reviewer Checklist & Task List",
        [python_bin, "generate_validation_list.py"],
        script_dir
    )

    print("\n" + "=" * 75)
    print("🎉 FULL CLEAN REBUILD & TASK LIST UPDATE COMPLETE!")
    print("=" * 75)
    print("Output files updated:")
    print("  • sources_validation_list.md")
    print("  • sources_validation_list.csv")
    print("  • bulk_import_mapping.json")
    print("=" * 75)

if __name__ == "__main__":
    main()
