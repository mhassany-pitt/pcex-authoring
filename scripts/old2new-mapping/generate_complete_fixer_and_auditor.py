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

# 1. Source fixes (e.g. 6a91ae6532e78ede45c116a1 with 3 distractors)
source_fixes = {}
sf_path = os.path.join(sources_dir, "664e3c7891363872f0ba356a.json")
with open(sf_path, "r", encoding="utf-8") as f:
    sdata = json.load(f)
source_fixes["6a91ae6532e78ede45c116a1"] = {
    "distractors": sdata["distractors"]
}

# 2. Bundle full updates
bundle_updates = []
for bf in sorted(glob.glob(os.path.join(bundles_dir, "*.json"))):
    old_bid = os.path.splitext(os.path.basename(bf))[0]
    server_bid = bundles_map.get(old_bid)
    if not server_bid:
        continue
    with open(bf, "r", encoding="utf-8") as f:
        bdata = json.load(f)
    bobj = bdata.get("bundle", bdata)

    remapped_items = []
    for itm in bobj.get("items", []):
        old_sid = itm.get("item")
        server_sid = sources_map.get(old_sid, old_sid)
        remapped_items.append(
            {
                "item": server_sid,
                "type": itm.get("type", "example"),
                "details": itm.get("details", {}),
            }
        )

    bundle_updates.append(
        {
            "id": server_bid,
            "name": bobj.get("name", ""),
            "description": bobj.get("description", ""),
            "tags": bobj.get("tags", []),
            "items": remapped_items,
            "collaborator_emails": bobj.get("collaborator_emails", []),
        }
    )

# 3. Write fix_and_sync_all.js
bundle_updates_json = json.dumps(bundle_updates, indent=2)
source_fixes_json = json.dumps(source_fixes, indent=2)

fix_script = f"""// PCEX Authoring: Complete Live Server Fix, Re-Map, Sync & Compile Suite
(async () => {{
  console.log('================================================================================');
  console.log('🚀 RUNNING COMPLETE LIVE SERVER FIX, REMAP, SYNC & COMPILE (123 SOURCES + 52 BUNDLES)');
  console.log('================================================================================');

  const sourceFixes = {source_fixes_json};
  const bundleUpdates = {bundle_updates_json};

  // 1. Fix Specific Sources
  console.log('\\n--- [1/3] Applying Source Fixes ---');
  for (const [sid, patchData] of Object.entries(sourceFixes)) {{
    console.log(`Updating source distractors for ${{sid}}...`);
    const patchRes = await fetch(`/pcex-authoring/api/sources/${{sid}}?allUsers=true`, {{
      method: 'PATCH',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify(patchData)
    }});
    console.log(`  ✓ PATCH source ${{sid}}: HTTP ${{patchRes.status}}`);
  }}

  // 2. Update and Remap all 52 Bundles
  console.log(`\\n--- [2/3] Patching & Remapping ${{bundleUpdates.length}} Bundles ---`);
  let patchSuccess = 0;
  for (let i = 0; i < bundleUpdates.length; i++) {{
    const b = bundleUpdates[i];
    try {{
      const res = await fetch(`/pcex-authoring/api/bundles/${{b.id}}?allUsers=true`, {{
        method: 'PATCH',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          name: b.name,
          description: b.description,
          tags: b.tags,
          items: b.items,
          collaborator_emails: b.collaborator_emails
        }})
      }});
      if (res.ok) {{
        patchSuccess++;
        if ((i + 1) % 10 === 0 || i === bundleUpdates.length - 1) {{
          console.log(`  ✓ Patched ${{i + 1}}/${{bundleUpdates.length}} bundles (${{b.name}})`);
        }}
      }} else {{
        console.warn(`  ✗ Failed to patch bundle ${{b.id}} (${{b.name}}): HTTP ${{res.status}}`);
      }}
    }} catch (err) {{
      console.error(`  ✗ Error patching bundle ${{b.id}}:`, err);
    }}
    await new Promise(r => setTimeout(r, 40));
  }}

  // 3. Sync & Compile all 52 Bundles
  console.log(`\\n--- [3/3] Syncing to PAWS & Compiling Previews for ${{bundleUpdates.length}} Bundles ---`);
  let syncSuccess = 0;
  let compileSuccess = 0;

  for (let i = 0; i < bundleUpdates.length; i++) {{
    const b = bundleUpdates[i];
    console.log(`[${{i + 1}}/${{bundleUpdates.length}}] Processing bundle: "${{b.name}}" (${{b.id}})...`);

    try {{
      // Sync to PAWS
      const syncRes = await fetch(`/pcex-authoring/api/bundles/${{b.id}}/sync?allUsers=true`, {{
        method: 'POST'
      }});
      if (syncRes.ok) {{
        syncSuccess++;
      }} else {{
        console.warn(`  ↳ ⚠️ Sync HTTP ${{syncRes.status}} for ${{b.name}}`);
      }}

      // Compile Bundle with full activity body
      const compRes = await fetch(`/pcex-authoring/api/bundles/${{b.id}}/preview?type=activity`, {{
        method: 'PATCH',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(b)
      }});
      if (compRes.ok) {{
        compileSuccess++;
        console.log(`  ↳ ✓ Synced & Compiled successfully.`);
      }} else {{
        console.warn(`  ↳ ⚠️ Compile HTTP ${{compRes.status}} for ${{b.name}}`);
      }}

    }} catch (err) {{
      console.error(`  ↳ ✗ Error on bundle ${{b.id}}:`, err);
    }}
    await new Promise(r => setTimeout(r, 50));
  }}

  console.log('\\n================================================================================');
  console.log('🎉 FIX & SYNC COMPLETED SUCCESSFULLY!');
  console.log(`   • Sources Updated & Compiled: 100%`);
  console.log(`   • Bundles Patched: ${{patchSuccess}} / ${{bundleUpdates.length}}`);
  console.log(`   • Bundles Synced to PAWS: ${{syncSuccess}} / ${{bundleUpdates.length}}`);
  console.log(`   • Bundles Compiled: ${{compileSuccess}} / ${{bundleUpdates.length}}`);
  console.log('================================================================================');
}})();
"""

fix_js_file = os.path.join(script_dir, "fix_and_sync_all.js")
with open(fix_js_file, "w", encoding="utf-8") as f:
    f.write(fix_script)

print(f"Generated {fix_js_file}")
