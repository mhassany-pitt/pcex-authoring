import os
import json
import re

COLLABORATOR_EMAILS = [
    "rah225@pitt.edu",
    "peterb@pitt.edu",
    "arl122@pitt.edu",
    "quinnkwolter@pitt.edu",
    "hua1007.yu@connect.polyu.hk"
]

def goal_to_source_schema(goal, item_detail, author_info, source_id):
    """
    Transforms an activityGoal object from preview/Hub into a complete Source JSON structure
    matching editor-services SourceSchema.
    """
    # Reconstruct code from lineList
    line_list = goal.get("lineList", [])
    blank_lines = set()
    for b in goal.get("blankLineList", []):
        if isinstance(b, dict):
            ln_num = (b.get("line") or {}).get("number")
            if ln_num is not None:
                blank_lines.add(str(ln_num))
        else:
            blank_lines.add(str(b))
    
    lines_obj = {}
    code_lines = []
    
    for line in line_list:
        ln_num = str(line.get("number", 0))
        content = line.get("content", "")
        code_lines.append(content)
        
        lines_obj[ln_num] = {
            "content": content,
            "commentList": line.get("commentList", []),
            "indentLevel": line.get("indentLevel", 0),
            "blank": ln_num in blank_lines or int(ln_num) in blank_lines
        }
        
    code_text = "\n".join(code_lines)
    
    # Process distractors
    distractors_list = []
    for d in goal.get("distractorList", []):
        d_line = d.get("line") or {}
        distractors_list.append({
            "id": d.get("id"),
            "line": {
                "number": d_line.get("number", 0),
                "content": d_line.get("content", ""),
                "commentList": d_line.get("commentList", []),
                "indentLevel": d_line.get("indentLevel", 0)
            },
            "helpList": d.get("helpList", [])
        })
        
    # Existing tags + new requested tags with color-coding
    existing_tags = [t for t in item_detail.get("tags", []) if not t.startswith("gpt5mini") and not t.startswith("llm_expl") and not t.startswith("validation-pending")]
    color_tags = ["gpt5mini;color=purple", "llm_expl+dist&expl;color=blue", "validation-pending;color=orange"]
    new_tags = list(dict.fromkeys(existing_tags + color_tags))

    return {
        "id": source_id,
        "_id": source_id,
        "name": item_detail.get("name", goal.get("name", "")),
        "description": item_detail.get("description", goal.get("goalDescription", "")),
        "language": item_detail.get("language", goal.get("language", "PYTHON")),
        "iso_language_code": item_detail.get("iso_language_code", "en"),
        "tags": new_tags,
        "filename": goal.get("fileName", "main.py"),
        "code": code_text,
        "lines": lines_obj,
        "distractors": distractors_list,
        "programInput": goal.get("userInput", "") or ("\n".join(goal.get("userInputList", []))),
        "user": author_info.get("email", ""),
        "author": author_info,
        "collaborator_emails": COLLABORATOR_EMAILS
    }

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    matches_file = os.path.join(script_dir, "old_to_hub_matches.json")
    hub_index_file = os.path.join(script_dir, "hub.json")
    hub_dir = os.path.join(script_dir, "hub")
    
    out_bundles_dir = os.path.join(script_dir, "matched_bundles")
    out_sources_dir = os.path.join(script_dir, "matched_sources")
    os.makedirs(out_bundles_dir, exist_ok=True)
    os.makedirs(out_sources_dir, exist_ok=True)
    
    with open(matches_file, "r", encoding="utf-8") as f:
        matches_data = json.load(f)
        
    with open(hub_index_file, "r", encoding="utf-8") as f:
        hub_index = json.load(f)
        
    hub_map = {entry["id"]: entry for entry in hub_index if "id" in entry}
    
    saved_bundles = 0
    saved_sources = 0
    
    print(f"Processing exact matches (score == 1.0000) for old PCEX files...\n")
    
    for old_filename, match_info in matches_data.items():
        top_matches = match_info.get("top_matches", [])
        if not top_matches:
            print(f"Skipping {old_filename}: no matches found.")
            continue
            
        exact_match = top_matches[0]
        if exact_match.get("score", 0) < 0.9999:
            print(f"Skipping {old_filename}: top match score is {exact_match.get('score')}")
            continue
            
        hub_id = exact_match["hub_id"]
        bundle_entry = hub_map.get(hub_id)
        if not bundle_entry:
            print(f"Warning: Hub ID {hub_id} not found in hub.json")
            continue
            
        # Load activity goals from hub/<hub_id>.json
        hub_file_path = os.path.join(hub_dir, f"{hub_id}.json")
        if not os.path.exists(hub_file_path):
            print(f"Warning: File {hub_file_path} not found")
            continue
            
        with open(hub_file_path, "r", encoding="utf-8") as f:
            hub_goals_data = json.load(f)
            
        goals_list = []
        if isinstance(hub_goals_data, list) and len(hub_goals_data) > 0:
            goals_list = hub_goals_data[0].get("activityGoals", [])
        elif isinstance(hub_goals_data, dict):
            goals_list = hub_goals_data.get("activityGoals", [])
            
        author_info = bundle_entry.get("author", {})
        bundle_entry.pop("collaborators", None)
        bundle_entry["collaborator_emails"] = COLLABORATOR_EMAILS
        
        # 1. Save Bundle Details JSON
        bundle_out_path = os.path.join(out_bundles_dir, f"{hub_id}.json")
        bundle_to_save = {
            "old_filename": old_filename,
            "hub_id": hub_id,
            "bundle": bundle_entry
        }
        with open(bundle_out_path, "w", encoding="utf-8") as f:
            json.dump(bundle_to_save, f, indent=2)
        saved_bundles += 1
        
        # 2. Extract and Save Sources JSON for each item in the bundle
        for item in bundle_entry.get("items", []):
            source_id = item.get("item")
            item_details = item.get("details", {})
            
            # Find the corresponding goal from goals_list
            matched_goal = None
            for g in goals_list:
                # Goal name typically contains the source_id
                if source_id in g.get("name", "") or source_id in g.get("id", ""):
                    matched_goal = g
                    break
                    
            if not matched_goal and goals_list:
                # Fallback to matching by title/description
                for g in goals_list:
                    if g.get("name", "").startswith(item_details.get("name", "###")):
                        matched_goal = g
                        break
                        
            if matched_goal:
                source_json = goal_to_source_schema(matched_goal, item_details, author_info, source_id)
                source_out_path = os.path.join(out_sources_dir, f"{source_id}.json")
                with open(source_out_path, "w", encoding="utf-8") as f:
                    json.dump(source_json, f, indent=2)
                saved_sources += 1
            else:
                print(f"  ✗ Could not match goal for source {source_id} in {hub_id}")
                
        print(f"✓ [{hub_id}] {bundle_entry.get('name')} -> Saved bundle & {len(bundle_entry.get('items', []))} sources")
        
    print(f"\nCompleted! Saved {saved_bundles} bundles to 'matched_bundles/' and {saved_sources} sources to 'matched_sources/'.")

if __name__ == "__main__":
    main()
