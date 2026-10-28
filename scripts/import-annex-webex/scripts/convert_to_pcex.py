#!/usr/bin/env python3
"""
convert_to_pcex.py

Transforms all 604 AnnEx and 231 WebEx items from local normalized JSONs into
PCEX Source and Activity (bundle) payloads matching the PCEX schema.

Tags Convention:
- Primary provenance:
    - AnnEx: "annex;color=green"
    - WebEx: "webex;color=#0d9488"
- Traceability:
    - "annex_key:<id>"
    - "webex_key:<id>"
- Course / Topic tags (neutral gray):
    - "python-intro", "pitt-c", "deitel-c", "deitel-cpp", "webex-cpp"
    - "acos-sql", "is17-java", "javatutorial", "csedpad", "acos-cpp", "annex-java"
- Author tag: "author:<name>" when author is known and not generic.
"""

import os
import sys
import json
import glob
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
ANNEX_DIR = os.path.join(DOWNLOADS_DIR, "annex")
WEBEX_DIR = os.path.join(DOWNLOADS_DIR, "webex")

OUT_SOURCES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_sources.json")
OUT_ACTIVITIES_FILE = os.path.join(DOWNLOADS_DIR, "pcex_activities.json")

LANGUAGE_MAP = {
    "java": "JAVA",
    "python": "PYTHON",
    "c": "C",
    "cpp": "CPP",
    "c++": "CPP",
    "sql": "SQL",
}

DEFAULT_FILENAMES = {
    "JAVA": "Main.java",
    "PYTHON": "main.py",
    "C": "main.c",
    "CPP": "main.cpp",
    "SQL": "query.sql",
}

USER_EMAIL = "moh70@pitt.edu"

def get_author_tag(authors):
    if not authors:
        return None
    for a in authors:
        name = a.get("name") if isinstance(a, dict) else str(a)
        if name and name.strip() and name.strip().lower() not in ["administrator", "unknown", "admin", ""]:
            return f"author:{name.strip()}"
    return None

def determine_annex_topic(item_id, lang):
    iid = item_id.lower()
    if item_id.startswith("IS"):
        return "is17-java"
    elif item_id.startswith("JavaTutorial") or "javatutorial" in iid:
        return "javatutorial"
    elif item_id.startswith("csedpad") or "csedpad" in iid:
        return "csedpad"
    elif lang == "SQL":
        return "acos-sql"
    elif lang == "CPP":
        return "acos-cpp"
    elif lang == "JAVA":
        return "annex-java"
    return f"annex-{lang.lower()}"

def determine_webex_topic(item_id, lang):
    iid = item_id.lower()
    if lang == "PYTHON" or iid.startswith("pyt") or iid.startswith("pytt"):
        return "python-intro"
    elif iid.startswith("fig"):
        return "deitel-cpp" if lang == "CPP" else "deitel-c"
    elif lang == "C":
        return "pitt-c"
    elif lang == "CPP":
        return "webex-cpp"
    return f"webex-{lang.lower()}"

def convert_item(data, provider):
    item_id = data.get("id")
    title = data.get("title") or item_id
    raw_lang = str(data.get("language", "")).lower()
    lang = LANGUAGE_MAP.get(raw_lang, "JAVA")
    filename = DEFAULT_FILENAMES.get(lang, "main.txt")
    code = data.get("code", "")
    lines = data.get("lines", [])
    desc = data.get("description", "") or ""

    # Build PCEX tags
    tags = []
    if provider == "AnnEx":
        tags.append("annex;color=green")
        tags.append(f"annex_key:{item_id}")
        topic = determine_annex_topic(item_id, lang)
        if topic:
            tags.append(topic)
    else:
        tags.append("webex;color=#0d9488")
        tags.append(f"webex_key:{item_id}")
        topic = determine_webex_topic(item_id, lang)
        if topic:
            tags.append(topic)

    author_tag = get_author_tag(data.get("authors", []))
    if author_tag:
        tags.append(author_tag)

    # Build lines map for PCEX Worked Example
    pcex_lines = {}
    for l in lines:
        lno = str(l.get("line_no"))
        exp = l.get("explanation", "")
        if exp and len(str(exp).strip()) > 0:
            pcex_lines[lno] = {
                "comments": [{"content": str(exp).strip()}],
                "blank": False
            }
        else:
            pcex_lines[lno] = {
                "comments": [],
                "blank": False
            }

    source_obj = {
        "user": USER_EMAIL,
        "name": title,
        "description": desc,
        "language": lang,
        "filename": filename,
        "code": code,
        "lines": pcex_lines,
        "distractors": [],
        "tags": tags,
        "collaborator_emails": [],
        "extraFiles": [],
        # Metadata preserving origin
        "_origin_id": item_id,
        "_catalog_id": data.get("catalog_id"),
        "_provider": provider,
    }

    activity_obj = {
        "user": USER_EMAIL,
        "name": title,
        "published": True,
        "archived": False,
        "linkings": True,
        "collaborator_emails": [],
        "items": [
            {
                "item": None,  # Will be populated with created source _id during import
                "type": "example",
                "details": {
                    "name": title,
                    "description": desc,
                    "language": lang,
                    "tags": tags
                }
            }
        ],
        "_origin_id": item_id,
        "_catalog_id": data.get("catalog_id"),
        "_provider": provider,
    }

    return source_obj, activity_obj

def main():
    annex_files = sorted(glob.glob(os.path.join(ANNEX_DIR, "*.json")))
    webex_files = sorted(glob.glob(os.path.join(WEBEX_DIR, "*.json")))

    print(f"Converting {len(annex_files)} AnnEx files and {len(webex_files)} WebEx files...")

    all_sources = []
    all_activities = []

    # Process AnnEx
    for fpath in annex_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        src, act = convert_item(data, "AnnEx")
        all_sources.append(src)
        all_activities.append(act)

    # Process WebEx
    for fpath in webex_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data.get("id") == "pcex_test":
            print(f"Skipping alias pointer: pcex_test")
            continue
        src, act = convert_item(data, "WebEx")
        all_sources.append(src)
        all_activities.append(act)

    print(f"\nGenerated {len(all_sources)} PCEX Sources and {len(all_activities)} PCEX Activities.")

    # Write out converted JSON files
    with open(OUT_SOURCES_FILE, "w", encoding="utf-8") as f:
        json.dump(all_sources, f, indent=2, ensure_ascii=False)
    print(f"Saved PCEX sources to: {OUT_SOURCES_FILE}")

    with open(OUT_ACTIVITIES_FILE, "w", encoding="utf-8") as f:
        json.dump(all_activities, f, indent=2, ensure_ascii=False)
    print(f"Saved PCEX activities to: {OUT_ACTIVITIES_FILE}")

    # Print summary statistics
    tag_counts = {}
    lang_counts = {}
    for s in all_sources:
        lang_counts[s["language"]] = lang_counts.get(s["language"], 0) + 1
        for t in s["tags"]:
            tag_counts[t] = tag_counts.get(t, 0) + 1

    print("\nLanguages in converted PCEX sources:")
    for l, c in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {l}: {c}")

    print("\nTop tags across converted items:")
    for t, c in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:25]:
        print(f"  {t}: {c}")

if __name__ == "__main__":
    main()
