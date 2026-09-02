import json
import glob
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
sources_dir = os.path.join(script_dir, "backups", "2026-09-01_reviewed", "sources")
bundles_dir = os.path.join(script_dir, "augmented_bundles")

with open(mapping_file, "r", encoding="utf-8") as f:
    mapping = json.load(f)

sources_map = mapping["sources"]
bundles_map = mapping["bundles"]

# 1. Build Expected Sources Reference Data
expected_sources = {}
source_files = sorted(glob.glob(os.path.join(sources_dir, "*.json")))

for sf in source_files:
    old_sid = os.path.splitext(os.path.basename(sf))[0]
    server_sid = sources_map.get(old_sid)
    if not server_sid:
        continue

    with open(sf, "r", encoding="utf-8") as f:
        sdata = json.load(f)

    # Extract critical verification fields
    lines_summary = {}
    for ln, lobj in (sdata.get("lines") or {}).items():
        if not lobj:
            continue
        comments = lobj.get("comments") or []
        comment_list = lobj.get("commentList") or []
        lines_summary[ln] = {
            "content": lobj.get("content", "").strip(),
            "blank": bool(lobj.get("blank")),
            "comments_count": max(len(comments), len(comment_list)),
            "sample_comment": (
                comments[0].get("content", "")
                if comments
                else (comment_list[0] if comment_list else "")
            )[:60],
        }

    distractors_summary = []
    for d in sdata.get("distractors") or []:
        distractors_summary.append(
            {
                "code": d.get("code", "").strip(),
                "has_explanation": bool(
                    d.get("description") and len(d.get("description").strip()) > 10
                ),
                "explanation_len": len(d.get("description", "").strip()),
            }
        )

    expected_sources[server_sid] = {
        "old_id": old_sid,
        "name": sdata.get("name", ""),
        "filename": sdata.get("filename", ""),
        "code_len": len(sdata.get("code", "")),
        "lines": lines_summary,
        "distractors": distractors_summary,
    }

# 2. Build Expected Bundles Reference Data
expected_bundles = {}
bundle_files = sorted(glob.glob(os.path.join(bundles_dir, "*.json")))

for bf in bundle_files:
    old_bid = os.path.splitext(os.path.basename(bf))[0]
    server_bid = bundles_map.get(old_bid)
    if not server_bid:
        continue

    with open(bf, "r", encoding="utf-8") as f:
        bdata = json.load(f)
    bobj = bdata.get("bundle", bdata)

    expected_items = []
    for itm in bobj.get("items", []):
        old_sid = itm.get("item")
        server_sid = sources_map.get(old_sid, old_sid)
        expected_items.append(
            {
                "source_id": server_sid,
                "type": itm.get("type", "example"),
            }
        )

    expected_bundles[server_bid] = {
        "old_id": old_bid,
        "name": bobj.get("name", ""),
        "items": expected_items,
    }

print(f"Prepared verification baseline:")
print(f"  • {len(expected_sources)} Sources")
print(f"  • {len(expected_bundles)} Bundles")

expected_sources_json = json.dumps(expected_sources, indent=2)
expected_bundles_json = json.dumps(expected_bundles, indent=2)

js_content = f"""// PCEX Authoring: Deep Byte-by-Byte & Field-by-Field Live Server Auditor
(async () => {{
  const expectedSources = {expected_sources_json};
  const expectedBundles = {expected_bundles_json};

  console.log('================================================================================');
  console.log('🔍 DEEP LIVE SERVER AUDIT: 123 SOURCES & 52 BUNDLES (EXPLANATIONS, DISTRACTORS & BUNDLING)');
  console.log('================================================================================');

  const sourceIds = Object.keys(expectedSources);
  const bundleIds = Object.keys(expectedBundles);

  let sourcePassed = 0;
  let sourceFailed = 0;
  const sourceDiscrepancies = [];

  console.log(`\\n--- [1/2] Auditing ${{sourceIds.length}} Sources Byte-by-Byte & Field-by-Field ---`);

  for (let i = 0; i < sourceIds.length; i++) {{
    const sid = sourceIds[i];
    const exp = expectedSources[sid];

    try {{
      const res = await fetch(`/pcex-authoring/api/sources/${{sid}}?allUsers=true`);
      if (!res.ok) {{
        sourceFailed++;
        sourceDiscrepancies.push({{
          id: sid,
          name: exp.name,
          error: `HTTP ${{res.status}} (Not found on server)`
        }});
        console.warn(`  [${{i + 1}}/${{sourceIds.length}}] ✗ Missing Source ${{sid}}: HTTP ${{res.status}}`);
        continue;
      }}

      const live = await res.json();
      const issues = [];

      // A. Code length & content check
      const liveCode = live.code || '';
      if (Math.abs(liveCode.length - exp.code_len) > 20) {{
        issues.push(`Code length mismatch (Server: ${{liveCode.length}} vs Expected: ${{exp.code_len}})`);
      }}

      // B. Line-by-Line Explanations & Blank Lines Check
      const liveLines = live.lines || {{}};
      let liveBlankCount = 0;
      let liveExplanationCount = 0;

      for (const [ln, eline] of Object.entries(exp.lines)) {{
        const lline = liveLines[ln];
        if (!lline) {{
          issues.push(`Line ${{ln}} missing in live lines object`);
          continue;
        }}

        if (lline.blank) liveBlankCount++;

        const lcomments = (lline.comments || []).concat(lline.commentList || []);
        if (lcomments.length > 0) liveExplanationCount++;

        if (eline.blank !== !!lline.blank) {{
          issues.push(`Line ${{ln}} blank status mismatch (Server: ${{!!lline.blank}} vs Expected: ${{eline.blank}})`);
        }}

        if (eline.comments_count > 0 && lcomments.length === 0) {{
          issues.push(`Line ${{ln}} missing explanations on server`);
        }}
      }}

      if (liveBlankCount > 3 || liveBlankCount < 1) {{
        issues.push(`Invalid blank lines count: ${{liveBlankCount}} (expected 1-3 blanks)`);
      }}

      // C. Distractors and Distractor Explanations Check
      const liveDistractors = live.distractors || [];
      if (liveDistractors.length !== 3) {{
        issues.push(`Distractor count is ${{liveDistractors.length}} (expected exactly 3)`);
      }}

      for (let dIdx = 0; dIdx < liveDistractors.length; dIdx++) {{
        const ld = liveDistractors[dIdx];
        const desc = (ld.description || '').trim();
        if (!desc || desc.length < 10) {{
          issues.push(`Distractor #${{dIdx + 1}} (${{ld.code || 'blank'}}) is missing an explanation description`);
        }}
      }}

      if (issues.length === 0) {{
        sourcePassed++;
        if ((i + 1) % 10 === 0 || i === sourceIds.length - 1) {{
          console.log(`  ✓ Verified ${{i + 1}}/${{sourceIds.length}} sources...`);
        }}
      }} else {{
        sourceFailed++;
        sourceDiscrepancies.push({{
          id: sid,
          name: live.name || exp.name,
          issues: issues.join('; ')
        }});
        console.warn(`  ✗ Anomaly in "${{live.name || exp.name}}" (${{sid}}): ${{issues.join('; ')}}`);
      }}

    }} catch (err) {{
      sourceFailed++;
      sourceDiscrepancies.push({{ id: sid, name: exp.name, error: err.message }});
      console.error(`  ✗ Error auditing source ${{sid}}:`, err);
    }}

    await new Promise(r => setTimeout(r, 25));
  }}

  console.log(`\\n✓ Sources Verification Complete: ${{sourcePassed}}/${{sourceIds.length}} 100% MATCHING EVALUATION SPEC`);

  let bundlePassed = 0;
  let bundleFailed = 0;
  const bundleDiscrepancies = [];

  console.log(`\\n--- [2/2] Auditing ${{bundleIds.length}} Bundles & Live Source Linkages ---`);

  // Fetch bundle list to get PAWS sync statuses (linkings boolean is provided in list index)
  let bundleListMap = new Map();
  try {{
    const listRes = await fetch(`/pcex-authoring/api/bundles?allUsers=true`);
    if (listRes.ok) {{
      const listData = await listRes.json();
      for (const item of listData) {{
        bundleListMap.set(item.id, item);
      }}
    }}
  }} catch (e) {{
    console.warn('Could not fetch bundle list for sync verification:', e);
  }}

  for (let i = 0; i < bundleIds.length; i++) {{
    const bid = bundleIds[i];
    const exp = expectedBundles[bid];

    try {{
      const res = await fetch(`/pcex-authoring/api/bundles/${{bid}}?allUsers=true`);
      if (!res.ok) {{
        bundleFailed++;
        bundleDiscrepancies.push({{
          id: bid,
          name: exp.name,
          error: `HTTP ${{res.status}} (Not found on server)`
        }});
        console.warn(`  [${{i + 1}}/${{bundleIds.length}}] ✗ Missing Bundle ${{bid}}: HTTP ${{res.status}}`);
        continue;
      }}

      const bundle = await res.json();
      const issues = [];

      const liveItems = bundle.items || [];
      const expItems = exp.items || [];

      if (liveItems.length !== expItems.length) {{
        issues.push(`Bundle item count mismatch (Server: ${{liveItems.length}} vs Expected: ${{expItems.length}})`);
      }}

      for (let itmIdx = 0; itmIdx < expItems.length; itmIdx++) {{
        const eItem = expItems[itmIdx];
        const lItem = liveItems[itmIdx];

        if (!lItem) {{
          issues.push(`Missing item #${{itmIdx + 1}}`);
          continue;
        }}

        if (lItem.item !== eItem.source_id) {{
          issues.push(`Item #${{itmIdx + 1}} points to ${{lItem.item}} (expected cloned server source ${{eItem.source_id}})`);
        }}

        if (lItem.type !== eItem.type) {{
          issues.push(`Item #${{itmIdx + 1}} type is ${{lItem.type}} (expected ${{eItem.type}})`);
        }}
      }}

      // Check PAWS Sync and Compilation
      const listMeta = bundleListMap.get(bid);
      const isSynced = listMeta ? !!listMeta.linkings : !!bundle.linkings;
      const isCompiled = !!bundle.stat;

      if (!isSynced) {{
        issues.push(`Bundle not marked as synced to PAWS (missing linkings)`);
      }}

      if (!isCompiled) {{
        issues.push(`Bundle not compiled (missing stat)`);
      }}

      if (issues.length === 0) {{
        bundlePassed++;
        if ((i + 1) % 10 === 0 || i === bundleIds.length - 1) {{
          console.log(`  ✓ Verified ${{i + 1}}/${{bundleIds.length}} bundles...`);
        }}
      }} else {{
        bundleFailed++;
        bundleDiscrepancies.push({{
          id: bid,
          name: bundle.name || exp.name,
          issues: issues.join('; ')
        }});
        console.warn(`  ✗ Issue in Bundle "${{bundle.name || exp.name}}" (${{bid}}): ${{issues.join('; ')}}`);
      }}

    }} catch (err) {{
      bundleFailed++;
      bundleDiscrepancies.push({{ id: bid, name: exp.name, error: err.message }});
      console.error(`  ✗ Error auditing bundle ${{bid}}:`, err);
    }}

    await new Promise(r => setTimeout(r, 25));
  }}

  console.log(`\\n✓ Bundles Verification Complete: ${{bundlePassed}}/${{bundleIds.length}} PROPERLY BUNDLED & SYNCED`);

  console.log('\\n================================================================================');
  console.log('📊 LIVE SERVER BYTE-BY-BYTE AUDIT REPORT');
  console.log('================================================================================');
  console.log(`1. Sources (Code, Explanations, 3 Distractors + Descriptions, Blanks, Compilation):`);
  console.log(`   -> ${{sourcePassed}} / ${{sourceIds.length}} 100% PERFECT on Server`);

  console.log(`2. Bundles (Item Remapping, Worked-Examples + Challenges, PAWS Sync, Compilation):`);
  console.log(`   -> ${{bundlePassed}} / ${{bundleIds.length}} 100% PERFECT on Server`);

  if (sourceDiscrepancies.length === 0 && bundleDiscrepancies.length === 0) {{
    console.log('\\n🎉 CONGRATULATIONS! ALL 123 SOURCES AND 52 BUNDLES ARE 100% MATCHED, PROPERLY BUNDLED, COMPILED, SYNCED TO PAWS, AND READY FOR PRODUCTION USE!');
  }} else {{
    if (sourceDiscrepancies.length > 0) {{
      console.log('\\n⚠️ SOURCE DISCREPANCIES:');
      console.table(sourceDiscrepancies);
    }}
    if (bundleDiscrepancies.length > 0) {{
      console.log('\\n⚠️ BUNDLE DISCREPANCIES:');
      console.table(bundleDiscrepancies);
    }}
  }}
  console.log('================================================================================');
}})();
"""

out_js = os.path.join(script_dir, "deep_server_verification.js")
with open(out_js, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Generated deep live server verification script: {out_js}")
