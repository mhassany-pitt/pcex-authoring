#!/usr/bin/env python3
"""
generate_validation_list.py

Generates the task allocation checklist (sources_validation_list.md and .csv)
for the 5 evaluators across all 52 bundles and 123 sources:
- Reflects the synchronized legacy parity baseline (520 distractors, 234 blank lines)
- Updates reviewer instructions: focus on pedagogical quality, clarity, and correctness
- Clarifies that distractors should NOT be deleted to <= 3 (the limitation was removed)
- Clarifies that blank lines should NOT be reduced to <= 2 (blanks 1-4 match legacy)
"""

import json
import os
import glob
import csv
import random

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
    matched_bundles_dir = os.path.join(script_dir, "matched_bundles")
    parity_sources_dir = os.path.join(script_dir, "parity_sources")
    breakdown_file = os.path.join(script_dir, "distractor_sourcing_breakdown.json")
    md_out = os.path.join(script_dir, "sources_validation_list.md")
    csv_out = os.path.join(script_dir, "sources_validation_list.csv")

    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    sources_map = mapping.get("sources", {})
    bundles_map = mapping.get("bundles", {})

    breakdown_by_sid = {}
    if os.path.exists(breakdown_file):
        with open(breakdown_file, "r", encoding="utf-8") as f:
            breakdown_data = json.load(f)
            for s in breakdown_data.get("sources", []):
                sid = s.get("source_id")
                cats = {"llm_only": 0, "llm_matched_legacy": 0, "top_legacy_with_llm_exp": 0}
                for d in s.get("distractors", []):
                    cat = d.get("provenance_category")
                    if cat in cats:
                        cats[cat] += 1
                breakdown_by_sid[sid] = cats

    BASE_EDITOR_URL = "https://adapt2.sis.pitt.edu/pcex-authoring/#/editor"
    BASE_SOURCES_FILTER = "https://adapt2.sis.pitt.edu/pcex-authoring/#/sources?tags=validation-pending,llm_expl%2Bdist%26expl,gpt5mini"
    BASE_BUNDLES_FILTER = "https://adapt2.sis.pitt.edu/pcex-authoring/#/bundles?tags=gpt5mini,llm_expl%2Bdist%26expl,validation-pending"

    COLLABORATORS = [
        "moh70@pitt.edu",
        "rah225@pitt.edu",
        "arl122@pitt.edu",
        "quinnkwolter@pitt.edu",
        "hua1007.yu@connect.polyu.hk"
    ]

    bundle_files = sorted(glob.glob(os.path.join(matched_bundles_dir, "*.json")))

    # Keep deterministic allocation identical to previous version
    random.seed(42)
    shuffled_bundles = bundle_files.copy()
    random.shuffle(shuffled_bundles)

    assignments = {c: [] for c in COLLABORATORS}
    for idx, b_path in enumerate(shuffled_bundles):
        c = COLLABORATORS[idx % len(COLLABORATORS)]
        assignments[c].append(b_path)

    csv_rows = [
        ["Assigned To", "#", "Bundle Name", "Bundle ID", "Source Name", "Source ID", "Role", "Language", "Blank Lines", "Total Distractors", "LLM-Only", "LLM-Matched Legacy", "Top Legacy Backfilled", "Direct Editor Link"]
    ]

    # Calculate counts per collaborator
    collab_stats = {}
    for c in COLLABORATORS:
        b_list = assignments[c]
        c_sources = 0
        c_blanks = 0
        c_distractors = 0
        for b_path in b_list:
            with open(b_path, "r", encoding="utf-8") as bf:
                wrapper = json.load(bf)
            b_obj = wrapper.get("bundle", wrapper)
            for item in b_obj.get("items", []):
                c_sources += 1
                sid = item.get("item")
                s_file = os.path.join(parity_sources_dir, f"{sid}.json")
                if os.path.exists(s_file):
                    with open(s_file, "r", encoding="utf-8") as sf:
                        s_data = json.load(sf)
                    blanks = sum(1 for ln, info in s_data.get("lines", {}).items() if info.get("blank"))
                    distr = len(s_data.get("distractors", []))
                    c_blanks += blanks
                    c_distractors += distr
        collab_stats[c] = {
            "bundles": len(b_list),
            "sources": c_sources,
            "blanks": c_blanks,
            "distractors": c_distractors
        }

    with open(md_out, "w", encoding="utf-8") as f:
        f.write("# 📝 PCEX Sources Task Allocation & Evaluation Checklist\n\n")
        
        f.write("> **Evaluation Guidelines for Reviewers:**\n")
        f.write("> 1. **Legacy Parity Baseline:** All 123 sources have been synchronized with the legacy LAK25 baseline to ensure comparability. They have exact legacy distractor counts (520 total, 2–6 per source) and exact blank lines (234 total, 1–4 per source).\n")
        f.write("> 2. **DO NOT Delete Distractors:** The previous $\\le 3$ distractor cap in the `/editor` interface has been removed. Please keep the distractors as-is unless an option is pedagogically invalid or factually erroneous.\n")
        f.write("> 3. **DO NOT Reduce Blank Lines:** Sources with 3 or 4 blank lines are fully permitted and reflect the intended multi-blank design from the legacy activities.\n")
        f.write("> 4. **Distractor & Explanation Review:**\n")
        f.write(">    - Click lines with blue **`[ ]`** in the editor gutter to inspect distractor options and their explanations.\n")
        f.write(">    - Ensure explanations clearly explain *why* the option is incorrect and address student misconceptions.\n")
        f.write("> 5. **Line Explanations Review:** Click lines with **`?`** in the editor to inspect line-by-line pedagogical explanations (100% LLM-generated in English).\n")
        f.write("> 6. **Marking as Complete:** After reviewing and saving a source, remove the **`validation-pending`** tag from its tag list and check off (`- [x]`) the item in this checklist.\n\n")

        f.write(f"**Quick Filters:** [🔍 All Pending Sources]({BASE_SOURCES_FILTER}) &nbsp;•&nbsp; [📦 All Pending Bundles]({BASE_BUNDLES_FILTER})\n\n")

        # Summary Table
        f.write("### 📊 Distribution Summary (Click email to jump to your section)\n\n")
        f.write("| Collaborator | Assigned Bundles | Assigned Sources | Assigned Blank Lines | Assigned Distractors | Status |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: |\n")
        
        tot_bundles = sum(s['bundles'] for s in collab_stats.values())
        tot_sources = sum(s['sources'] for s in collab_stats.values())
        tot_blanks = sum(s['blanks'] for s in collab_stats.values())
        tot_distractors = sum(s['distractors'] for s in collab_stats.values())

        for c in COLLABORATORS:
            st = collab_stats[c]
            anchor = c.replace("@", "-").replace(".", "-")
            f.write(f"| [**`{c}`**](#{anchor}) | {st['bundles']} bundles | {st['sources']} sources | {st['blanks']} blanks | {st['distractors']} distractors | Pending Evaluation |\n")

        f.write(f"| **Total** | **{tot_bundles} bundles** | **{tot_sources} sources** | **{tot_blanks} blanks** | **{tot_distractors} distractors** | **100% Allocated** |\n")

        f.write("\n---\n\n")

        global_idx = 1

        for c in COLLABORATORS:
            b_list = assignments[c]
            st = collab_stats[c]
            anchor = c.replace("@", "-").replace(".", "-")
            
            f.write(f'<a id="{anchor}"></a>\n\n')
            f.write(f"## 👤 Assigned to: `{c}` ({st['bundles']} bundles · {st['sources']} sources · {st['blanks']} blanks · {st['distractors']} distractors)\n\n")

            for b_path in b_list:
                old_bid = os.path.splitext(os.path.basename(b_path))[0]
                new_bid = bundles_map.get(old_bid, old_bid)
                
                with open(b_path, "r", encoding="utf-8") as bf:
                    wrapper = json.load(bf)
                bundle = wrapper.get("bundle", wrapper)
                bundle_name = bundle.get("name", "Untitled Bundle")
                items = bundle.get("items", [])

                f.write(f"- [ ] **`{bundle_name}`** (`{new_bid}`)\n")

                for item in items:
                    old_sid = item.get("item")
                    new_sid = sources_map.get(old_sid, old_sid)
                    details = item.get("details", {})
                    source_name = details.get("name", "Untitled Source").strip()
                    role = "ex" if item.get("type") == "example" else "ch"
                    lang = details.get("language", "PYTHON")

                    s_file = os.path.join(parity_sources_dir, f"{old_sid}.json")
                    blanks_count = 0
                    distractors_count = 0
                    if os.path.exists(s_file):
                        with open(s_file, "r", encoding="utf-8") as sf:
                            s_data = json.load(sf)
                        blanks_count = sum(1 for ln, l_info in s_data.get("lines", {}).items() if l_info.get("blank"))
                        distractors = s_data.get("distractors", [])
                        distractors_count = len(distractors)

                    # Get sourcing breakdown stats for this source
                    cats = breakdown_by_sid.get(old_sid, {})
                    n_llm = cats.get("llm_only", 0)
                    n_matched = cats.get("llm_matched_legacy", 0)
                    n_top_legacy = cats.get("top_legacy_with_llm_exp", 0)

                    editor_link = f"{BASE_EDITOR_URL}/{new_sid}"

                    blank_label = f"{blanks_count} blank" if blanks_count == 1 else f"{blanks_count} blanks"
                    dist_label = f"{distractors_count} distr."

                    breakdown_tags = []
                    if n_llm > 0:
                        breakdown_tags.append(f"{n_llm} LLM-only")
                    if n_matched > 0:
                        breakdown_tags.append(f"{n_matched} LLM-matched")
                    if n_top_legacy > 0:
                        breakdown_tags.append(f"{n_top_legacy} legacy-imported")
                    
                    breakdown_str = f"({', '.join(breakdown_tags)})" if breakdown_tags else ""

                    f.write(f"  - [ ] #{global_idx} [**{source_name}**]({editor_link}) &nbsp;•&nbsp; `{role}` &nbsp;•&nbsp; {blank_label} &nbsp;•&nbsp; {dist_label} {breakdown_str}\n")

                    csv_rows.append([
                        c,
                        global_idx,
                        bundle_name,
                        new_bid,
                        source_name,
                        new_sid,
                        role,
                        lang,
                        blanks_count,
                        distractors_count,
                        n_llm,
                        n_matched,
                        n_top_legacy,
                        editor_link
                    ])
                    global_idx += 1

                f.write("\n")

            f.write("[⬆ Back to Top](#-pcex-sources-task-allocation--evaluation-checklist)\n\n---\n\n")

    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    print(f"✓ Successfully generated updated task list in {md_out} and {csv_out}.")

if __name__ == "__main__":
    main()
