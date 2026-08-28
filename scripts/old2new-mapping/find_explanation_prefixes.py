#!/usr/bin/env python3
"""
Find and list explanation and distractor explanation prefixes in augmented sources.

Rule:
Find the first ':' which is located before 25% of the total length of the explanation text.
"""

import os
import glob
import json
import argparse
from collections import Counter, defaultdict
from datetime import datetime

def analyze_explanations(sources_dir, threshold=0.25):
    source_files = sorted(glob.glob(os.path.join(sources_dir, "*.json")))
    
    total_files = len(source_files)
    total_line_explanations = 0
    total_distractor_explanations = 0
    
    # Prefix tracking
    # prefix -> count
    prefix_counts = Counter()
    prefix_line_counts = Counter()
    prefix_dist_counts = Counter()
    
    # prefix -> list of (file_basename, context_label, snippet)
    prefix_examples = defaultdict(list)
    
    # Track non-prefix explanations count
    no_prefix_count = 0
    has_prefix_count = 0
    
    # Multi-colon tracking (e.g. "Tú: Buenas prácticas: ...")
    multi_colon_items = []
    
    for filepath in source_files:
        filename = os.path.basename(filepath)
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                continue

        source_name = data.get("name", filename)
        
        # 1. Check Line Explanations
        lines = data.get("lines", {})
        for ln, l_data in lines.items():
            if not isinstance(l_data, dict):
                continue
            comments = l_data.get("commentList", [])
            for c in comments:
                if not isinstance(c, str) or not c.strip():
                    continue
                total_line_explanations += 1
                text = c.strip()
                colon_idx = text.find(":")
                
                if colon_idx != -1 and colon_idx < len(text) * threshold:
                    has_prefix_count += 1
                    prefix = text[:colon_idx + 1].strip()
                    prefix_counts[prefix] += 1
                    prefix_line_counts[prefix] += 1
                    
                    if len(prefix_examples[prefix]) < 5:
                        prefix_examples[prefix].append({
                            "file": filename,
                            "source_name": source_name,
                            "type": "Line",
                            "loc": f"Line {ln}",
                            "pos": colon_idx,
                            "len": len(text),
                            "ratio": f"{colon_idx / len(text) * 100:.1f}%",
                            "snippet": text
                        })
                    
                    # Check if there is a second colon shortly after (nested prefix)
                    rest = text[colon_idx + 1:].strip()
                    second_colon = rest.find(":")
                    if second_colon != -1 and second_colon < len(rest) * threshold:
                        second_prefix = rest[:second_colon + 1].strip()
                        multi_colon_items.append((prefix, second_prefix, filename, f"Line {ln}", text[:120]))
                else:
                    no_prefix_count += 1

        # 2. Check Distractor Explanations
        distractors = data.get("distractors", [])
        for d_idx, d in enumerate(distractors):
            if not isinstance(d, dict):
                continue
            
            # Deduplicate commentList and helpList within the same distractor
            seen_texts = set()
            d_comments = d.get("line", {}).get("commentList", []) if isinstance(d.get("line"), dict) else []
            for c in d_comments:
                if isinstance(c, str) and c.strip():
                    seen_texts.add(c.strip())
            for h in d.get("helpList", []):
                if isinstance(h, str) and h.strip():
                    seen_texts.add(h.strip())
            
            d_code = d.get("line", {}).get("content", "") if isinstance(d.get("line"), dict) else ""
            
            for text in seen_texts:
                total_distractor_explanations += 1
                colon_idx = text.find(":")
                
                if colon_idx != -1 and colon_idx < len(text) * threshold:
                    has_prefix_count += 1
                    prefix = text[:colon_idx + 1].strip()
                    prefix_counts[prefix] += 1
                    prefix_dist_counts[prefix] += 1
                    
                    if len(prefix_examples[prefix]) < 5:
                        prefix_examples[prefix].append({
                            "file": filename,
                            "source_name": source_name,
                            "type": "Distractor",
                            "loc": f"Distractor #{d_idx + 1} ({d_code[:30]})" if d_code else f"Distractor #{d_idx + 1}",
                            "pos": colon_idx,
                            "len": len(text),
                            "ratio": f"{colon_idx / len(text) * 100:.1f}%",
                            "snippet": text
                        })
                        
                    # Check nested colon
                    rest = text[colon_idx + 1:].strip()
                    second_colon = rest.find(":")
                    if second_colon != -1 and second_colon < len(rest) * threshold:
                        second_prefix = rest[:second_colon + 1].strip()
                        multi_colon_items.append((prefix, second_prefix, filename, f"Distractor #{d_idx + 1}", text[:120]))
                else:
                    no_prefix_count += 1

    return {
        "total_files": total_files,
        "total_line_explanations": total_line_explanations,
        "total_distractor_explanations": total_distractor_explanations,
        "total_explanations": total_line_explanations + total_distractor_explanations,
        "has_prefix_count": has_prefix_count,
        "no_prefix_count": no_prefix_count,
        "prefix_counts": prefix_counts,
        "prefix_line_counts": prefix_line_counts,
        "prefix_dist_counts": prefix_dist_counts,
        "prefix_examples": prefix_examples,
        "multi_colon_items": multi_colon_items,
        "threshold": threshold
    }

def generate_report(results, output_path):
    total_exp = results["total_explanations"]
    has_p = results["has_prefix_count"]
    prefix_counts = results["prefix_counts"]
    prefix_line_counts = results["prefix_line_counts"]
    prefix_dist_counts = results["prefix_dist_counts"]
    prefix_examples = results["prefix_examples"]
    threshold_pct = int(results["threshold"] * 100)

    # Classify prefixes into short labels (<= 4 words) vs longer introductory clauses (> 4 words)
    short_prefixes = {p: c for p, c in prefix_counts.items() if len(p.split()) <= 4}
    long_prefixes = {p: c for p, c in prefix_counts.items() if len(p.split()) > 4}

    lines = []
    lines.append("=" * 80)
    lines.append("EXPLANATION PREFIX ANALYSIS REPORT")
    lines.append("=" * 80)
    lines.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Detection Rule: First ':' before {threshold_pct}% of the text length")
    lines.append(f"Total Source Files Scanned: {results['total_files']}")
    lines.append(f"Total Explanations Scanned: {total_exp:,}")
    lines.append(f"  - Line Explanations:      {results['total_line_explanations']:,}")
    lines.append(f"  - Distractor Explanations:{results['total_distractor_explanations']:,}")
    lines.append(f"Explanations with Prefix:   {has_p:,} ({has_p / total_exp * 100:.1f}%)")
    lines.append(f"Explanations without Prefix:{results['no_prefix_count']:,} ({results['no_prefix_count'] / total_exp * 100:.1f}%)")
    lines.append(f"Total Unique Prefixes Found:{len(prefix_counts):,}")
    lines.append(f"  - Short Labels (<= 4 words): {len(short_prefixes):,} unique ({sum(short_prefixes.values()):,} occurrences)")
    lines.append(f"  - Long Clauses (> 4 words):  {len(long_prefixes):,} unique ({sum(long_prefixes.values()):,} occurrences)")
    lines.append("=" * 80)
    lines.append("")

    # Section 1: Top 50 Most Frequent Prefixes
    lines.append("-" * 80)
    lines.append("SECTION 1: TOP MOST FREQUENT PREFIXES (Count >= 5)")
    lines.append("-" * 80)
    lines.append(f"{'Count':<8} | {'Line':<6} | {'Dist':<6} | {'% Total':<8} | {'Prefix'}")
    lines.append("-" * 80)
    
    top_prefixes = [item for item in prefix_counts.most_common() if item[1] >= 5]
    for p, count in top_prefixes:
        l_cnt = prefix_line_counts.get(p, 0)
        d_cnt = prefix_dist_counts.get(p, 0)
        pct = count / has_p * 100
        lines.append(f"{count:<8d} | {l_cnt:<6d} | {d_cnt:<6d} | {pct:<7.2f}% | {p}")
    lines.append("")

    # Section 2: Clean List of Common Category Labels (Grouped by Language)
    lines.append("-" * 80)
    lines.append("SECTION 2: COMMON CANONICAL CATEGORY LABELS")
    lines.append("-" * 80)
    lines.append("These are standard recurring tags/labels (count >= 10):")
    lines.append("")
    lines.append("[Spanish Common Labels]")
    spanish_top = [
        p for p, c in prefix_counts.most_common()
        if c >= 10 and any(w in p.lower() for w in ["propósito", "sintaxis", "semántica", "errores", "prácticas", "práctica", "paso", "desglose", "tú", "consejo", "por qué", "malentendido", "interpretaciones"])
    ]
    for p in spanish_top:
        lines.append(f"  - {prefix_counts[p]:4d}x  {p}")

    lines.append("")
    lines.append("[English Common Labels]")
    english_top = [
        p for p, c in prefix_counts.most_common()
        if c >= 10 and any(w in p.lower() for w in ["purpose", "syntax", "semantics", "error", "errors", "practice", "practices", "misconception", "step", "breakdown", "potential", "how it works", "careful"])
    ]
    for p in english_top:
        lines.append(f"  - {prefix_counts[p]:4d}x  {p}")
    lines.append("")

    # Section 3: Nested / Dialogue Prefixes (e.g. "Tú: ...")
    if results["multi_colon_items"]:
        lines.append("-" * 80)
        lines.append(f"SECTION 3: NESTED PREFIXES / MULTI-COLON SAMPLES ({len(results['multi_colon_items'])} occurrences)")
        lines.append("-" * 80)
        lines.append("Cases where a second colon was found shortly after the first (e.g., 'Tú: Buenas prácticas:'):")
        lines.append("")
        for p1, p2, fname, loc, snip in results["multi_colon_items"][:25]:
            lines.append(f"  [{p1}] + [{p2}] in {fname} ({loc})")
            lines.append(f"    Snippet: {snip}")
        if len(results["multi_colon_items"]) > 25:
            lines.append(f"    ... and {len(results['multi_colon_items']) - 25} more.")
        lines.append("")

    # Section 4: All Unique Prefixes (Alphabetical) with Details and Examples
    lines.append("-" * 80)
    lines.append("SECTION 4: COMPLETE ALPHABETICAL LIST OF ALL UNIQUE PREFIXES")
    lines.append("-" * 80)
    lines.append(f"Total Unique Prefixes: {len(prefix_counts)}")
    lines.append("")

    for prefix in sorted(prefix_counts.keys(), key=lambda s: s.lower()):
        count = prefix_counts[prefix]
        l_cnt = prefix_line_counts.get(prefix, 0)
        d_cnt = prefix_dist_counts.get(prefix, 0)
        exs = prefix_examples.get(prefix, [])
        
        lines.append(f"PREFIX: {repr(prefix)}")
        lines.append(f"  Total Occurrences: {count} (Lines: {l_cnt}, Distractors: {d_cnt})")
        
        if exs:
            lines.append("  Examples:")
            for e in exs[:3]:
                snip = e["snippet"]
                if len(snip) > 160:
                    snip = snip[:160] + "..."
                lines.append(f"    - [{e['type']}] {e['file']} ({e['loc']}) [Colon at char {e['pos']}/{e['len']} ({e['ratio']})]:")
                lines.append(f"      \"{snip}\"")
        lines.append("")

    # Write to file
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_sources_dir = os.path.join(script_dir, "augmented_sources")
    default_output_txt = os.path.join(script_dir, "explanation_prefixes.txt")

    parser = argparse.ArgumentParser(description="Find all prefixes in augmented source explanations.")
    parser.add_argument("--sources-dir", default=default_sources_dir, help="Path to augmented sources folder")
    parser.add_argument("--output", default=default_output_txt, help="Output TXT report file path")
    parser.add_argument("--threshold", type=float, default=0.25, help="Colon position threshold ratio (default: 0.25)")
    args = parser.parse_args()

    print(f"Scanning augmented sources in: {args.sources_dir}")
    print(f"Prefix detection rule: first ':' before {args.threshold * 100:.0f}% of text length")
    
    results = analyze_explanations(args.sources_dir, threshold=args.threshold)
    out_file = generate_report(results, args.output)

    print("\n" + "=" * 60)
    print("ANALYSIS SUMMARY")
    print("=" * 60)
    print(f"Source files scanned:        {results['total_files']}")
    print(f"Total explanations:          {results['total_explanations']:,}")
    print(f"  - Line explanations:       {results['total_line_explanations']:,}")
    print(f"  - Distractor explanations: {results['total_distractor_explanations']:,}")
    print(f"Explanations with prefix:    {results['has_prefix_count']:,} ({results['has_prefix_count'] / results['total_explanations'] * 100:.1f}%)")
    print(f"Unique prefixes found:       {len(results['prefix_counts']):,}")
    print(f"\nReport written to: {out_file}")
    print("=" * 60 + "\n")

    print("Top 20 most frequent prefixes:")
    for p, c in results["prefix_counts"].most_common(20):
        print(f"  {c:4d}x | {p}")

if __name__ == "__main__":
    main()
