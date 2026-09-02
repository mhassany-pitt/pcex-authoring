import json
import os
import glob
import csv
import random

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
    augmented_bundles_dir = os.path.join(script_dir, "augmented_bundles")
    backfilled_sources_dir = os.path.join(script_dir, "backfilled_sources")
    md_out = os.path.join(script_dir, "sources_validation_list.md")
    csv_out = os.path.join(script_dir, "sources_validation_list.csv")

    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    sources_map = mapping.get("sources", {})
    bundles_map = mapping.get("bundles", {})

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

    bundle_files = sorted(glob.glob(os.path.join(augmented_bundles_dir, "*.json")))

    random.seed(42)
    shuffled_bundles = bundle_files.copy()
    random.shuffle(shuffled_bundles)

    assignments = {c: [] for c in COLLABORATORS}
    for idx, b_path in enumerate(shuffled_bundles):
        c = COLLABORATORS[idx % len(COLLABORATORS)]
        assignments[c].append(b_path)

    csv_rows = [
        ["Status", "Assigned To", "#", "Bundle Name", "Bundle ID", "Source Name", "Source ID", "Role", "Language", "Blanks", "Blanks Action", "Total Distractors", "Backfilled Count", "Distractor Action", "Direct Editor Link"]
    ]

    # Pre-calculate counts per collaborator for the top summary table
    collab_stats = {}
    for c in COLLABORATORS:
        b_list = assignments[c]
        c_sources = 0
        c_needs_dist_review = 0
        c_blanks_gt_2 = 0
        for b_path in b_list:
            with open(b_path, "r", encoding="utf-8") as bf:
                data = json.load(bf)
            b_obj = data.get("bundle", data)
            for item in b_obj.get("items", []):
                c_sources += 1
                sid = item.get("item")
                s_file = os.path.join(backfilled_sources_dir, f"{sid}.json")
                if os.path.exists(s_file):
                    with open(s_file, "r", encoding="utf-8") as sf:
                        s_data = json.load(sf)
                    blanks = sum(1 for ln, info in s_data.get("lines", {}).items() if info.get("blank"))
                    b_tags = sum(1 for d in s_data.get("distractors", []) if d.get("description", "").startswith("[backfilled]"))
                    if blanks > 2:
                        c_blanks_gt_2 += 1
                    if b_tags > 0:
                        c_needs_dist_review += 1
        collab_stats[c] = {
            "bundles": len(b_list),
            "sources": c_sources,
            "needs_dist_review": c_needs_dist_review,
            "blanks_gt_2": c_blanks_gt_2,
            "ready": c_sources - max(c_needs_dist_review, c_blanks_gt_2)
        }

    with open(md_out, "w", encoding="utf-8") as f:
        f.write("# 📝 PCEX Sources Validation Checklist\n\n")
        
        f.write("> **Instructions for Reviewers:**\n")
        f.write("> 1. **⚠️ Distractor Review (33 sources)**: Sources flagged with `⚠️ Needs Distractor Review` contain newly backfilled LLM distractors marked with `[backfilled]` in their explanation.\n")
        f.write(">    - Click lines with blue **`[ ]`** in the gutter (or check **\"Show All\"** in the distractors tab).\n")
        f.write(">    - Review all available generated options, **keep the best 3, and delete the rest** so the source meets the $\\le 3$ distractor requirement.\n")
        f.write("> 2. **⚠️ Reduce Blank Lines (Max 2 blanks · 23 sources)**: Sources flagged with `⚠️ Reduce Blanks (3→2 or 4→2)` currently have more than 2 blank challenge lines.\n")
        f.write(">    - Click the blue **`[ ]`** in the gutter on lines that are least critical for assessment to un-blank them until at most **2 blank lines** remain.\n")
        f.write("> 3. **Line Explanations**: Click lines with **`?`** in the editor to inspect and edit explanation steps if needed.\n")
        f.write("> 4. **Mark Validated**: Once you finish reviewing and saving a source, **remove the `validation-pending` tag** from its tag list and check off (`- [x]`) the box below.\n\n")

        f.write(f"**Quick Filters:** [🔍 All Pending Sources]({BASE_SOURCES_FILTER}) &nbsp;•&nbsp; [📦 All Pending Bundles]({BASE_BUNDLES_FILTER})\n\n")

        # Summary Table
        f.write("### 📊 Distribution Summary (Click email to jump to your section)\n\n")
        f.write("| Collaborator | Assigned Bundles | Assigned Sources | ⚠️ Needs Distractor Review | ⚠️ Blanks > 2 (Reduce to 2) |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: |\n")
        
        for c in COLLABORATORS:
            st = collab_stats[c]
            anchor = c.replace("@", "-").replace(".", "-")
            f.write(f"| [**`{c}`**](#{anchor}) | {st['bundles']} bundles | {st['sources']} sources | **{st['needs_dist_review']} sources** | **{st['blanks_gt_2']} sources** |\n")

        f.write("\n---\n\n")

        global_idx = 1

        for c in COLLABORATORS:
            b_list = assignments[c]
            st = collab_stats[c]
            anchor = c.replace("@", "-").replace(".", "-")
            
            f.write(f'<a id="{anchor}"></a>\n\n')
            f.write(f"## 👤 Assigned to: `{c}` ({st['bundles']} bundles · {st['sources']} sources · **{st['needs_dist_review']} distractor reviews** · **{st['blanks_gt_2']} reduce blanks**)\n\n")

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

                    s_file = os.path.join(backfilled_sources_dir, f"{old_sid}.json")
                    blanks_count = 0
                    distractors_count = 0
                    backfilled_count = 0
                    if os.path.exists(s_file):
                        with open(s_file, "r", encoding="utf-8") as sf:
                            s_data = json.load(sf)
                        blanks_count = sum(1 for ln, l_info in s_data.get("lines", {}).items() if l_info.get("blank"))
                        distractors = s_data.get("distractors", [])
                        distractors_count = len(distractors)
                        backfilled_count = sum(1 for d in distractors if d.get("description", "").startswith("[backfilled]"))

                    editor_link = f"{BASE_EDITOR_URL}/{new_sid}"

                    # Blanks formatting
                    if blanks_count > 2:
                        blank_label = f"**{blanks_count}→2 blanks** ⚠️"
                        blank_action = f"Reduce {blanks_count} to 2"
                    elif blanks_count == 1:
                        blank_label = "1 blank"
                        blank_action = "OK"
                    else:
                        blank_label = f"{blanks_count} blanks"
                        blank_action = "OK"

                    # Distractors formatting
                    if backfilled_count > 0:
                        dist_label = f"**{distractors_count}→3 distr.** &nbsp;•&nbsp; ⚠️ **Needs Distractor Review (+{backfilled_count} backfilled)**"
                        dist_action = f"Reduce {distractors_count} to 3 (Review {backfilled_count} backfilled)"
                    else:
                        dist_label = f"{distractors_count} distr. (OK)"
                        dist_action = "OK"

                    # Overall status
                    if backfilled_count > 0 and blanks_count > 2:
                        overall_status = "Needs Distractor & Blanks Review"
                    elif backfilled_count > 0:
                        overall_status = "Needs Distractor Review"
                    elif blanks_count > 2:
                        overall_status = "Needs Blanks Reduction"
                    else:
                        overall_status = "Ready / OK"

                    f.write(f"  - [ ] #{global_idx} [**{source_name}**]({editor_link}) &nbsp;•&nbsp; `{role}` &nbsp;•&nbsp; {blank_label} &nbsp;•&nbsp; {dist_label}\n")

                    csv_rows.append([
                        overall_status,
                        c,
                        global_idx,
                        bundle_name,
                        new_bid,
                        source_name,
                        new_sid,
                        role,
                        lang,
                        blanks_count,
                        blank_action,
                        distractors_count,
                        backfilled_count,
                        dist_action,
                        editor_link
                    ])
                    global_idx += 1

                f.write("\n")

            f.write("[⬆ Back to Top](#-pcex-sources-validation-checklist)\n\n---\n\n")

    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    print(f"Generated task list in {md_out} and {csv_out}.")

if __name__ == "__main__":
    main()
