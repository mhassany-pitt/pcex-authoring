#!/usr/bin/env python3
"""
Reproduce and stage backend translation logs for all 123 PCEX Python Arabic sources.
Generates exact { request, response } log files matching the PCEX backend schema
under scripts/translation-arabic-python/staged_logs/<ar_sid>/<timestamp>-translation.json.

NO external API or OpenAI calls are made. All logs are reconstructed from local data:
- Input / Prompt (English backup): scripts/translation-arabic-python/source_backups/<ar_sid>.json
- Output / Translation (Arabic):   scripts/translation-arabic-python/translated_sources/<ar_sid>.json
- Metadata / Timestamp:           scripts/translation-arabic-python/progress.json
"""

import os
import json
import re
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, "source_backups")
TRANS_DIR = os.path.join(BASE_DIR, "translated_sources")
PROGRESS_FILE = os.path.join(BASE_DIR, "progress.json")
MAPPING_FILE = os.path.join(BASE_DIR, "translations_mapping.json")
STAGED_DIR = os.path.join(BASE_DIR, "staged_logs")

TRANS_ASSISTANT_TEMPLATE = (
    "You are a helpful assistant that translates programming worked examples "
    "into other natural languages, maintaining both technical accuracy and the original code formatting."
)

TRANS_MODEL_TEMPLATE = """
[[TASK-DEFINITION]]
You will be given a worked example. Your job is to translate the [[WORKED-EXAMPLE]] according to the [[TASK-INSTRUCTIONS]].

[[WORKED-EXAMPLE]]
[[PROGRAM-NAME]]
<<program-name>>

[[PROGRAM-DESCRIPTION]]
<<program-description>>

[[SOURCE-CODE]]
<<source-code>>
<<line-explanations>><<line-distractors>>
[[TASK-INSTRUCTIONS]]
Translate the given worked example into Arabic. Be sure to specifically translate the sections labeled [[PROGRAM-NAME]], [[PROGRAM-DESCRIPTION]], [[SOURCE-CODE]], [[LINE-EXPLANATIONS]], and [[LINE-DISTRACTORS]]. In the [[SOURCE-CODE]] section, translate ONLY user-defined string-literals and comments; make sure they are ASCII-folded (i.e., remove any accents or non-ASCII characters). Preserve the original format and Do NOT add, remove, or change any content beyond translation.
""".strip()

def build_prompt(src):
    lineExplanations = []
    sorted_lines = sorted(src.get("lines", {}).keys(), key=lambda x: int(x) if x.isdigit() else 999)
    for ln_str in sorted_lines:
        if not ln_str.isdigit():
            continue
        ln_info = src["lines"][ln_str]
        comms = ln_info.get("commentList", ln_info.get("comments", []))
        for i, c in enumerate(comms):
            txt = c if isinstance(c, str) else c.get("content", "")
            if txt:
                lineExplanations.append(f"[[LINE{int(ln_str):02d}.EXPL{i+1}]] {txt}")

    distExplanations = []
    for i, d in enumerate(src.get("distractors", [])):
        code_val = d.get("code") or (d.get("line") or {}).get("content", "")
        if code_val:
            distExplanations.append(f"[[DIST{i+1}.LC]] {code_val}")
        desc = d.get("description")
        if not desc:
            comm_list = (d.get("line") or {}).get("commentList", [])
            desc = comm_list[0] if comm_list else ""
        if desc:
            distExplanations.append(f"[[DIST{i+1}.EXPL]] {desc}")

    sourceCode = "\n".join(f"[[LINE{i+1:02d}]] {l}" for i, l in enumerate(src.get("code", "").split("\n")))

    prompt = (
        TRANS_MODEL_TEMPLATE
        .replace("<<program-name>>", src.get("name", ""))
        .replace("<<program-description>>", src.get("description", ""))
        .replace("<<source-code>>", sourceCode)
        .replace("<<line-explanations>>", f"\n[[LINE-EXPLANATIONS]]\n" + "\n".join(lineExplanations) + "\n" if lineExplanations else "")
        .replace("<<line-distractors>>", f"\n[[LINE-DISTRACTORS]]\n" + "\n".join(distExplanations) + "\n" if distExplanations else "")
    )
    return prompt

def build_output_text(trans_src):
    name = trans_src.get("name", "")
    desc = trans_src.get("description", "")
    
    # Source code with [[LINE01]] format
    source_lines = trans_src.get("code", "").split("\n")
    sourceCode = "\n".join(f"[[LINE{i+1:02d}]] {l}" for i, l in enumerate(source_lines))

    # Line explanations
    trans_lineExplanations = []
    sorted_trans_lines = sorted(trans_src.get("lines", {}).keys(), key=lambda x: int(x) if x.isdigit() else 999)
    for ln_str in sorted_trans_lines:
        if not ln_str.isdigit():
            continue
        ln_info = trans_src["lines"][ln_str]
        comms = ln_info.get("commentList", ln_info.get("comments", []))
        for i, c in enumerate(comms):
            txt = c if isinstance(c, str) else c.get("content", "")
            if txt:
                trans_lineExplanations.append(f"[[LINE{int(ln_str):02d}.EXPL{i+1}]] {txt}")

    # Distractors
    trans_distExplanations = []
    for i, d in enumerate(trans_src.get("distractors", [])):
        code_val = d.get("code") or (d.get("line") or {}).get("content", "")
        if code_val:
            trans_distExplanations.append(f"[[DIST{i+1}.LC]] {code_val}")
        desc_val = d.get("description")
        if not desc_val:
            comm_list = (d.get("line") or {}).get("commentList", [])
            desc_val = comm_list[0] if comm_list else ""
        if desc_val:
            trans_distExplanations.append(f"[[DIST{i+1}.EXPL]] {desc_val}")

    parts = [
        f"[[PROGRAM-NAME]]\n{name}",
        f"[[PROGRAM-DESCRIPTION]]\n{desc}",
        f"[[SOURCE-CODE]]\n{sourceCode}"
    ]
    if trans_lineExplanations:
        parts.append(f"[[LINE-EXPLANATIONS]]\n" + "\n".join(trans_lineExplanations))
    if trans_distExplanations:
        parts.append(f"[[LINE-DISTRACTORS]]\n" + "\n".join(trans_distExplanations))

    return "\n\n".join(parts) + "\n"

def stage_all():
    os.makedirs(STAGED_DIR, exist_ok=True)

    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        progress = json.load(f)

    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    total_staged = 0
    errors = []

    print(f"Staging logs for {len(progress)} sources...")

    for ar_sid, pinfo in progress.items():
        backup_file = os.path.join(BACKUP_DIR, f"{ar_sid}.json")
        trans_file = os.path.join(TRANS_DIR, f"{ar_sid}.json")

        if not os.path.exists(backup_file):
            errors.append(f"Missing backup for {ar_sid}")
            continue
        if not os.path.exists(trans_file):
            errors.append(f"Missing translation for {ar_sid}")
            continue

        with open(backup_file, "r", encoding="utf-8") as f:
            orig = json.load(f)
        with open(trans_file, "r", encoding="utf-8") as f:
            trans = json.load(f)

        # 1. Reconstruct prompt
        prompt = build_prompt(orig)
        request_payload = [
            {"role": "system", "content": TRANS_ASSISTANT_TEMPLATE},
            {"role": "user", "content": prompt}
        ]

        # 2. Reconstruct output text
        output_text = build_output_text(trans)

        # 3. Format timestamp and epoch
        updated_at = pinfo.get("updated_at", "2026-10-20T14:50:00Z")
        # Ensure millisecond format for file name matching server style: 2026-10-20T14:50:28.000Z
        dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        iso_timestamp = dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        created_epoch = int(dt.timestamp())

        response_payload = {
            "output_text": output_text,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": output_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "id": f"chatcmpl-reprod-{ar_sid[:12]}",
            "object": "chat.completion",
            "created": created_epoch,
            "model": "gpt-5-mini-2025-08-07"
        }

        log_data = {
            "request": request_payload,
            "response": response_payload
        }

        # Target directory
        src_staged_dir = os.path.join(STAGED_DIR, ar_sid)
        os.makedirs(src_staged_dir, exist_ok=True)
        log_file = os.path.join(src_staged_dir, f"{iso_timestamp}-translation.json")

        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        total_staged += 1

    print(f"\n✓ Successfully staged {total_staged} translation log files in: {STAGED_DIR}")
    if errors:
        print(f"⚠️ Encountered {len(errors)} errors:")
        for err in errors:
            print("  ", err)

if __name__ == "__main__":
    stage_all()
