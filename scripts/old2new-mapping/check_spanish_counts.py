import os
import glob
import json
import re
from collections import Counter, defaultdict

script_dir = os.path.dirname(os.path.abspath(__file__))
aug_sources_dir = os.path.join(script_dir, "augmented_sources")
aug_bundles_dir = os.path.join(script_dir, "augmented_bundles")

SPANISH_MARKERS = set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "en", "que", "es", "por", "para", "con",
    "su", "sus", "al", "del", "se", "lo", "le", "les", "este", "esta", "estos", "estas", "como", "más", "mas",
    "pero", "o", "u", "e", "y", "no", "si", "sí", "cuando", "donde", "cual", "cuál", "línea", "linea",
    "código", "codigo", "función", "funcion", "valor", "valores", "variable", "variables", "imprime",
    "muestra", "devuelve", "propósito", "proposito", "sintaxis", "semántica", "semantica", "buenas",
    "prácticas", "practicas", "errores", "comunes", "malentendidos", "paso", "tú", "tu", "puedes",
    "debes", "tener", "hacer", "usar", "programa", "ejecuta", "condición", "condicion", "bucle",
    "cadena", "número", "numero", "entero", "lista", "elemento", "elementos", "usuario", "entrada",
    "porque", "elegir", "esto", "comprobación", "comprobacion", "sentencia", "bloque", "salida",
    "primero", "segundo", "tercero", "después", "despues", "anterior", "siguiente"
])

ENGLISH_MARKERS = set([
    "the", "a", "an", "is", "are", "was", "were", "to", "in", "of", "and", "that", "this", "these", "those",
    "it", "its", "for", "with", "as", "by", "on", "at", "from", "be", "or", "not", "if", "when", "where",
    "which", "line", "code", "function", "value", "values", "variable", "variables", "prints", "shows",
    "returns", "purpose", "syntax", "semantics", "best", "practices", "common", "errors", "misconceptions",
    "step", "you", "can", "should", "have", "do", "use", "program", "runs", "condition", "loop", "string",
    "number", "integer", "list", "element", "elements", "user", "input", "because", "choose", "statement",
    "block", "output", "check", "might", "pick", "first", "second", "third", "after", "previous", "next"
])

def classify_text(text):
    if not text or not text.strip():
        return "empty", 0, 0
    words = re.findall(r"\b[a-záéíóúñü]+\b", text.lower())
    es_score = sum(1 for w in words if w in SPANISH_MARKERS)
    en_score = sum(1 for w in words if w in ENGLISH_MARKERS)
    
    if es_score > en_score and es_score >= 1:
        return "es", es_score, en_score
    elif en_score > es_score and en_score >= 1:
        return "en", es_score, en_score
    elif es_score > 0 and en_score == 0:
        return "es", es_score, en_score
    elif en_score > 0 and es_score == 0:
        return "en", es_score, en_score
    else:
        return "unknown", es_score, en_score

def analyze():
    source_files = sorted(glob.glob(os.path.join(aug_sources_dir, "*.json")))
    bundle_files = sorted(glob.glob(os.path.join(aug_bundles_dir, "*.json")))

    sources_data = {}
    for s_path in source_files:
        with open(s_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        sid = data.get("id") or data.get("_id")
        filename = os.path.basename(s_path)
        
        # Analyze line explanations
        line_exps = []
        for ln, l_data in data.get("lines", {}).items():
            if isinstance(l_data, dict):
                for c in l_data.get("commentList", []):
                    if isinstance(c, str) and c.strip():
                        line_exps.append((ln, c.strip()))

        # Analyze distractor explanations
        dist_exps = []
        for d_idx, d in enumerate(data.get("distractors", [])):
            if isinstance(d, dict):
                seen = set()
                for c in d.get("line", {}).get("commentList", []):
                    if isinstance(c, str) and c.strip(): seen.add(c.strip())
                for h in d.get("helpList", []):
                    if isinstance(h, str) and h.strip(): seen.add(h.strip())
                for t in seen:
                    dist_exps.append((d_idx, t))

        # Classify each
        line_lang_counts = Counter()
        dist_lang_counts = Counter()
        
        line_details = []
        for ln, text in line_exps:
            lang, es_s, en_s = classify_text(text)
            line_lang_counts[lang] += 1
            line_details.append((ln, lang, text))
                
        dist_details = []
        for d_idx, text in dist_exps:
            lang, es_s, en_s = classify_text(text)
            dist_lang_counts[lang] += 1
            dist_details.append((d_idx, lang, text))

        has_es_lines = line_lang_counts.get("es", 0) > 0
        has_en_lines = line_lang_counts.get("en", 0) > 0
        has_es_dist = dist_lang_counts.get("es", 0) > 0
        has_en_dist = dist_lang_counts.get("en", 0) > 0
        
        has_any_es = has_es_lines or has_es_dist
        has_any_en = has_en_lines or has_en_dist
        
        sources_data[sid] = {
            "id": sid,
            "filename": filename,
            "name": data.get("name", ""),
            "description": data.get("description", ""),
            "total_line_exps": len(line_exps),
            "total_dist_exps": len(dist_exps),
            "line_lang_counts": line_lang_counts,
            "dist_lang_counts": dist_lang_counts,
            "line_details": line_details,
            "dist_details": dist_details,
            "has_es_lines": has_es_lines,
            "has_en_lines": has_en_lines,
            "has_es_dist": has_es_dist,
            "has_en_dist": has_en_dist,
            "has_any_es": has_any_es,
            "has_any_en": has_any_en
        }

    # Now analyze bundles
    bundles_data = {}
    for b_path in bundle_files:
        with open(b_path, "r", encoding="utf-8") as f:
            b_wrap = json.load(f)
        b_data = b_wrap.get("bundle", b_wrap)
        bid = b_data.get("id")
        b_name = b_data.get("name", "")
        b_filename = os.path.basename(b_path)
        items = b_data.get("items", [])
        
        item_source_ids = [item.get("item") for item in items if item.get("item")]
        
        bundle_has_es = False
        bundle_has_en = False
        es_sources_in_bundle = []
        en_sources_in_bundle = []
        
        for sid in item_source_ids:
            if sid in sources_data:
                s_info = sources_data[sid]
                if s_info["has_any_es"]:
                    bundle_has_es = True
                    es_sources_in_bundle.append(sid)
                if s_info["has_any_en"]:
                    bundle_has_en = True
                    en_sources_in_bundle.append(sid)
                    
        bundles_data[bid] = {
            "id": bid,
            "filename": b_filename,
            "name": b_name,
            "item_source_ids": item_source_ids,
            "has_es": bundle_has_es,
            "has_en": bundle_has_en,
            "es_sources": es_sources_in_bundle,
            "en_sources": en_sources_in_bundle
        }

    return sources_data, bundles_data

def print_audit():
    sources_data, bundles_data = analyze()
    
    total_sources = len(sources_data)
    pure_es_sources = [s for s in sources_data.values() if s["has_any_es"] and not s["has_any_en"]]
    pure_en_sources = [s for s in sources_data.values() if s["has_any_en"] and not s["has_any_es"]]
    mixed_sources = [s for s in sources_data.values() if s["has_any_es"] and s["has_any_en"]]
    all_es_sources = [s for s in sources_data.values() if s["has_any_es"]]
    all_en_sources = [s for s in sources_data.values() if s["has_any_en"]]

    total_bundles = len(bundles_data)
    pure_es_bundles = [b for b in bundles_data.values() if b["has_es"] and not b["has_en"]]
    pure_en_bundles = [b for b in bundles_data.values() if b["has_en"] and not b["has_es"]]
    mixed_bundles = [b for b in bundles_data.values() if b["has_es"] and b["has_en"]]
    all_es_bundles = [b for b in bundles_data.values() if b["has_es"]]
    all_en_bundles = [b for b in bundles_data.values() if b["has_en"]]

    print("=" * 80)
    print("EXACT BREAKDOWN OF SPANISH & ENGLISH IN AUGMENTED SOURCES & BUNDLES")
    print("=" * 80)
    print(f"\n1. SOURCES (Total: {total_sources})")
    print(f"   • Sources containing Spanish explanations: {len(all_es_sources)} / {total_sources} ({len(all_es_sources)/total_sources*100:.1f}%)")
    print(f"     - 100% Spanish explanations:            {len(pure_es_sources)}")
    print(f"     - Mixed (has both Spanish & English):   {len(mixed_sources)}")
    print(f"   • Sources containing English explanations: {len(all_en_sources)} / {total_sources} ({len(all_en_sources)/total_sources*100:.1f}%)")
    print(f"     - 100% English explanations:            {len(pure_en_sources)}")
    print(f"     - Mixed (has both Spanish & English):   {len(mixed_sources)}")

    print(f"\n2. BUNDLES (Total: {total_bundles})")
    print(f"   • Bundles containing Spanish items:        {len(all_es_bundles)} / {total_bundles} ({len(all_es_bundles)/total_bundles*100:.1f}%)")
    print(f"     - 100% Spanish item sources:            {len(pure_es_bundles)}")
    print(f"     - Mixed bundle (has ES & EN sources):   {len(mixed_bundles)}")
    print(f"   • Bundles containing English items:        {len(all_en_bundles)} / {total_bundles} ({len(all_en_bundles)/total_bundles*100:.1f}%)")
    print(f"     - 100% English item sources:            {len(pure_en_bundles)}")
    print(f"     - Mixed bundle (has ES & EN sources):   {len(mixed_bundles)}")

    print("\n" + "=" * 80)
    print("DETAILS OF THE 3 MIXED SOURCES:")
    print("=" * 80)
    for s in mixed_sources:
        print(f"\nSource ID: {s['id']}")
        print(f"Filename:  {s['filename']}")
        print(f"Name:      {s['name']}")
        print(f"Line Explanations Count:      {s['total_line_exps']} (ES={s['line_lang_counts'].get('es', 0)}, EN={s['line_lang_counts'].get('en', 0)})")
        print(f"Distractor Explanations Count: {s['total_dist_exps']} (ES={s['dist_lang_counts'].get('es', 0)}, EN={s['dist_lang_counts'].get('en', 0)})")
        print("Breakdown of items:")
        for ln, lang, txt in s["line_details"]:
            print(f"  [Line {ln}] [{lang.upper()}] {txt[:90]}...")
        for d_idx, lang, txt in s["dist_details"]:
            print(f"  [Distractor #{d_idx+1}] [{lang.upper()}] {txt[:90]}...")

    print("\n" + "=" * 80)
    print("DETAILS OF THE 3 MIXED BUNDLES:")
    print("=" * 80)
    for b in mixed_bundles:
        print(f"\nBundle ID:   {b['id']}")
        print(f"Filename:    {b['filename']}")
        print(f"Bundle Name: {b['name']}")
        print(f"Total Sources in bundle: {len(b['item_source_ids'])}")
        print(f"  • Spanish Sources ({len(b['es_sources'])}): {b['es_sources']}")
        print(f"  • English Sources ({len(b['en_sources'])}): {b['en_sources']}")

if __name__ == "__main__":
    print_audit()
