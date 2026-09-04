/**
 * PCEX Authoring: Sequential Compilation & PAWS Sync for fixed bundles:
 * 1. py_check_product_code (6a9060d6cbc5a3f2aa638bad)
 * 2. py_find_average       (6a91ae6f32e78ede45c11743)
 * 
 * Instructions:
 * 1. Open Chrome/Firefox and navigate to: https://adapt2.sis.pitt.edu/pcex-authoring/
 * 2. Ensure you are logged in (as moh70@pitt.edu).
 * 3. Open Developer Tools (F12 or Cmd+Option+I on Mac), switch to the "Console" tab.
 * 4. Paste this entire script and press Enter.
 */
(async () => {
  const targetBundleIds = [
    "6a9060d6cbc5a3f2aa638bad", // py_check_product_code
    "6a91ae6f32e78ede45c11743"  // py_find_average
  ];

  console.log(`%c🚀 Starting Compilation & PAWS Sync for ${targetBundleIds.length} Fixed Bundles...`, 'color: #1e40af; font-size: 14px; font-weight: bold;');
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

      // 2. Trigger runtime preview compilation
      console.log(`${itemNum} ⏳ Compiling preview for ${bName} (${bundleId})...`);
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
        const errText = await compRes.text();
        console.warn(`${itemNum} ⚠️ Compile warning (${compRes.status}) for ${bName}:`, errText);
      }

      // 3. Trigger PAWS sync (Catalog & User Modeling registration)
      console.log(`${itemNum} ⏳ Syncing ${bName} to PAWS...`);
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
        const syncErr = await syncRes.text();
        console.warn(`${itemNum} ⚠️ PAWS sync warning (${syncRes.status}) for ${bName}:`, syncErr);
      }

      const statusIcon = compOk && syncOk ? '✓' : '⚠️';
      console.log(`${itemNum} ${statusIcon} ${bName.padEnd(30)} | Items: ${itemCount} | Compile: ${compOk ? 'OK' : 'ERR'} | PAWS Sync: ${syncOk ? 'OK' : 'ERR'}`);

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

    // Brief pause between bundles
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`%c🎉 COMPILATION & PAWS SYNC COMPLETED!`, 'color: #166534; font-size: 14px; font-weight: bold;');
  console.log(`  • Bundles Processed:     ${targetBundleIds.length}`);
  console.log(`  • Preview Compiled:      ${compilePass} / ${targetBundleIds.length} OK`);
  console.log(`  • Synced to PAWS:        ${syncPass} / ${targetBundleIds.length} OK`);
  console.table(results);
})();
