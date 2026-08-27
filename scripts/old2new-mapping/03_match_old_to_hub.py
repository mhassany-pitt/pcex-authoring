import os
import json
import glob
import re
from difflib import SequenceMatcher

def normalize_text(text):
    if not text:
        return ""
    # Normalize whitespaces and lowercase
    text = re.sub(r'\s+', ' ', text.strip().lower())
    return text

def text_similarity(s1, s2):
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    return SequenceMatcher(None, s1, s2).ratio()

def extract_goal_features(goal):
    """Extract comparison features from an activity goal."""
    desc = normalize_text(goal.get("goalDescription", ""))
    worked_out = bool(goal.get("fullyWorkedOut", False))
    
    # lineList contents and comments
    lines = []
    comments = []
    for l in goal.get("lineList", []):
        c = normalize_text(l.get("content", ""))
        if c:
            lines.append(c)
        for comm in l.get("commentList", []):
            norm_comm = normalize_text(comm)
            if norm_comm:
                comments.append(norm_comm)
                
    # distractorList line contents
    distractors = []
    for d in goal.get("distractorList", []):
        line_obj = d.get("line") or {}
        d_content = normalize_text(line_obj.get("content", ""))
        if d_content:
            distractors.append(d_content)
            
    return {
        "name": goal.get("name", ""),
        "fileName": goal.get("fileName", ""),
        "desc": desc,
        "worked_out": worked_out,
        "lines": lines,
        "comments": comments,
        "distractors": distractors
    }

def compare_goals(g1, g2):
    """
    Compare two goals:
    1. goalDescription similarity
    2. fullyWorkedOut match
    3. lineList content similarity
    4. lineList commentList similarity
    5. distractorList content similarity
    """
    # 1. Description similarity (high weight)
    desc_sim = text_similarity(g1["desc"], g2["desc"])
    
    # 2. fullyWorkedOut match
    worked_out_sim = 1.0 if g1["worked_out"] == g2["worked_out"] else 0.0
    
    # 3. lineList content similarity
    lines_str1 = "\n".join(g1["lines"])
    lines_str2 = "\n".join(g2["lines"])
    lines_sim = text_similarity(lines_str1, lines_str2)
    
    # 4. lineList commentList similarity
    comm_str1 = " ".join(g1["comments"])
    comm_str2 = " ".join(g2["comments"])
    comm_sim = text_similarity(comm_str1, comm_str2) if (comm_str1 or comm_str2) else 1.0
    
    # 5. distractorList similarity
    dist_str1 = "\n".join(g1["distractors"])
    dist_str2 = "\n".join(g2["distractors"])
    dist_sim = text_similarity(dist_str1, dist_str2) if (dist_str1 or dist_str2) else 1.0
    
    # Weighted goal score:
    # Description: 35%, Lines: 30%, Comments: 15%, Distractors: 10%, fullyWorkedOut: 10%
    goal_score = (
        0.35 * desc_sim +
        0.10 * worked_out_sim +
        0.30 * lines_sim +
        0.15 * comm_sim +
        0.10 * dist_sim
    )
    
    return {
        "goal_score": goal_score,
        "desc_sim": desc_sim,
        "worked_out_sim": worked_out_sim,
        "lines_sim": lines_sim,
        "comm_sim": comm_sim,
        "dist_sim": dist_sim
    }

def compute_activity_similarity(old_act, hub_act):
    """
    Compute similarity between an old PCEX activity and a hub activity.
    Matches language, requires old activityName to exist in hub activityName, 
    and checks ordered goal alignments.
    """
    old_lang = (old_act.get("language") or "").upper()
    hub_lang = (hub_act.get("language") or "").upper()
    
    # Hard filter on language
    if old_lang != hub_lang:
        return 0.0, {}

    # # Hard check: old activityName must be in hub activityName
    # old_act_name = normalize_text(old_act.get("activityName", ""))
    # hub_act_name = normalize_text(hub_act.get("activityName", ""))
    # if old_act_name and old_act_name not in hub_act_name:
    #     return 0.0, {}

    old_goals = [extract_goal_features(g) for g in old_act.get("activityGoals", [])]
    hub_goals = [extract_goal_features(g) for g in hub_act.get("activityGoals", [])]
    
    if not old_goals or not hub_goals:
        return 0.0, {}
        
    num_old = len(old_goals)
    num_hub = len(hub_goals)
    
    # Check ordered 1-to-1 goal match
    min_len = min(num_old, num_hub)
    goal_evals = []
    for i in range(min_len):
        eval_res = compare_goals(old_goals[i], hub_goals[i])
        goal_evals.append(eval_res)
        
    avg_goal_score = sum(e["goal_score"] for e in goal_evals) / min_len
    
    # Penalty if number of goals differs
    goal_count_penalty = min_len / max(num_old, num_hub)
    
    final_score = avg_goal_score * (0.85 + 0.15 * goal_count_penalty)
    
    detail = {
        "goal_count_match": f"{min_len}/{max(num_old, num_hub)}",
        "avg_desc_sim": sum(e["desc_sim"] for e in goal_evals) / min_len,
        "avg_lines_sim": sum(e["lines_sim"] for e in goal_evals) / min_len,
        "avg_comm_sim": sum(e["comm_sim"] for e in goal_evals) / min_len,
        "avg_dist_sim": sum(e["dist_sim"] for e in goal_evals) / min_len,
        "worked_out_all_match": all(e["worked_out_sim"] == 1.0 for e in goal_evals),
        "activityName": hub_act.get("activityName", "")
    }
    
    return final_score, detail

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    oldpcex_dir = os.path.join(script_dir, "oldpcex")
    hub_dir = os.path.join(script_dir, "hub")
    
    old_files = sorted(glob.glob(os.path.join(oldpcex_dir, "*.json")))
    hub_files = sorted(glob.glob(os.path.join(hub_dir, "*.json")))
    
    # Load all Hub activities into memory
    print(f"Loading {len(hub_files)} Hub files...")
    hub_activities = []
    for hpath in hub_files:
        hub_id = os.path.splitext(os.path.basename(hpath))[0]
        try:
            with open(hpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                for act in data:
                    hub_activities.append({"hub_file": os.path.basename(hpath), "hub_id": hub_id, "activity": act})
            elif isinstance(data, dict):
                hub_activities.append({"hub_file": os.path.basename(hpath), "hub_id": hub_id, "activity": data})
        except Exception as e:
            print(f"Error loading {hpath}: {e}")
            
    print(f"Loaded {len(hub_activities)} Hub activities in total.")
    print(f"Finding top 3-5 matches for {len(old_files)} old PCEX files...\n")
    
    results = {}
    
    for old_path in old_files:
        old_filename = os.path.basename(old_path)
        with open(old_path, "r", encoding="utf-8") as f:
            old_data = json.load(f)
            
        scores = []
        for hub_item in hub_activities:
            score, detail = compute_activity_similarity(old_data, hub_item["activity"])
            if score > 0.1:  # Filter out complete mismatches
                scores.append({
                    "hub_id": hub_item["hub_id"],
                    "hub_file": hub_item["hub_file"],
                    "activityName": hub_item["activity"].get("activityName", ""),
                    "score": round(score, 4),
                    "details": detail
                })
                
        # Sort descending by score
        scores.sort(key=lambda x: x["score"], reverse=True)
        top_matches = scores[:5]
        
        results[old_filename] = {
            "old_activityName": old_data.get("activityName", ""),
            "language": old_data.get("language", ""),
            "num_goals": len(old_data.get("activityGoals", [])),
            "top_matches": top_matches
        }
        
        print(f"--- {old_filename} (Act: {old_data.get('activityName')}) ---")
        for rank, m in enumerate(top_matches[:5], 1):
            print(f"  {rank}. [{m['score']:.4f}] Hub ID: {m['hub_id']} | Activity: {m['activityName']} (Goals match: {m['details']['goal_count_match']}, Desc: {m['details']['avg_desc_sim']:.2f}, Code: {m['details']['avg_lines_sim']:.2f}, Comm: {m['details']['avg_comm_sim']:.2f}, Dist: {m['details']['avg_dist_sim']:.2f})")
        print()

    # Save complete results to JSON
    out_result_file = os.path.join(script_dir, "old_to_hub_matches.json")
    with open(out_result_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"\nAll results successfully saved to {out_result_file}")

if __name__ == "__main__":
    main()
