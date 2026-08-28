import os
import glob
import json
import argparse
import ssl
import urllib.request
import urllib.error

DEFAULT_API_URL = os.environ.get("PCEX_API_URL", "http://localhost:3000/api")

def get_api_token(script_dir):
    """Retrieves API token from environment, file, or interactive prompt."""
    if os.environ.get("PCEX_API_TOKEN"):
        return os.environ["PCEX_API_TOKEN"]
        
    token_file = os.path.join(script_dir, "api_token.txt")
    if os.path.exists(token_file):
        with open(token_file, "r", encoding="utf-8") as f:
            token = f.read().strip()
            if token:
                return token
                
    token = input("Enter PCEX Bulk API Token: ").strip()
    return token

def load_mapping(mapping_file):
    if os.path.exists(mapping_file):
        try:
            with open(mapping_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"sources": {}, "bundles": {}}

def send_delete_request(url, headers, ctx):
    """Sends an HTTP DELETE request using standard urllib."""
    req = urllib.request.Request(
        url,
        headers=headers,
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def is_spanish_source(source_data):
    """Detects whether a source has Spanish line or distractor explanations."""
    ES_SYNTAX_WORDS = set([
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "en", "que", "es", "por", "para", "con",
        "su", "sus", "al", "del", "se", "lo", "le", "les", "este", "esta", "estos", "estas", "como", "más", "mas",
        "pero", "cuando", "donde", "cual", "cuál", "línea", "linea", "código", "codigo", "función", "funcion",
        "valor", "valores", "variable", "variables", "imprime", "muestra", "devuelve", "propósito", "proposito",
        "sintaxis", "semántica", "semantica", "buenas", "prácticas", "practicas", "errores", "comunes",
        "malentendidos", "paso", "tú", "tu", "puedes", "debes", "tener", "hacer", "usar", "programa", "ejecuta",
        "condición", "condicion", "bucle", "cadena", "número", "numero", "entero", "lista", "elemento", "elementos",
        "usuario", "entrada", "porque", "elegir", "esto", "comprobación", "comprobacion", "sentencia", "bloque"
    ])
    EN_SYNTAX_WORDS = set([
        "the", "a", "an", "is", "are", "was", "were", "to", "in", "of", "that", "this", "these", "those",
        "it", "its", "with", "as", "by", "on", "at", "from", "be", "which", "line", "code", "function",
        "value", "values", "variable", "variables", "prints", "shows", "returns", "purpose", "syntax",
        "semantics", "best", "practices", "common", "errors", "misconceptions", "step", "you", "can", "should",
        "have", "do", "use", "program", "runs", "condition", "loop", "string", "number", "integer", "list",
        "element", "elements", "user", "input", "because", "choose", "statement", "block", "output", "check"
    ])
    import re
    line_texts = []
    for ln, l_data in source_data.get("lines", {}).items():
        if isinstance(l_data, dict):
            for c in l_data.get("commentList", []):
                if isinstance(c, str) and c.strip():
                    line_texts.append(c.strip())
    dist_texts = []
    for d in source_data.get("distractors", []):
        if isinstance(d, dict):
            seen = set()
            for c in d.get("line", {}).get("commentList", []):
                if isinstance(c, str) and c.strip(): seen.add(c.strip())
            for h in d.get("helpList", []):
                if isinstance(h, str) and h.strip(): seen.add(h.strip())
            dist_texts.extend(list(seen))

    line_words = []
    for t in line_texts: line_words.extend(re.findall(r"\b[a-záéíóúñü]+\b", t.lower()))
    dist_words = []
    for t in dist_texts: dist_words.extend(re.findall(r"\b[a-záéíóúñü]+\b", t.lower()))

    line_es = sum(1 for w in line_words if w in ES_SYNTAX_WORDS)
    line_en = sum(1 for w in line_words if w in EN_SYNTAX_WORDS)
    dist_es = sum(1 for w in dist_words if w in ES_SYNTAX_WORDS)
    dist_en = sum(1 for w in dist_words if w in EN_SYNTAX_WORDS)

    return (line_es > line_en and line_es >= 3) or (dist_es > dist_en and dist_es >= 3)

def main():
    parser = argparse.ArgumentParser(description="Bulk delete previously imported augmented items via PCEX Bulk API.")
    parser.add_argument("--api", default=DEFAULT_API_URL, help=f"API Base URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--token", default=None, help="Bulk API token (default: read from api_token.txt)")
    parser.add_argument("--user", default="moh70@pitt.edu", help="Author email associated with items (default: moh70@pitt.edu)")
    parser.add_argument("--spanish-only", action="store_true", help="Only delete items that contain Spanish explanations")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
    augmented_sources_dir = os.path.join(script_dir, "augmented_sources")
    augmented_bundles_dir = os.path.join(script_dir, "augmented_bundles")

    if not os.path.exists(mapping_file):
        print(f"No mapping file found at {mapping_file}. Nothing to delete.")
        return

    mapping = load_mapping(mapping_file)
    sources_map = mapping.get("sources", {})
    bundles_map = mapping.get("bundles", {})

    if not sources_map and not bundles_map:
        print("Mapping file contains 0 imported items. Nothing to delete.")
        return

    # Filter if spanish-only
    sources_to_delete = list(sources_map.items())
    bundles_to_delete = list(bundles_map.items())

    if args.spanish_only:
        spanish_src_ids = set()
        for f in glob.glob(os.path.join(augmented_sources_dir, "*.json")):
            with open(f, "r", encoding="utf-8") as fp:
                s_data = json.load(fp)
            if is_spanish_source(s_data):
                spanish_src_ids.add(s_data.get("id") or s_data.get("_id"))
        
        sources_to_delete = [(old_id, new_id) for old_id, new_id in sources_map.items() if old_id in spanish_src_ids]

        # Bundles containing any spanish source
        spanish_bundle_ids = set()
        for bf in glob.glob(os.path.join(augmented_bundles_dir, "*.json")):
            with open(bf, "r", encoding="utf-8") as bfp:
                b_data = json.load(bfp)
            b_obj = b_data.get("bundle", b_data)
            b_id = b_obj.get("id") or os.path.splitext(os.path.basename(bf))[0]
            for item in b_obj.get("items", []):
                if item.get("item") in spanish_src_ids:
                    spanish_bundle_ids.add(b_id)
                    break
        bundles_to_delete = [(old_id, new_id) for old_id, new_id in bundles_map.items() if old_id in spanish_bundle_ids]

    api_url = args.api.rstrip("/")
    api_token = args.token or get_api_token(script_dir)
    user_email = args.user

    headers = {
        "api-token": api_token,
        "User-Agent": "PCEX-Bulk-Deleter/1.0"
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print("=" * 65)
    print("PCEX Bulk Deletion / Rollback")
    print("=" * 65)
    print(f"Target API Base URL: {api_url}")
    print(f"Author User: {user_email}")
    print(f"Filter mode: {'SPANISH ONLY' if args.spanish_only else 'ALL PCEX CLONES'}")
    print(f"Bundles to Delete: {len(bundles_to_delete)}")
    print(f"Sources to Delete: {len(sources_to_delete)}\n")

    # 1. Delete Bundles (Activities) first
    deleted_bundles = 0
    for old_bid, new_act_id in bundles_to_delete:
        del_url = f"{api_url}/bulk/activities/{new_act_id}?user={urllib.parse.quote(user_email)}"
        status_code, resp = send_delete_request(del_url, headers, ctx)
        if status_code in (200, 204):
            deleted_bundles += 1
            print(f"  ✓ Deleted bundle: {new_act_id} (old: {old_bid})")
            if old_bid in bundles_map:
                del bundles_map[old_bid]
        elif status_code == 404:
            print(f"  - Bundle not found (already deleted): {new_act_id}")
            if old_bid in bundles_map:
                del bundles_map[old_bid]
        else:
            print(f"  ✗ Failed to delete bundle {new_act_id} ({status_code}): {resp}")

    # 2. Delete Sources
    deleted_sources = 0
    for old_sid, new_src_id in sources_to_delete:
        del_url = f"{api_url}/bulk/sources/{new_src_id}?user={urllib.parse.quote(user_email)}"
        status_code, resp = send_delete_request(del_url, headers, ctx)
        if status_code in (200, 204):
            deleted_sources += 1
            print(f"  ✓ Deleted source: {new_src_id} (old: {old_sid})")
            if old_sid in sources_map:
                del sources_map[old_sid]
        elif status_code == 404:
            print(f"  - Source not found (already deleted): {new_src_id}")
            if old_sid in sources_map:
                del sources_map[old_sid]
        else:
            print(f"  ✗ Failed to delete source {new_src_id} ({status_code}): {resp}")

    # Save updated mapping file
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)

    print("=" * 65)
    print(f"Deletion Complete! Deleted {deleted_bundles} bundles and {deleted_sources} sources.")
    print(f"Mapping file updated: {mapping_file}")
    print("=" * 65)

if __name__ == "__main__":
    import urllib.parse
    main()

