import json
import os
import glob
import csv
import random

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
    augmented_bundles_dir = os.path.join(script_dir, "augmented_bundles")
    augmented_sources_dir = os.path.join(script_dir, "augmented_sources")
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
        ["Status", "Assigned To", "#", "Bundle Name", "Bundle ID", "Source Name", "Source ID", "Role", "Language", "Blanks", "Distractors", "Direct Editor Link"]
    ]

    with open(md_out, "w", encoding="utf-8") as f:
        f.write("# 📝 PCEX Sources Validation Checklist\n\n")
        
        f.write("> **Instructions for Reviewers:**\n")
        f.write("> 1. **Line Explanations**: Click lines with **`?`** in the editor to inspect and edit explanation steps.\n")
        f.write("> 2. **Distractors & Challenges**: Click lines with blue **`[ ]`** in the gutter to review distractors and misconception explanations.\n")
        f.write(">    - *Tip:* If distractors are not shown for a specific line, check **\"Show All\"** in the distractors tab (legacy PCEX did not bind distractors to line numbers, so \"Show All\" reveals all of them).\n")
        f.write("> 3. **⚠️ Distractor Limit (Max 3)**: The editor requires $\\le 3$ distractors per source. Please **review all generated options, keep the best 3, and delete the rest** so the source can be saved.\n")
        f.write("> 4. **⚠️ Blank Lines Limit (Max 4)**: A source cannot have more than 4 blank challenge lines.\n")
        f.write("> 5. **Mark Validated**: Once you finish reviewing and saving a source, **remove the `validation-pending` tag** from its tag list and check off (`- [x]`) the box below.\n\n")

        f.write(f"**Quick Filters:** [🔍 All Pending Sources]({BASE_SOURCES_FILTER}) &nbsp;•&nbsp; [📦 All Pending Bundles]({BASE_BUNDLES_FILTER})\n\n")

        # Summary Table
        f.write("### 📊 Distribution Summary (Click email to jump to your section)\n\n")
        f.write("| Collaborator | Assigned Bundles | Assigned Sources |\n")
        f.write("| :--- | :---: | :---: |\n")
        
        for c in COLLABORATORS:
            b_list = assignments[c]
            c_sources = 0
            for b_path in b_list:
                with open(b_path, "r", encoding="utf-8") as bf:
                    data = json.load(bf)
                b_obj = data.get("bundle", data)
                c_sources += len(b_obj.get("items", []))
            anchor = c.replace("@", "-").replace(".", "-")
            f.write(f"| [**`{c}`**](#{anchor}) | {len(b_list)} bundles | {c_sources} sources |\n")

        f.write("\n---\n\n")

        global_idx = 1

        for c in COLLABORATORS:
            b_list = assignments[c]
            c_sources_count = sum(len(json.load(open(bp)).get("bundle", json.load(open(bp))).get("items", [])) for bp in b_list)
            anchor = c.replace("@", "-").replace(".", "-")
            
            f.write(f'<a id="{anchor}"></a>\n\n')
            f.write(f"## 👤 Assigned to: `{c}` ({len(b_list)} bundles · {c_sources_count} sources)\n\n")

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

                    s_file = os.path.join(augmented_sources_dir, f"{old_sid}.json")
                    blanks_count = 0
                    distractors_count = 0
                    if os.path.exists(s_file):
                        with open(s_file, "r", encoding="utf-8") as sf:
                            s_data = json.load(sf)
                        blanks_count = sum(1 for ln, l_info in s_data.get("lines", {}).items() if l_info.get("blank"))
                        distractors_count = len(s_data.get("distractors", []))

                    editor_link = f"{BASE_EDITOR_URL}/{new_sid}"
                    dist_label = f"{distractors_count}→3 distr." if distractors_count > 3 else f"{distractors_count} distr."
                    blank_label = f"{blanks_count} blanks" if blanks_count != 1 else "1 blank"

                    f.write(f"  - [ ] #{global_idx} [**{source_name}**]({editor_link}) &nbsp;•&nbsp; `{role}` &nbsp;•&nbsp; {blank_label} &nbsp;•&nbsp; {dist_label}\n")

                    csv_rows.append([
                        "Pending",
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
