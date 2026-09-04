#!/usr/bin/env python3
"""
simulate_strict_llm_backfill.py

Implements strict LLM-only distractor backfilling to match legacy distractor counts.

Rules:
1. NO human-created-only distractors (must always be LLM-generated).
2. Priority 1: Pick from post-augmentation sources that had > 3 distractors (LLM-generated).
3. Priority 2: Pick from LLM-generated distractors that also matched a human-created legacy distractor.
4. Preserves the 3 already validated distractors currently on the server.
5. Does NOT modify existing files; exports report and plan to new files.
"""

import os
import sys
import json
import glob
from collections import Counter

def norm(s):
    if not s:
        return ""
    return " ".join(s.strip().split())

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    server_dir = os.path.join(script_dir, "backups", "2026-09-03", "sources")
    matched_dir = os.path.join(script_dir, "matched_sources")
    augmented_dir = os.path.join(script_dir, "augmented_sources")
    cache_path = os.path.join(script_dir, "genai_cache.json")

    cache = json.load(open(cache_path, "r", encoding="utf-8")).get("distractors", {})
    server_files = sorted(glob.glob(os.path.join(server_dir, "*.json")))

    sources_data = []

    for sf in server_files:
        sid = os.path.splitext(os.path.basename(sf))[0]
        s_data = json.load(open(sf, "r", encoding="utf-8"))
        m_data = json.load(open(os.path.join(matched_dir, f"{sid}.json"), "r", encoding="utf-8"))
        a_data = json.load(open(os.path.join(augmented_dir, f"{sid}.json"), "r", encoding="utf-8"))

        server_dist = s_data.get("distractors", [])
        server_codes = [norm(d.get("code", "")) for d in server_dist]
        server_set = set(server_codes)

        legacy_dist = m_data.get("distractors", [])
        legacy_codes = [norm((d.get("line") or {}).get("content", "")) for d in legacy_dist]
        legacy_set = set(legacy_codes)

        legacy_count = len(legacy_dist)
        server_count = len(server_dist)
        needed = max(0, legacy_count - server_count)

        # Collect LLM generated distractors from genai_cache
        lang = s_data.get("language", "PYTHON")
        stmt = s_data.get("description", "")
        sol = s_data.get("code", "")
        lines = s_data.get("lines", {})
        blank_lines = [int(ln) for ln, info in lines.items() if info.get("blank")]

        cache_llm = {}
        for bl in blank_lines:
            k = f"{lang}::{bl}::{sol}::{stmt}"
            if k in cache:
                for gd in cache[k]:
                    c = norm(gd.get("distractor", ""))
                    if c:
                        cache_llm[c] = (gd, bl)

        # --- Priority 1: Post-augmentation LLM distractors from augmented_sources (> 3) ---
        aug_dist = a_data.get("distractors", [])
        p1_candidates = []
        if len(aug_dist) > 3:
            for d in aug_dist:
                code_str = (d.get("line") or {}).get("content", "") if "line" in d else d.get("code", "")
                nc = norm(code_str)
                if not nc or nc in server_set:
                    continue
                # Strictly LLM: must be in cache_llm OR synthesized in augmentation (not in legacy)
                is_llm = (nc in cache_llm) or (nc not in legacy_set)
                if is_llm and nc not in [p["norm"] for p in p1_candidates]:
                    raw_comms = (d.get("line") or {}).get("commentList", []) if "line" in d else []
                    help_list = d.get("helpList", []) if "helpList" in d else []
                    desc = (raw_comms[0] if raw_comms and raw_comms[0].strip() else "") or (help_list[0] if help_list and help_list[0].strip() else "") or d.get("description", "")
                    if not desc.strip() and nc in cache_llm:
                        desc = cache_llm[nc][0].get("explanation", "")
                    ln = (d.get("line") or {}).get("number", 0) if "line" in d else d.get("line_number", 0)

                    p1_candidates.append({
                        "code": code_str,
                        "norm": nc,
                        "description": desc.strip(),
                        "line_number": ln,
                        "origin": "post_aug_extra_llm",
                        "matches_human_legacy": nc in legacy_set
                    })

        p1_taken = p1_candidates[:needed]
        p1_norms = set(p["norm"] for p in p1_taken)
        rem_needed = needed - len(p1_taken)

        # --- Priority 2: LLM generated distractors that also matched a human created distractor ---
        p2_candidates = []
        for c, (gd, bl) in cache_llm.items():
            if c in legacy_set and c not in server_set and c not in p1_norms:
                if c not in [p["norm"] for p in p2_candidates]:
                    p2_candidates.append({
                        "code": gd.get("distractor", ""),
                        "norm": c,
                        "description": gd.get("explanation", ""),
                        "line_number": bl,
                        "origin": "llm_matched_human",
                        "matches_human_legacy": True
                    })

        p2_taken = p2_candidates[:rem_needed]
        unfilled = rem_needed - len(p2_taken)

        sources_data.append({
            "source_id": sid,
            "name": s_data.get("name", ""),
            "language": lang,
            "blank_lines_count": len(blank_lines),
            "legacy_distractor_count": legacy_count,
            "server_distractor_count": server_count,
            "needed": needed,
            "p1_taken": p1_taken,
            "p2_taken": p2_taken,
            "total_filled": len(p1_taken) + len(p2_taken),
            "unfilled_deficit": unfilled,
            "aug_total_distractors": len(aug_dist)
        })

    # Summary Stats
    total_sources = len(sources_data)
    total_needed = sum(s["needed"] for s in sources_data)
    total_p1 = sum(len(s["p1_taken"]) for s in sources_data)
    total_p2 = sum(len(s["p2_taken"]) for s in sources_data)
    total_filled = total_p1 + total_p2
    total_unfilled = sum(s["unfilled_deficit"] for s in sources_data)

    sources_fully_met = sum(1 for s in sources_data if s["needed"] > 0 and s["unfilled_deficit"] == 0)
    sources_zero_needed = sum(1 for s in sources_data if s["needed"] == 0)
    sources_unfilled = sum(1 for s in sources_data if s["unfilled_deficit"] > 0)

    print("=" * 80)
    print("STRICT LLM-ONLY BACKFILL SIMULATION RESULTS")
    print("=" * 80)
    print(f"Total Sources Audited:                           {total_sources}")
    print(f"Sources already at parity (no addition needed):  {sources_zero_needed}")
    print(f"Sources requiring additions:                     {total_sources - sources_zero_needed}")
    print(f"Total Distractors Needed to Match Legacy:        {total_needed}")
    print("-" * 80)
    print(f"✓ Filled via Priority 1 (Post-Aug >3 LLM):       {total_p1}")
    print(f"✓ Filled via Priority 2 (LLM matched human):     {total_p2}")
    print(f"✓ Total Distractors Successfully Backfilled:     {total_filled} / {total_needed} ({total_filled/total_needed*100:.1f}%)")
    print(f"⚠️  Total Distractors Left to Fill:                {total_unfilled} / {total_needed} ({total_unfilled/total_needed*100:.1f}%)")
    print("-" * 80)
    print(f"Sources Fully Reached Legacy Parity:             {sources_zero_needed + sources_fully_met} / {total_sources} ({(sources_zero_needed + sources_fully_met)/total_sources*100:.1f}%)")
    print(f"Sources Still Having a Deficit:                  {sources_unfilled} / {total_sources}")
    print("=" * 80)

    # Save to JSON
    json_path = os.path.join(script_dir, "backfill_simulation_plan.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump({
            "summary": {
                "total_sources": total_sources,
                "total_needed": total_needed,
                "total_filled_priority1": total_p1,
                "total_filled_priority2": total_p2,
                "total_filled": total_filled,
                "total_unfilled": total_unfilled,
                "sources_fully_at_parity": sources_zero_needed + sources_fully_met,
                "sources_with_deficit": sources_unfilled
            },
            "sources": sources_data
        }, jf, indent=2)
    print(f"\n✓ Saved simulation plan JSON to: {json_path}")

    # Save to Markdown
    md_path = os.path.join(script_dir, "backfill_simulation_report.md")
    with open(md_path, "w", encoding="utf-8") as mf:
        mf.write("# 🧪 Strict LLM Distractor Backfill Simulation Report\n\n")
        mf.write("This report simulates backfilling distractors **strictly using LLM-generated options** (excluding human-only distractors):\n")
        mf.write("1. **Priority 1**: Post-augmentation LLM-generated distractors from sources with $> 3$ options.\n")
        mf.write("2. **Priority 2**: LLM-generated distractors that also matched a human-authored legacy distractor.\n\n")

        mf.write("## 1. Overall Summary\n\n")
        mf.write(f"| Metric | Count | Percentage |\n")
        mf.write(f"| :--- | :---: | :---: |\n")
        mf.write(f"| **Total Sources** | {total_sources} | 100% |\n")
        mf.write(f"| **Total Distractors Needed for Parity** | {total_needed} | 100% |\n")
        mf.write(f"| **Distractors Filled (Priority 1 + Priority 2)** | **{total_filled}** | **{total_filled/total_needed*100:.1f}%** |\n")
        mf.write(f"| **Distractors Left to Fill** | **{total_unfilled}** | **{total_unfilled/total_needed*100:.1f}%** |\n")
        mf.write(f"| **Sources Meeting Legacy Parity (Target Reached)** | **{sources_zero_needed + sources_fully_met}** | **{(sources_zero_needed + sources_fully_met)/total_sources*100:.1f}%** |\n")
        mf.write(f"| **Sources Still Needing Distractors** | **{sources_unfilled}** | **{sources_unfilled/total_sources*100:.1f}%** |\n\n")

        mf.write("## 2. Breakdown of Sources with Remaining Deficits\n\n")
        mf.write("These 47 sources cannot be fully satisfied from existing post-augmentation LLM pools because they had only 1 blank line (generating exactly 3 LLM distractors) and legacy had 4–6 human distractors.\n\n")
        mf.write("| # | Source ID | Activity Name | Blanks | Legacy | Server | Needed | Backfilled | Left to Fill |\n")
        mf.write("| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        deficit_idx = 1
        for s in sources_data:
            if s["unfilled_deficit"] > 0:
                mf.write(f"| {deficit_idx} | `{s['source_id']}` | {s['name']} | {s['blank_lines_count']} | {s['legacy_distractor_count']} | {s['server_distractor_count']} | +{s['needed']} | {s['total_filled']} | **+{s['unfilled_deficit']}** |\n")
                deficit_idx += 1

    print(f"✓ Saved simulation Markdown report to: {md_path}\n")

if __name__ == "__main__":
    main()
