/**
 * PCEX Authoring: Sequential Compilation & PAWS Sync for All 52 Parity Bundles
 * 
 * Instructions:
 * 1. Open Chrome/Firefox and navigate to: https://adapt2.sis.pitt.edu/pcex-authoring/
 * 2. Make sure you are logged in (as an administrator/author, e.g. moh70@pitt.edu).
 * 3. Open Developer Tools (F12 or Cmd+Option+I on Mac), switch to the "Console" tab.
 * 4. Paste this entire script and press Enter.
 * 5. Monitor real-time progress in the console until the final summary appears.
 */
(async () => {
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

  console.log(`%c🚀 Starting Sequential Compilation & PAWS Sync for ${targetBundleIds.length} Bundles...`, 'color: #1e40af; font-size: 14px; font-weight: bold;');
  console.log('--------------------------------------------------------------------------------');

  let compilePass = 0, compileFail = 0;
  let syncPass = 0, syncFail = 0;
  const results = [];

  for (let i = 0; i < targetBundleIds.length; i++) {
    const bundleId = targetBundleIds[i];
    const itemNum = `[${String(i + 1).padStart(2, ' ')}/${targetBundleIds.length}]`;

    try {
      // 1. Fetch the bundle details
      const getRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}?allUsers=true`, {
        credentials: 'include'
      });
      if (!getRes.ok) {
        console.warn(`${itemNum} ✗ Failed to fetch bundle ${bundleId} (${getRes.status})`);
        results.push({ id: bundleId, name: 'Unknown', compile: 'Fetch Error', sync: 'Skipped' });
        compileFail++;
        syncFail++;
        continue;
      }

      const bundle = await getRes.json();
      const bName = bundle.name || bundleId;
      const itemCount = bundle.items?.length || 0;

      // 2. Trigger runtime preview compilation (runs compile worker for bundle and sources)
      const compRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}/preview?type=activity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
        credentials: 'include'
      });

      let compOk = false;
      if (compRes.ok) {
        compilePass++;
        compOk = true;
      } else {
        compileFail++;
        console.warn(`${itemNum} ⚠️ Compile warning (${compRes.status}) for ${bName}`);
      }

      // 3. Trigger PAWS sync (Catalog & User Modeling registration)
      const syncRes = await fetch(`/pcex-authoring/api/bundles/${bundleId}/sync?allUsers=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      let syncOk = false;
      if (syncRes.ok) {
        syncPass++;
        syncOk = true;
      } else {
        syncFail++;
        console.warn(`${itemNum} ⚠️ PAWS sync warning (${syncRes.status}) for ${bName}`);
      }

      const statusIcon = compOk && syncOk ? '✓' : '⚠️';
      console.log(`${itemNum} ${statusIcon} ${bName.padEnd(35)} | Items: ${itemCount} | Compile: ${compOk ? 'OK' : 'ERR'} | PAWS Sync: ${syncOk ? 'OK' : 'ERR'}`);

      results.push({
        id: bundleId,
        name: bName,
        items: itemCount,
        compile: compOk ? '✓ OK' : '✗ Failed',
        sync: syncOk ? '✓ OK' : '✗ Failed'
      });

    } catch (err) {
      console.error(`${itemNum} ✗ Exception processing bundle ${bundleId}:`, err);
      compileFail++;
      syncFail++;
      results.push({ id: bundleId, name: 'Exception', compile: 'Error', sync: 'Error' });
    }

    // 1000ms pause to ensure worker thread completes without server overload
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`%c🎉 BUNDLE COMPILATION & PAWS SYNC COMPLETED!`, 'color: #166534; font-size: 14px; font-weight: bold;');
  console.log(`  • Bundles Processed:     ${targetBundleIds.length}`);
  console.log(`  • Preview Compiled:      ${compilePass} / ${targetBundleIds.length} OK`);
  console.log(`  • Synced to PAWS:        ${syncPass} / ${targetBundleIds.length} OK`);
  console.table(results);
})();
