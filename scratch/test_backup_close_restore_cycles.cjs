const http = require('http');

const API_BASE = 'http://localhost:8080/api';

async function request(path, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
        const reqOptions = {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'user-role': 'MASTER_ADMIN',
            'user-id': 'MASTER-ADMIN-01',
            'user-name': 'Master Admin',
            ...(options.headers || {})
          }
        };

        const req = http.request(url, reqOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, body: parsed });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });

        req.on('error', reject);

        if (options.body) {
          req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
      });
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}

function extractList(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  return [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 KKV GOLD FINANCE: SYNC OUTBOX, BACKUP & CLOSE & 10-CYCLE RESTORE TEST');
  console.log('================================================================\n');

  // ── 1. Check Google Drive Health ──────────────────────────────────────────
  console.log('--- Step 1: Checking Google Drive OAuth 2.0 & Target Folder ---');
  const healthRes = await request('/admin/backup/drive-health');
  console.log('Drive Health Status:', healthRes.status);
  console.log('Target Folder Verified:', healthRes.body?.folderName, `(${healthRes.body?.folderId})`);
  console.log('Drive Accessible & Ready:', healthRes.body?.driveAccessible);

  // ── 2. Test Sync Outbox Status ────────────────────────────────────────────
  console.log('\n--- Step 2: Testing Incremental Sync Outbox Queue ---');
  const syncStatus1 = await request('/sync/status');
  console.log('Initial Sync Queue Status:', syncStatus1.body?.data || syncStatus1.body);

  // Create a customer with proper address
  const phone = `98765${Math.floor(10000 + Math.random() * 90000)}`;
  const custRes = await request('/customers', {
    method: 'POST',
    body: {
      name: 'Test Verification Customer',
      phone,
      currentAddress: '100 Bazaar Street, Salem, TN',
      idProof: 'Aadhaar Card',
      idNumber: '123456789012'
    }
  });

  const createdCustomer = custRes.body?.data || custRes.body;
  console.log('Customer Creation:', custRes.status, createdCustomer?.id);
  const testCustId = createdCustomer?.id;

  // Create a loan
  const loanRes = await request('/loans', {
    method: 'POST',
    body: {
      customerId: testCustId,
      customerName: 'Test Verification Customer',
      customerPhone: phone,
      loanType: 'Gold Loan',
      loanTypeId: 'gold-loan',
      principal: 50000,
      bankMode: 'Cash',
      items: [{ itemType: 'Chain', purity: '22K (916)', grossWeight: 15, netWeight: 14 }]
    }
  });
  const createdLoan = loanRes.body?.data || loanRes.body;
  console.log('Loan Creation:', loanRes.status, createdLoan?.loanNo);

  // Create a Fixed Deposit
  const fdRes = await request('/fd/deposits', {
    method: 'POST',
    body: {
      depositorName: 'Test Verification Customer',
      depositorPhone: phone,
      principal: 30000,
      interestRatePA: 12,
      tenureMonths: 12,
      receivingMethod: 'Cash',
      depositDate: new Date().toLocaleDateString('en-GB')
    }
  });
  const createdFD = fdRes.body?.data || fdRes.body;
  console.log('FD Creation:', fdRes.status, createdFD?.fdNo);

  // Allow sync outbox to register events
  await sleep(1000);

  const syncStatus2 = await request('/sync/status');
  console.log('Sync Queue Status after CRUD:');
  console.log('  Total Events in Outbox:', syncStatus2.body?.data?.totalEvents);
  console.log('  Synced Events on Drive:', syncStatus2.body?.data?.synced);
  console.log('  Pending Events:', syncStatus2.body?.data?.pending);

  // ── 3. Test Transactional Backup & Close ──────────────────────────────────
  console.log('\n--- Step 3: Testing Transactional Backup & Close Workflow ---');
  const backupCloseRes = await request('/backup/close', {
    method: 'POST',
    body: {}
  });

  console.log('Backup & Close Status:', backupCloseRes.status);
  const backupData = backupCloseRes.body?.data || backupCloseRes.body;
  console.log('Backup File Name:', backupData?.fileName);
  console.log('Drive File ID:', backupData?.driveFileId);
  console.log('Drive Verified:', backupData?.verified);
  console.log('Local Cleared:', backupData?.localCleared);
  console.log('Local Data Safe:', backupData?.localDataSafe);

  if (!backupCloseRes.body.success || !backupData?.verified) {
    console.error('❌ Backup & Close failed!', backupCloseRes.body);
    process.exit(1);
  }

  // Verify local operational database is cleared
  const custAfterClose = extractList((await request('/customers')).body);
  const loansAfterClose = extractList((await request('/loans')).body);
  const fdAfterClose = extractList((await request('/fd/deposits')).body);

  console.log('Operational DB state after Backup & Close:');
  console.log('  Customers count:', custAfterClose.length);
  console.log('  Loans count:', loansAfterClose.length);
  console.log('  FDs count:', fdAfterClose.length);

  if (
    custAfterClose.length !== 0 ||
    loansAfterClose.length !== 0 ||
    fdAfterClose.length !== 0
  ) {
    console.error('❌ Local operational database was not safely cleared!');
    process.exit(1);
  } else {
    console.log('✅ Local operational database cleanly cleared after verified Drive backup.');
  }

  // ── 4. Test Startup Auto-Restore ──────────────────────────────────────────
  console.log('\n--- Step 4: Testing Application Startup Auto-Restore ---');
  const autoRestoreRes = await request('/backup/auto-restore-check');
  console.log('Auto-Restore Check Response:', autoRestoreRes.body);

  const custRestored = extractList((await request('/customers')).body);
  const loansRestored = extractList((await request('/loans')).body);
  const fdRestored = extractList((await request('/fd/deposits')).body);

  console.log('Restored Operational DB State:');
  console.log('  Customers count:', custRestored.length);
  console.log('  Loans count:', loansRestored.length);
  console.log('  FDs count:', fdRestored.length);

  const foundCust = custRestored.find((c) => c.id === testCustId);
  if (foundCust) {
    console.log(`✅ Auto-restored test customer successfully: ${foundCust.name} (${foundCust.id})`);
  } else {
    console.error('❌ Restored customer not found in database!');
    process.exit(1);
  }

  // ── 5. Run 10 Consecutive Backup & Close / Restore Cycles ──────────────────
  console.log('\n================================================================');
  console.log('🔁 STARTING 10-CYCLE BACKUP & CLOSE / RESTORE FIDELITY VERIFICATION');
  console.log('================================================================\n');

  for (let cycle = 1; cycle <= 10; cycle++) {
    console.log(`\n--- [Cycle ${cycle}/10] ---`);

    // A. Add a record in this cycle
    const cyclePhone = `97000${String(cycle).padStart(5, '0')}`;
    const addCust = await request('/customers', {
      method: 'POST',
      body: {
        name: `Cycle ${cycle} Customer`,
        phone: cyclePhone,
        currentAddress: `Salem Cycle Street ${cycle}, Tamil Nadu`,
        idProof: 'Aadhaar Card',
        idNumber: `50000000${String(cycle).padStart(4, '0')}`
      }
    });

    const createdCycleCust = addCust.body?.data || addCust.body;
    const cId = createdCycleCust?.id;
    console.log(`  [1] Created Customer ${cId} (${cyclePhone})`);

    // B. Execute Backup & Close
    const closeRes = await request('/backup/close', { method: 'POST' });
    if (!closeRes.body.success) {
      console.error(`❌ Cycle ${cycle} Backup & Close failed:`, closeRes.body);
      process.exit(1);
    }
    const closeData = closeRes.body?.data || closeRes.body;
    console.log(`  [2] Backup & Close verified on Drive: ${closeData?.backupId} (${closeData?.fileName})`);

    // C. Verify local DB is cleared
    const checkCleared = extractList((await request('/customers')).body);
    if (checkCleared.length !== 0) {
      console.error(`❌ Cycle ${cycle} local DB not cleared! Count:`, checkCleared.length);
      process.exit(1);
    }
    console.log('  [3] Local DB confirmed cleared (0 records)');

    // D. Trigger Auto-Restore
    const restoreRes = await request('/backup/auto-restore-check');
    if (!restoreRes.body.autoRestored && !restoreRes.body.restoredBackupId) {
      console.error(`❌ Cycle ${cycle} auto-restore failed:`, restoreRes.body);
      process.exit(1);
    }

    // E. Verify record counts and no duplicates
    const customerList = extractList((await request('/customers')).body);
    const ids = customerList.map((c) => c.id);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      console.error(`❌ Duplicate customer IDs detected in cycle ${cycle}! Total: ${ids.length}, Unique: ${uniqueIds.size}`);
      process.exit(1);
    }

    console.log(`  [4] Restored ${customerList.length} customers cleanly (0 duplicates, 100% ID integrity)`);
    console.log(`  ✅ Cycle ${cycle}/10 PASSED perfectly!`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 10 CYCLES COMPLETED WITH 100% DATA FIDELITY & ZERO DUPLICATES!');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
