#!/usr/bin/env python3
"""
calculate_distractor_parity.py

Calculates how many additional distractors are needed for each source on the server
to achieve parity with the legacy source distractor count, while preserving the existing
validated distractors already present on the server.

Inputs:
- backups/2026-09-03/sources/ : Fresh backup of validated server sources (currently 3 per source)
- matched_sources/            : Legacy sources extracted from PCEX activities
- augmented_sources/          : Augmented sources containing LLM distractors with explanations
- genai_cache.json            : Cache of generated explanations and distractors

Outputs (generated without modifying any existing files):
- distractor_parity_analysis.json : Full structured data including candidate distractors
- distractor_parity_summary.md    : Formatted Markdown report with summary table and breakdowns
"""

import os
import sys
import json
import glob
import argparse
from collections import Counter

def norm_code(s):
    if not s:
        return ""
    return " ".join(s.strip().split())

def main():
    parser = argparse.ArgumentParser(description="Calculate distractor parity between legacy and server sources.")
    parser.add_argument("--server-backup", default="2026-09-03", help="Date directory of server backup (default: 2026-09-03)")
    parser.add_argument("--export-json", default="distractor_parity_analysis.json", help="Output JSON filename")
    parser.add_argument("--export-md", default="distractor_parity_summary.md", help="Output Markdown filename")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    server_dir = os.path.join(script_dir, "backups", args.server_backup, "sources")
    matched_dir = os.path.join(script_dir, "matched_sources")
    augmented_dir = os.path.join(script_dir, "augmented_sources")
    cache_path = os.path.join(script_dir, "genai_cache.json")

    if not os.path.isdir(server_dir):
        print(f"Error: Server backup directory not found: {server_dir}")
        sys.exit(1)

    genai_cache = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                genai_cache = json.load(f)
        except Exception:
            genai_cache = {}

    dist_exp_cache = genai_cache.get("distractor_explanations", {})

    server_files = sorted(glob.glob(os.path.join(server_dir, "*.json")))
    print(f"Found {len(server_files)} server source files from backup {args.server_backup}.\n")

    parity_records = []
    needed_counter = Counter()
    legacy_count_counter = Counter()

    total_server_distractors = 0
    total_legacy_distractors = 0
    total_additional_needed = 0

    for s_path in server_files:
        sid = os.path.splitext(os.path.basename(s_path))[0]
        m_path = os.path.join(matched_dir, f"{sid}.json")
        a_path = os.path.join(augmented_dir, f"{sid}.json")

        with open(s_path, "r", encoding="utf-8") as sf:
            server_data = json.load(sf)
        
        matched_data = json.load(open(m_path, "r", encoding="utf-8")) if os.path.exists(m_path) else {}
        augmented_data = json.load(open(a_path, "r", encoding="utf-8")) if os.path.exists(a_path) else {}

        server_distractors = server_data.get("distractors", [])
        server_count = len(server_distractors)
        total_server_distractors += server_count

        legacy_distractors = matched_data.get("distractors", [])
        legacy_count = len(legacy_distractors)
        total_legacy_distractors += legacy_count
        legacy_count_counter[legacy_count] += 1

        # Calculate difference (how many more distractors to add to match legacy)
        needed = max(0, legacy_count - server_count)
        total_additional_needed += needed
        needed_counter[needed] += 1

        # Current validated server distractor codes (normalized)
        server_norm_codes = set(norm_code(d.get("code", "")) for d in server_distractors)

        lang = server_data.get("language", "PYTHON")
        sol = server_data.get("code", "")
        stmt = server_data.get("description", "")

        candidate_pool = []
        seen_cand_codes = set(server_norm_codes)

        # 1. First gather candidates from augmented_sources (LLM-generated with full descriptions)
        for d in augmented_data.get("distractors", []):
            code_str = (d.get("line") or {}).get("content", "") if "line" in d else d.get("code", "")
            raw_comms = (d.get("line") or {}).get("commentList", []) if "line" in d else []
            help_list = d.get("helpList", []) if "helpList" in d else []
            desc = (raw_comms[0] if raw_comms and raw_comms[0].strip() else "") or (help_list[0] if help_list and help_list[0].strip() else "") or d.get("description", "")
            ln = (d.get("line") or {}).get("number", 0) if "line" in d else d.get("line_number", 0)

            nc = norm_code(code_str)
            if nc and nc not in seen_cand_codes:
                seen_cand_codes.add(nc)
                candidate_pool.append({
                    "code": code_str,
                    "norm_code": nc,
                    "description": desc.strip(),
                    "line_number": ln,
                    "origin": "augmented_llm"
                })

        # 2. Then check matched_sources (legacy human distractors not yet included)
        for d in legacy_distractors:
            code_str = (d.get("line") or {}).get("content", "") if "line" in d else d.get("code", "")
            raw_comms = (d.get("line") or {}).get("commentList", []) if "line" in d else []
            help_list = d.get("helpList", []) if "helpList" in d else []
            desc = (raw_comms[0] if raw_comms and raw_comms[0].strip() else "") or (help_list[0] if help_list and help_list[0].strip() else "") or d.get("description", "")
            ln = (d.get("line") or {}).get("number", 0) if "line" in d else d.get("line_number", 0)

            nc = norm_code(code_str)
            if nc and nc not in seen_cand_codes:
                seen_cand_codes.add(nc)
                # If description is missing, check cache
                if not desc.strip():
                    cache_key = f"{lang}::{code_str}::{sol}::{stmt}"
                    if cache_key in dist_exp_cache:
                        exp = dist_exp_cache[cache_key]
                        desc = exp if isinstance(exp, str) else (exp[0] if exp else "")

                candidate_pool.append({
                    "code": code_str,
                    "norm_code": nc,
                    "description": desc.strip(),
                    "line_number": ln,
                    "origin": "legacy_human"
                })

        parity_records.append({
            "source_id": sid,
            "server_id": server_data.get("_id") or server_data.get("id"),
            "name": server_data.get("name", ""),
            "filename": server_data.get("filename", ""),
            "language": lang,
            "legacy_distractor_count": legacy_count,
            "server_distractor_count": server_count,
            "additional_needed": needed,
            "server_distractors": [
                {
                    "code": d.get("code", ""),
                    "description": d.get("description", ""),
                    "line_number": d.get("line_number", 0)
                }
                for d in server_distractors
            ],
            "candidate_pool_count": len(candidate_pool),
            "candidate_pool": candidate_pool
        })

    # Summary statistics
    print("=" * 75)
    print("DISTRACTOR PARITY AUDIT SUMMARY")
    print("=" * 75)
    print(f"Total Sources Audited:                  {len(parity_records)}")
    print(f"Total Legacy Distractors:               {total_legacy_distractors}")
    print(f"Total Current Server Distractors:       {total_server_distractors}")
    print(f"Total Additional Distractors Needed:    {total_additional_needed}")
    print("-" * 75)
    print("Breakdown of Legacy Distractor Counts:")
    for count, n_sources in sorted(legacy_count_counter.items()):
        print(f"  - {count} distractors: {n_sources:2d} sources")
    print("-" * 75)
    print("Breakdown of Additional Distractors Needed per Source:")
    for needed, n_sources in sorted(needed_counter.items()):
        print(f"  - Need +{needed} distractors: {n_sources:2d} sources")
    print("=" * 75)

    # Export to JSON
    json_path = os.path.join(script_dir, args.export_json)
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump({
            "audit_date": args.server_backup,
            "total_sources": len(parity_records),
            "total_legacy_distractors": total_legacy_distractors,
            "total_server_distractors": total_server_distractors,
            "total_additional_needed": total_additional_needed,
            "needed_breakdown": dict(sorted(needed_counter.items())),
            "legacy_counts_breakdown": dict(sorted(legacy_count_counter.items())),
            "sources": parity_records
        }, jf, indent=2)
    print(f"\n✓ Saved JSON analysis to: {json_path}")

    # Export to Markdown
    md_path = os.path.join(script_dir, args.export_md)
    with open(md_path, "w", encoding="utf-8") as mf:
        mf.write("# PCEX Distractor Parity Analysis Report\n\n")
        mf.write(f"- **Server Backup Reference:** `{args.server_backup}`\n")
        mf.write(f"- **Total Sources:** `{len(parity_records)}`\n")
        mf.write(f"- **Current Server Distractors:** `{total_server_distractors}` (3 per source, human-validated)\n")
        mf.write(f"- **Legacy Total Distractors:** `{total_legacy_distractors}`\n")
        mf.write(f"- **Total Additional Distractors Needed:** `{total_additional_needed}`\n\n")

        mf.write("## 1. Distribution of Additional Distractors Needed\n\n")
        mf.write("| Additional Needed | Number of Sources | Legacy Count | Current Server Count |\n")
        mf.write("| :---: | :---: | :---: | :---: |\n")
        for needed, n_sources in sorted(needed_counter.items()):
            leg_label = f"{3 + needed} (or ≤3)" if needed == 0 else f"{3 + needed}"
            mf.write(f"| **+{needed}** | {n_sources} | {leg_label} | 3 |\n")

        mf.write("\n## 2. Complete Source-by-Source Breakdown\n\n")
        mf.write("| # | Source ID | Activity Name | Legacy Count | Server Count | Additional Needed | Available Candidates Pool |\n")
        mf.write("| :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n")
        for i, r in enumerate(parity_records, 1):
            mf.write(f"| {i} | `{r['source_id']}` | {r['name']} | {r['legacy_distractor_count']} | {r['server_distractor_count']} | **+{r['additional_needed']}** | {r['candidate_pool_count']} |\n")

    print(f"✓ Saved Markdown report to: {md_path}\n")

if __name__ == "__main__":
    main()
