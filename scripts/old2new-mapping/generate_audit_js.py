import json
import glob
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
mapping_file = os.path.join(script_dir, "bulk_import_mapping.json")
bundles_dir = os.path.join(script_dir, "augmented_bundles")
sources_dir = os.path.join(script_dir, "backups", "2026-09-01_reviewed", "sources")

with open(mapping_file, "r", encoding="utf-8") as f:
    mapping = json.load(f)

sources_map = mapping["sources"]
bundles_map = mapping["bundles"]

bundle_files = sorted(glob.glob(os.path.join(bundles_dir, "*.json")))

expected_bundle_items = {}
for bf in bundle_files:
    old_bid = os.path.splitext(os.path.basename(bf))[0]
    server_bid = bundles_map.get(old_bid)
    if not server_bid:
        continue

    with open(bf, "r", encoding="utf-8") as f:
        bdata = json.load(f)
    bobj = bdata.get("bundle", bdata)

    expected_sids = []
    for itm in bobj.get("items", []):
        old_sid = itm.get("item")
        new_sid = sources_map.get(old_sid, old_sid)
        expected_sids.append(new_sid)
    expected_bundle_items[server_bid] = {
        "old_id": old_bid,
        "name": bobj.get("name"),
        "expected_sources": expected_sids,
    }

server_sources_list = json.dumps(list(sources_map.values()), indent=2)
expected_bundles_json = json.dumps(expected_bundle_items, indent=2)

audit_code = f"""// PCEX Authoring: Live Server Audit Script
(async () => {{
  const targetServerSources = {server_sources_list};
  const expectedBundles = {expected_bundles_json};

  console.log('================================================================');
  console.log('🔍 STARTING LIVE SERVER AUDIT FOR PCEX SOURCES & BUNDLES');
  console.log('================================================================');

  let sourcePass = 0, sourceFail = 0;
  const sourceIssues = [];

  console.log(`\\n--- [1/2] Auditing ${{targetServerSources.length}} Sources on Server ---`);
  for (let i = 0; i < targetServerSources.length; i++) {{
    const sid = targetServerSources[i];
    try {{
      const res = await fetch(`/pcex-authoring/api/sources/${{sid}}?allUsers=true`);
      if (!res.ok) {{
        sourceFail++;
        sourceIssues.push({{ id: sid, issue: `HTTP ${{res.status}} not found` }});
        console.warn(`  [${{i + 1}}/${{targetServerSources.length}}] ✗ Missing Source: ${{sid}} (${{res.status}})`);
        continue;
      }}
      const src = await res.json();
      const distractors = src.distractors || [];
      const lines = src.lines || {{}};
      const blanks = Object.values(lines).filter(l => l && l.blank);

      const isDistractorOk = distractors.length === 3;
      const isBlanksOk = blanks.length <= 3 && blanks.length >= 1;

      if (!isDistractorOk || !isBlanksOk) {{
        sourceFail++;
        sourceIssues.push({{
          id: sid,
          name: src.name,
          distractors: distractors.length,
          blanks: blanks.length,
          issue: `Distractors: ${{distractors.length}} (expected 3), Blanks: ${{blanks.length}} (expected <=3)`
        }});
        console.warn(`  [${{i + 1}}/${{targetServerSources.length}}] ⚠️ Anomaly in "${{src.name}}": ${{distractors.length}} distractors, ${{blanks.length}} blanks`);
      }} else {{
        sourcePass++;
      }}
    }} catch (err) {{
      sourceFail++;
      sourceIssues.push({{ id: sid, issue: err.message }});
      console.error(`  [${{i + 1}}/${{targetServerSources.length}}] ✗ Error:`, err);
    }}
    await new Promise(r => setTimeout(r, 40));
  }}

  console.log(`\\n✓ Sources Audit Complete: ${{sourcePass}}/${{targetServerSources.length}} PASSED (${{sourceFail}} issues)`);

  let bundlePass = 0, bundleFail = 0;
  const bundleIssues = [];
  const bundleIds = Object.keys(expectedBundles);

  console.log(`\\n--- [2/2] Auditing ${{bundleIds.length}} Bundles on Server ---`);
  for (let i = 0; i < bundleIds.length; i++) {{
    const bid = bundleIds[i];
    const exp = expectedBundles[bid];
    try {{
      const res = await fetch(`/pcex-authoring/api/bundles/${{bid}}?allUsers=true`);
      if (!res.ok) {{
        bundleFail++;
        bundleIssues.push({{ id: bid, name: exp.name, issue: `HTTP ${{res.status}} not found` }});
        console.warn(`  [${{i + 1}}/${{bundleIds.length}}] ✗ Missing Bundle: ${{bid}} (${{res.status}})`);
        continue;
      }}
      const bundle = await res.json();
      const actualSources = (bundle.items || []).map(itm => itm.item);
      const expectedSources = exp.expected_sources || [];

      const isItemsCountOk = actualSources.length === expectedSources.length;
      const areSourcesMatching = isItemsCountOk && actualSources.every((sid, idx) => sid === expectedSources[idx]);
      const hasLinkings = !!bundle.linkings;
      const hasStat = !!bundle.stat;

      if (!areSourcesMatching) {{
        bundleFail++;
        bundleIssues.push({{
          id: bid,
          name: bundle.name || exp.name,
          expectedSources,
          actualSources,
          issue: `Source IDs mismatch (Actual: ${{actualSources.join(', ')}} vs Expected: ${{expectedSources.join(', ')}})`
        }});
        console.warn(`  [${{i + 1}}/${{bundleIds.length}}] ⚠️ Source Mismatch in Bundle "${{bundle.name}}": Expected [${{expectedSources}}], got [${{actualSources}}]`);
      }} else {{
        bundlePass++;
      }}
    }} catch (err) {{
      bundleFail++;
      bundleIssues.push({{ id: bid, name: exp.name, issue: err.message }});
      console.error(`  [${{i + 1}}/${{bundleIds.length}}] ✗ Error:`, err);
    }}
    await new Promise(r => setTimeout(r, 40));
  }}

  console.log(`\\n✓ Bundles Audit Complete: ${{bundlePass}}/${{bundleIds.length}} PASSED (${{bundleFail}} issues)`);

  console.log('\\n================================================================');
  console.log('📊 FINAL LIVE SERVER AUDIT REPORT');
  console.log('================================================================');
  console.log(`Sources on Server: ${{sourcePass}}/${{targetServerSources.length}} Valid (3 distractors, <=3 blanks)`);
  console.log(`Bundles on Server: ${{bundlePass}}/${{bundleIds.length}} Properly Bundled & Matching Sources`);
  if (sourceIssues.length === 0 && bundleIssues.length === 0) {{
    console.log('🎉 PERFECT! 100% OF SOURCES AND BUNDLES ARE VERIFIED ON THE SERVER!');
  }} else {{
    if (sourceIssues.length > 0) {{
      console.log('\\n⚠️ SOURCE ISSUES FOUND:');
      console.table(sourceIssues);
    }}
    if (bundleIssues.length > 0) {{
      console.log('\\n⚠️ BUNDLE ISSUES FOUND:');
      console.table(bundleIssues);
    }}
  }}
  console.log('================================================================');
}})();
"""

out_file = os.path.join(script_dir, "verify_server_audit.js")
with open(out_file, "w", encoding="utf-8") as f:
    f.write(audit_code)

print("Generated:", out_file)
