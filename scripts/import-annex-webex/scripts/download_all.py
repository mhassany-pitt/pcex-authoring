import os
import sys
import json
import ssl
import re
import urllib.request
import subprocess

SSL_CTX = ssl._create_unverified_context()
CATALOG_URL = "https://adapt2.sis.pitt.edu/next.course-authoring/api/catalog-v2"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
ANNEX_OUT = os.path.join(DOWNLOADS_DIR, "annex")
WEBEX_OUT = os.path.join(DOWNLOADS_DIR, "webex")

ANNEX_CACHE_DIR = "/Users/jone30rw/Documents/Projects/thesis/playground/slc-catalog/workspace/annex/cache/annex"
WEBEX_CACHE_DIR = "/Users/jone30rw/Documents/Projects/thesis/playground/slc-catalog/workspace/annex/cache/webex"
ACOS_C_EXAMPLES = "/Users/jone30rw/Documents/Projects/paws/acos-annex-c/examples.js"

os.makedirs(ANNEX_OUT, exist_ok=True)
os.makedirs(WEBEX_OUT, exist_ok=True)

def safe_filename(ident_id):
    return re.sub(r'[^a-zA-Z0-9_\-\.]', '_', ident_id)

def main():
    print(f"Fetching SLC Catalog from {CATALOG_URL}...")
    req = urllib.request.Request(CATALOG_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        catalog = json.loads(r.read().decode("utf-8"))

    annex_catalog = [d for d in catalog if (d.get("attribution") or {}).get("provider") == "AnnEx"]
    webex_catalog = [d for d in catalog if (d.get("attribution") or {}).get("provider") == "WebEx"]

    print(f"Found {len(annex_catalog)} AnnEx items and {len(webex_catalog)} WebEx items in catalog.\n")

    # -------------------------------------------------------------
    # 1. Process AnnEx
    # -------------------------------------------------------------
    print("=" * 60)
    print("Processing AnnEx items...")
    print("=" * 60)
    annex_summary = []
    annex_success = 0
    annex_has_explanations = 0
    annex_has_desc = 0

    for idx, item in enumerate(annex_catalog, 1):
        ident_id = item.get("identity", {}).get("id", "")
        title = item.get("identity", {}).get("title", "")
        lang = (item.get("languages") or {}).get("programming_languages", ["unknown"])[0]
        cache_file = os.path.join(ANNEX_CACHE_DIR, f"{ident_id}.json")

        lines_list = []
        code_str = ""
        desc_str = item.get("content", {}).get("prompt") or ""

        if os.path.exists(cache_file):
            with open(cache_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            ad = cdata.get("annex_data", {})
            if not desc_str:
                desc_str = ad.get("description", "").strip()
            
            raw_lines = ad.get("lines", [])
            for l_idx, l_obj in enumerate(raw_lines, 1):
                l_code = l_obj.get("line", "")
                l_comm = l_obj.get("comment", "")
                # Clean line: replace non-breaking spaces, strip trailing CRLF
                l_clean = l_code.replace("\xa0", " ").rstrip("\r\n")
                if l_clean.startswith("\n"):
                    l_clean = l_clean[1:]
                if lang.lower() in ["java", "c", "c++", "cpp"]:
                    l_clean = l_clean.replace("\n", "\\n").replace("\r", "")
                lines_list.append({
                    "line_no": l_idx,
                    "code": l_clean,
                    "explanation": l_comm
                })
            code_str = "\n".join(l["code"] for l in lines_list)

        has_exp = any(bool(l["explanation"]) for l in lines_list)
        if has_exp:
            annex_has_explanations += 1
        if desc_str:
            annex_has_desc += 1

        record = {
            "id": ident_id,
            "catalog_id": item.get("id"),
            "provider": "AnnEx",
            "title": title,
            "language": lang,
            "paws_id": item.get("paws_id"),
            "authors": item.get("attribution", {}).get("authors", []),
            "publisher": item.get("attribution", {}).get("publisher", ""),
            "demo_url": item.get("links", {}).get("demo_url", ""),
            "description": desc_str,
            "code": code_str,
            "line_count": len(lines_list),
            "has_explanations": has_exp,
            "lines": lines_list,
            "catalog_metadata": {
                "tags": item.get("tags", []),
                "classification": item.get("classification", {}),
                "delivery": item.get("delivery", []),
                "rights": item.get("rights", {})
            }
        }

        out_path = os.path.join(ANNEX_OUT, f"{safe_filename(ident_id)}.json")
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(record, out_f, indent=2, ensure_ascii=False)

        annex_summary.append({
            "id": ident_id,
            "catalog_id": item.get("id"),
            "title": title,
            "language": lang,
            "line_count": len(lines_list),
            "has_description": bool(desc_str),
            "has_explanations": has_exp
        })
        annex_success += 1

    print(f"AnnEx: Saved {annex_success}/{len(annex_catalog)} items to {ANNEX_OUT}")
    print(f"  - Items with code lines: {annex_success}")
    print(f"  - Items with line explanations: {annex_has_explanations}")
    print(f"  - Items with problem description: {annex_has_desc}\n")

    # -------------------------------------------------------------
    # 2. Process WebEx
    # -------------------------------------------------------------
    print("=" * 60)
    print("Processing WebEx items...")
    print("=" * 60)

    # Load 6 C items from acos-annex-c/examples.js via node
    c_examples_raw = {}
    if os.path.exists(ACOS_C_EXAMPLES):
        node_cmd = f"node -e \"const ex = require('{ACOS_C_EXAMPLES}').examples; console.log(JSON.stringify(ex));\""
        try:
            res = subprocess.check_output(node_cmd, shell=True, timeout=10)
            c_examples_raw = json.loads(res.decode("utf-8"))
        except Exception as e:
            print(f"Warning: Could not load {ACOS_C_EXAMPLES} via node: {e}")

    webex_summary = []
    webex_success = 0
    webex_has_explanations = 0

    for idx, item in enumerate(webex_catalog, 1):
        ident_id = item.get("identity", {}).get("id", "")
        title = item.get("identity", {}).get("title", "")
        lang = (item.get("languages") or {}).get("programming_languages", ["unknown"])[0]
        cache_file = os.path.join(WEBEX_CACHE_DIR, f"{ident_id}.json")

        lines_list = []
        code_str = ""
        source_origin = "webex_cache"

        if os.path.exists(cache_file):
            with open(cache_file, "r", encoding="utf-8") as f:
                wdata = json.load(f)
            raw_lines = wdata.get("lines", [])
            annotations = wdata.get("annotations", {})
            for l_idx, l_obj in enumerate(raw_lines, 1):
                l_code = l_obj.get("code", "")
                sub_num = l_obj.get("sub")
                # Look up annotation by sub
                l_ann = annotations.get(str(sub_num), "") if sub_num is not None else ""
                l_clean = l_code.replace("\xa0", " ").rstrip("\r\n")
                if lang.lower() in ["c", "c++", "cpp"]:
                    l_clean = l_clean.replace("\n", "\\n").replace("\r", "")
                lines_list.append({
                    "line_no": l_idx,
                    "sub": sub_num,
                    "code": l_clean,
                    "explanation": l_ann
                })
            code_str = "\n".join(l["code"] for l in lines_list)
        else:
            # Check if it's one of the 6 C examples in acos-annex-c
            key_c = ident_id.replace(".", "_")
            if key_c in c_examples_raw:
                c_ex = c_examples_raw[key_c]
                source_origin = "acos_annex_c"
                raw_lines = c_ex.get("lines", [])
                for l_idx, l_obj in enumerate(raw_lines, 1):
                    l_code = l_obj.get("line", "")
                    l_comm = l_obj.get("comment", "")
                    l_clean = l_code.replace("\xa0", " ").rstrip("\r\n").replace("\n", "\\n").replace("\r", "")
                    lines_list.append({
                        "line_no": l_idx,
                        "code": l_clean,
                        "explanation": l_comm
                    })
                code_str = "\n".join(l["code"] for l in lines_list)
            elif ident_id == "pcex_test":
                source_origin = "pcex_legacy_alias"
                code_str = "# Legacy PCEX test pointer to for_loops.j_print_descendingly"

        has_exp = any(bool(l.get("explanation")) for l in lines_list)
        if has_exp:
            webex_has_explanations += 1

        record = {
            "id": ident_id,
            "catalog_id": item.get("id"),
            "provider": "WebEx",
            "title": title,
            "language": lang,
            "source_origin": source_origin,
            "paws_id": item.get("paws_id"),
            "authors": item.get("attribution", {}).get("authors", []),
            "publisher": item.get("attribution", {}).get("publisher", ""),
            "demo_url": item.get("links", {}).get("demo_url", ""),
            "description": item.get("content", {}).get("prompt") or "",
            "code": code_str,
            "line_count": len(lines_list),
            "has_explanations": has_exp,
            "lines": lines_list,
            "catalog_metadata": {
                "tags": item.get("tags", []),
                "classification": item.get("classification", {}),
                "delivery": item.get("delivery", []),
                "rights": item.get("rights", {})
            }
        }

        out_path = os.path.join(WEBEX_OUT, f"{safe_filename(ident_id)}.json")
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(record, out_f, indent=2, ensure_ascii=False)

        webex_summary.append({
            "id": ident_id,
            "catalog_id": item.get("id"),
            "title": title,
            "language": lang,
            "source_origin": source_origin,
            "line_count": len(lines_list),
            "has_explanations": has_exp
        })
        webex_success += 1

    print(f"WebEx: Saved {webex_success}/{len(webex_catalog)} items to {WEBEX_OUT}")
    print(f"  - Items with code lines: {sum(1 for w in webex_summary if w['line_count'] > 0)}")
    print(f"  - Items with line explanations: {webex_has_explanations}\n")

    # Save summary indexes
    with open(os.path.join(DOWNLOADS_DIR, "annex_summary.json"), "w", encoding="utf-8") as f:
        json.dump(annex_summary, f, indent=2)
    with open(os.path.join(DOWNLOADS_DIR, "webex_summary.json"), "w", encoding="utf-8") as f:
        json.dump(webex_summary, f, indent=2)

    print("=" * 60)
    print("Download and extraction complete!")
    print(f"Total AnnEx items: {len(annex_summary)} saved to {ANNEX_OUT}")
    print(f"Total WebEx items: {len(webex_summary)} saved to {WEBEX_OUT}")
    print(f"Summary files created in {DOWNLOADS_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
