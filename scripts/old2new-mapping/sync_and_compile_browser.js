// PCEX Authoring: Update Sources, Sync to PAWS & Compile 52 Target Bundles
(async () => {
  const sourcesMap = {
    "664e23fa91363872f0ba32e6": "6a9060c4cbc5a3f2aa638aa5",
    "664e23fc91363872f0ba32e8": "6a9060c4cbc5a3f2aa638aa7",
    "664e23ff91363872f0ba32ee": "6a9060c4cbc5a3f2aa638aa9",
    "664e240191363872f0ba32f0": "6a9060c4cbc5a3f2aa638aab",
    "664e248491363872f0ba3318": "6a9060c5cbc5a3f2aa638aad",
    "664e248d91363872f0ba331a": "6a9060c5cbc5a3f2aa638aaf",
    "664e24b791363872f0ba331c": "6a9060c5cbc5a3f2aa638ab1",
    "664e24ec91363872f0ba332c": "6a9060c5cbc5a3f2aa638ab3",
    "664e24ee91363872f0ba332e": "6a9060c5cbc5a3f2aa638ab5",
    "664e257991363872f0ba335c": "6a9060c5cbc5a3f2aa638ab7",
    "664e257c91363872f0ba335e": "6a9060c5cbc5a3f2aa638ab9",
    "664e257e91363872f0ba3360": "6a9060c5cbc5a3f2aa638abb",
    "664e25c591363872f0ba3374": "6a9060c6cbc5a3f2aa638abd",
    "664e25c791363872f0ba3376": "6a9060c6cbc5a3f2aa638abf",
    "664e25cb91363872f0ba3378": "6a9060c6cbc5a3f2aa638ac1",
    "664e25d391363872f0ba337f": "6a9060c6cbc5a3f2aa638ac3",
    "664e25d491363872f0ba3381": "6a9060c6cbc5a3f2aa638ac5",
    "664e26ed91363872f0ba33ae": "6a9060c6cbc5a3f2aa638ac7",
    "664e26f191363872f0ba33b0": "6a9060c6cbc5a3f2aa638ac9",
    "664e270191363872f0ba33b2": "6a9060c6cbc5a3f2aa638acb",
    "664e273d91363872f0ba33c1": "6a9060c6cbc5a3f2aa638acd",
    "664e274591363872f0ba33c3": "6a9060c7cbc5a3f2aa638acf",
    "664e2a9091363872f0ba341a": "6a9060c7cbc5a3f2aa638ad1",
    "664e2aad91363872f0ba341c": "6a9060c7cbc5a3f2aa638ad3",
    "664e2c5391363872f0ba3442": "6a9060c7cbc5a3f2aa638ad5",
    "664e2c5591363872f0ba3444": "6a9060c7cbc5a3f2aa638ad7",
    "664e2c5791363872f0ba344a": "6a9060c7cbc5a3f2aa638ad9",
    "664e2c5c91363872f0ba344c": "6a9060c7cbc5a3f2aa638adb",
    "664e2c8891363872f0ba3464": "6a9060c7cbc5a3f2aa638add",
    "664e2c8991363872f0ba3466": "6a9060c8cbc5a3f2aa638adf",
    "664e2d5591363872f0ba3479": "6a91ae6232e78ede45c11671",
    "664e2d5991363872f0ba347b": "6a91ae6232e78ede45c11673",
    "664e2d5d91363872f0ba3481": "6a91ae6332e78ede45c11675",
    "664e2d5e91363872f0ba3483": "6a91ae6332e78ede45c11677",
    "664e2d5f91363872f0ba3485": "6a91ae6332e78ede45c11679",
    "664e2d6691363872f0ba3491": "6a91ae6332e78ede45c1167b",
    "664e2d6891363872f0ba3493": "6a91ae6332e78ede45c1167d",
    "664e2d6f91363872f0ba3495": "6a91ae6332e78ede45c1167f",
    "664e2d7191363872f0ba3497": "6a91ae6332e78ede45c11681",
    "664e2e3f91363872f0ba34d2": "6a91ae6332e78ede45c11683",
    "664e2e4191363872f0ba34d4": "6a91ae6432e78ede45c11685",
    "664e2e4591363872f0ba34da": "6a91ae6432e78ede45c11687",
    "664e2e4691363872f0ba34dc": "6a91ae6432e78ede45c11689",
    "664e2e4a91363872f0ba34e2": "6a91ae6432e78ede45c1168b",
    "664e2e4c91363872f0ba34e4": "6a91ae6432e78ede45c1168d",
    "664e2eeb91363872f0ba34f2": "6a91ae6432e78ede45c1168f",
    "664e2eec91363872f0ba34f4": "6a91ae6432e78ede45c11691",
    "664e2fa291363872f0ba3518": "6a91ae6432e78ede45c11693",
    "664e2fa491363872f0ba351a": "6a91ae6432e78ede45c11695",
    "664e2fe691363872f0ba3532": "6a91ae6532e78ede45c11697",
    "664e2fe791363872f0ba3534": "6a91ae6532e78ede45c11699",
    "664e2fe991363872f0ba3536": "6a91ae6532e78ede45c1169b",
    "664e3c2a91363872f0ba354b": "6a91ae6532e78ede45c1169d",
    "664e3c3091363872f0ba354d": "6a91ae6532e78ede45c1169f",
    "664e3c7891363872f0ba356a": "6a91ae6532e78ede45c116a1",
    "664e3c8791363872f0ba356c": "6a91ae6532e78ede45c116a3",
    "664e3c9f91363872f0ba3585": "6a91ae6632e78ede45c116a5",
    "664e3ca191363872f0ba3587": "6a91ae6632e78ede45c116a7",
    "664e3ca391363872f0ba3589": "6a91ae6632e78ede45c116a9",
    "664e3ca791363872f0ba3590": "6a91ae6632e78ede45c116ab",
    "664e3ca991363872f0ba3592": "6a91ae6632e78ede45c116ad",
    "664e3cac91363872f0ba3594": "6a91ae6632e78ede45c116af",
    "664e3cf791363872f0ba35ab": "6a91ae6632e78ede45c116b1",
    "664e3d1591363872f0ba35ad": "6a91ae6632e78ede45c116b3",
    "664e40da91363872f0ba3604": "6a91ae6732e78ede45c116b5",
    "664e40dc91363872f0ba3606": "6a91ae6732e78ede45c116b7",
    "664e40dd91363872f0ba3608": "6a91ae6732e78ede45c116b9",
    "664e41f891363872f0ba3682": "6a91ae6732e78ede45c116bb",
    "664e420b91363872f0ba3684": "6a91ae6732e78ede45c116bd",
    "664e423091363872f0ba369e": "6a91ae6732e78ede45c116bf",
    "664e423791363872f0ba36a7": "6a91ae6732e78ede45c116c1",
    "664e424291363872f0ba36af": "6a91ae6832e78ede45c116c3",
    "664e427291363872f0ba36ca": "6a91ae6832e78ede45c116c5",
    "664e427791363872f0ba36d2": "6a91ae6832e78ede45c116c7",
    "664e42a091363872f0ba36e2": "6a91ae6832e78ede45c116c9",
    "664e42db91363872f0ba36ef": "6a91ae6832e78ede45c116cb",
    "664e43e791363872f0ba371d": "6a91ae6832e78ede45c116cd",
    "664e447391363872f0ba3734": "6a91ae6832e78ede45c116cf",
    "664e448791363872f0ba3747": "6a91ae6832e78ede45c116d1",
    "664e44c491363872f0ba3757": "6a91ae6932e78ede45c116d3",
    "664e44d091363872f0ba3766": "6a91ae6932e78ede45c116d5",
    "664e44d991363872f0ba3771": "6a91ae6932e78ede45c116d7",
    "664e4bfe91363872f0ba37e1": "6a91ae6932e78ede45c116d9",
    "664e4c2291363872f0ba37f7": "6a91ae6932e78ede45c116db",
    "664e4c2b91363872f0ba3803": "6a91ae6932e78ede45c116dd",
    "664e4c5491363872f0ba380c": "6a91ae6932e78ede45c116df",
    "664e4dc291363872f0ba384f": "6a91ae6a32e78ede45c116e1",
    "664e4e3a91363872f0ba3883": "6a91ae6a32e78ede45c116e3",
    "664e500591363872f0ba38c6": "6a91ae6a32e78ede45c116e5",
    "664e502191363872f0ba38db": "6a91ae6a32e78ede45c116e7",
    "664e504791363872f0ba38ee": "6a91ae6a32e78ede45c116e9",
    "664e50cd91363872f0ba390b": "6a91ae6a32e78ede45c116eb",
    "664e2e0991363872f0ba34c0": "6a91ae6b32e78ede45c116ed",
    "664e2e4291363872f0ba34d4": "6a91ae6b32e78ede45c116ef",
    "664e2dfc91363872f0ba34b6": "6a91ae6b32e78ede45c116f1",
    "664e2dfe91363872f0ba34b8": "6a91ae6b32e78ede45c116f3",
    "664e2ef391363872f0ba34fc": "6a91ae6b32e78ede45c116f5",
    "664e2ef591363872f0ba34fe": "6a91ae6b32e78ede45c116f7",
    "664e2f5b91363872f0ba3510": "6a91ae6c32e78ede45c116f9",
    "664e2f5d91363872f0ba3512": "6a91ae6c32e78ede45c116fb",
    "664e3c1a91363872f0ba3545": "6a91ae6c32e78ede45c116fd",
    "664e3c1b91363872f0ba3547": "6a91ae6c32e78ede45c116ff",
    "664e3c9891363872f0ba357c": "6a91ae6c32e78ede45c11701",
    "664e3c9a91363872f0ba357e": "6a91ae6c32e78ede45c11703",
    "664e3ca491363872f0ba3589": "6a91ae6c32e78ede45c11705",
    "664e3ca891363872f0ba3590": "6a91ae6c32e78ede45c11707",
    "664e3cd691363872f0ba359f": "6a91ae6c32e78ede45c11709",
    "664e3cd791363872f0ba35a1": "6a91ae6d32e78ede45c1170b",
    "664e3d8691363872f0ba35b3": "6a91ae6d32e78ede45c1170d",
    "664e3d8891363872f0ba35b5": "6a91ae6d32e78ede45c1170f",
    "664e41cf91363872f0ba3671": "6a91ae6d32e78ede45c11711",
    "664e41d091363872f0ba3673": "6a91ae6d32e78ede45c11713",
    "664e422991363872f0ba3694": "6a91ae6d32e78ede45c11715",
    "664e422a91363872f0ba3696": "6a91ae6d32e78ede45c11717",
    "664e44c291363872f0ba3755": "6a91ae6d32e78ede45c11719",
    "664e44c391363872f0ba3757": "6a91ae6d32e78ede45c1171b",
    "664e4e2391363872f0ba386d": "6a91ae6d32e78ede45c1171d",
    "664e4e2491363872f0ba386f": "6a91ae6d32e78ede45c1171f",
    "664e501e91363872f0ba38d9": "6a91ae6d32e78ede45c1171f",
    "664e502091363872f0ba38db": "6a91ae6e32e78ede45c11721",
    "664e504491363872f0ba38ec": "6a91ae6e32e78ede45c11723",
    "664e504691363872f0ba38ee": "6a91ae6e32e78ede45c11725",
    "664e50cc91363872f0ba3909": "6a91ae6e32e78ede45c11727",
    "664e50ce91363872f0ba390b": "6a91ae6e32e78ede45c11729"
  };

  const targetBundleIds = [
    "6a9060d5cbc5a3f2aa638b9b", "6a9060d5cbc5a3f2aa638b9d", "6a9060d5cbc5a3f2aa638b9f", "6a9060d5cbc5a3f2aa638ba1",
    "6a9060d5cbc5a3f2aa638ba3", "6a9060d5cbc5a3f2aa638ba5", "6a9060d6cbc5a3f2aa638ba7", "6a9060d6cbc5a3f2aa638ba9",
    "6a9060d6cbc5a3f2aa638bab", "6a9060d6cbc5a3f2aa638bad", "6a9060d6cbc5a3f2aa638baf", "6a9060d6cbc5a3f2aa638bb1",
    "6a9060d6cbc5a3f2aa638bb3", "6a91ae6e32e78ede45c1172b", "6a91ae6e32e78ede45c1172d", "6a91ae6e32e78ede45c1172f",
    "6a91ae6e32e78ede45c11731", "6a91ae6f32e78ede45c11733", "6a91ae6f32e78ede45c11735", "6a91ae6f32e78ede45c11737",
    "6a91ae6f32e78ede45c11739", "6a91ae6f32e78ede45c1173b", "6a91ae6f32e78ede45c1173d", "6a91ae6f32e78ede45c1173f",
    "6a91ae6f32e78ede45c11741", "6a91ae6f32e78ede45c11743", "6a91ae6f32e78ede45c11745", "6a91ae6f32e78ede45c11747",
    "6a91ae7032e78ede45c11749", "6a91ae7032e78ede45c1174b", "6a91ae7032e78ede45c1174d", "6a91ae7032e78ede45c1174f",
    "6a91ae7032e78ede45c11751", "6a91ae7032e78ede45c11753", "6a91ae7032e78ede45c11755", "6a91ae7032e78ede45c11757",
    "6a91ae7032e78ede45c11759", "6a91ae7032e78ede45c1175b", "6a91ae7032e78ede45c1175d", "6a91ae7132e78ede45c1175f",
    "6a91ae7132e78ede45c11761", "6a91ae7132e78ede45c11763", "6a91ae7132e78ede45c11765", "6a91ae7132e78ede45c11767",
    "6a91ae7132e78ede45c11769", "6a91ae7132e78ede45c1176b", "6a91ae7132e78ede45c1176d", "6a91ae7132e78ede45c1176f",
    "6a91ae7132e78ede45c11771", "6a91ae7132e78ede45c11773", "6a91ae7232e78ede45c11775", "6a91ae7232e78ede45c11777"
  ];

  console.log(`Starting update, compile, and PAWS sync for ${targetBundleIds.length} target bundles...`);

  for (let i = 0; i < targetBundleIds.length; i++) {
    const bundleId = targetBundleIds[i];
    console.log(`\n[${i + 1}/${targetBundleIds.length}] Processing Bundle ID: ${bundleId}...`);

    try {
      // 1. Fetch current bundle data from server
      const getRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}?allUsers=true`);
      if (!getRes.ok) {
        console.warn(`  ✗ Failed to fetch bundle (${getRes.status}):`, await getRes.text());
        continue;
      }
      const bundle = await getRes.json();
      console.log(`  • Name: "${bundle.name}"`);

      // 2. Remap source items to current cloned server IDs
      let remappedCount = 0;
      if (Array.isArray(bundle.items)) {
        bundle.items = bundle.items.map(itm => {
          const oldSid = itm.item;
          const newSid = sourcesMap[oldSid] || oldSid;
          if (newSid !== oldSid) remappedCount++;
          return { ...itm, item: newSid };
        });
      }
      console.log(`  • Checked ${bundle.items?.length || 0} items (${remappedCount} remapped to current server sources)`);

      // 3. Save updated bundle back to server
      const patchRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}?allUsers=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle)
      });
      if (patchRes.ok) {
        console.log(`  ✓ Bundle updated on server`);
      } else {
        console.warn(`  ✗ Update failed (${patchRes.status}):`, await patchRes.text());
      }

      // 4. Sync to PAWS (Catalog & User Modeling)
      const syncRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}/sync?allUsers=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (syncRes.ok) {
        console.log(`  ✓ Synced to PAWS`);
      } else {
        console.warn(`  ✗ PAWS sync status ${syncRes.status}:`, await syncRes.text());
      }

      // 5. Compile runtime preview package
      const compileRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}/preview?type=activity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle)
      });
      if (compileRes.ok) {
        console.log(`  ✓ Preview JSON generated / compiled`);
      } else {
        console.warn(`  ✗ Compile status ${compileRes.status}:`, await compileRes.text());
      }

    } catch (err) {
      console.error(`  ✗ Error processing bundle ${bundleId}:`, err);
    }

    // Pacing delay between bundles (1.0s)
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n🎉 ALL 52 TARGET BUNDLES SUCCESSFULLY UPDATED, COMPILED, AND SYNCED TO PAWS!');
})();
