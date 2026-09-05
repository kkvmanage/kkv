const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve(__dirname, '../backend/node_modules/jszip'));

const BASE_URL = 'http://localhost:8080';

function postJson(endpoint, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data || {});
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-actor-name': 'Master Admin',
          'x-actor-uid': 'ADM-001',
          'user-role': 'Admin'
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method: 'GET',
        headers: {
          'x-actor-name': 'Master Admin',
          'x-actor-uid': 'ADM-001',
          'user-role': 'Admin'
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function uploadZipMultipart(endpoint, zipBuffer, filename = 'backup.zip') {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="backupFile"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([header, zipBuffer, footer]);

    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
          'x-actor-name': 'Master Admin',
          'x-actor-uid': 'ADM-001',
          'user-role': 'Admin'
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function calculateSha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function testRestoreWithRealRecords() {
  console.log('================================================================');
  console.log('🧪 TESTING RESTORE WITH RICH REALISTIC OPERATIONAL DATA');
  console.log('================================================================\n');

  // Build realistic sample data
  const sampleCustomers = [
    { id: 'CUST-001', name: 'Ramesh Kumar', phone: '9876543210', place: 'Salem', createdAt: '2026-01-10T10:00:00.000Z' },
    { id: 'CUST-002', name: 'Sita Devi', phone: '9876543211', place: 'Coimbatore', createdAt: '2026-01-15T11:00:00.000Z' },
    { id: 'CUST-003', name: 'Murugan G', phone: '9876543212', place: 'Erode', createdAt: '2026-02-01T12:00:00.000Z' }
  ];

  const sampleLoans = [
    {
      id: 'GL-1001',
      loanNo: 'GL-1001',
      customerId: 'CUST-001',
      customerName: 'Ramesh Kumar',
      loanType: 'Gold',
      principal: 75000,
      interestRate: 1.5,
      loanDate: '2026-01-10',
      status: 'ACTIVE'
    },
    {
      id: 'GL-1002',
      loanNo: 'GL-1002',
      customerId: 'CUST-002',
      customerName: 'Sita Devi',
      loanType: 'Gold',
      principal: 120000,
      interestRate: 1.5,
      loanDate: '2026-01-15',
      status: 'ACTIVE'
    }
  ];

  const sampleReceipts = [
    { id: 'REC-5001', receiptNo: 'REC-5001', loanId: 'GL-1001', customerName: 'Ramesh Kumar', amount: 5000, date: '2026-02-10' },
    { id: 'REC-5002', receiptNo: 'REC-5002', loanId: 'GL-1002', customerName: 'Sita Devi', amount: 8000, date: '2026-02-15' }
  ];

  const sampleDayBook = [
    { id: 'DB-9001', date: '2026-01-10', type: 'EXPENSE', amount: 75000, particulars: 'Gold Loan GL-1001 disbursement' },
    { id: 'DB-9002', date: '2026-01-15', type: 'EXPENSE', amount: 120000, particulars: 'Gold Loan GL-1002 disbursement' },
    { id: 'DB-9003', date: '2026-02-10', type: 'INCOME', amount: 5000, particulars: 'Receipt REC-5001 repayment' }
  ];

  const snapshotData = {
    backupId: 'BKP-TEST-RICH-001',
    applicationName: 'KKV Gold Finance',
    applicationVersion: '1.0.0',
    backupSchemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    data: {
      customers: sampleCustomers,
      loans: sampleLoans,
      receipts: sampleReceipts,
      fixedDeposits: [],
      dayBookEntries: sampleDayBook,
      reminders: [],
      notifications: []
    }
  };

  const snapshotBuf = Buffer.from(JSON.stringify(snapshotData, null, 2), 'utf-8');
  const snapshotSha256 = calculateSha256(snapshotBuf);

  // Manifest
  const manifestData = {
    backupId: 'BKP-TEST-RICH-001',
    applicationName: 'KKV Gold Finance',
    applicationVersion: '1.0.0',
    backupSchemaVersion: '1.0.0',
    createdAt: snapshotData.createdAt,
    createdBy: {
      userId: 'ADM-001',
      name: 'Master Admin',
      role: 'Admin'
    },
    recordCounts: {
      customers: sampleCustomers.length,
      loans: sampleLoans.length,
      receipts: sampleReceipts.length,
      fixedDeposits: 0,
      dayBookEntries: sampleDayBook.length,
      totalRecords: sampleCustomers.length + sampleLoans.length + sampleReceipts.length + sampleDayBook.length
    },
    files: [
      { path: 'snapshot.json', size: snapshotBuf.length, sha256: snapshotSha256 }
    ]
  };

  const manifestBuf = Buffer.from(JSON.stringify(manifestData, null, 2), 'utf-8');

  // Build ZIP
  const zip = new JSZip();
  zip.file('snapshot.json', snapshotBuf);
  zip.file('manifest.json', manifestBuf);
  zip.file('schema/backup-schema-version.json', JSON.stringify({ version: '1.0.0' }));
  zip.file('checksums/SHA256SUMS.txt', `${snapshotSha256}  snapshot.json\n`);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  console.log(`[1] Created mock verified ZIP package (${zipBuffer.length} bytes, SHA-256: ${calculateSha256(zipBuffer)})...`);

  // Validate ZIP
  console.log('[2] Validating rich ZIP backup package...');
  const valRes = await uploadZipMultipart('/api/admin/system/restore/validate', zipBuffer, 'RICH_BACKUP.zip');
  if (valRes.status !== 200 || !valRes.data?.data?.token) {
    throw new Error(`Validation failed: ${JSON.stringify(valRes)}`);
  }
  const token = valRes.data.data.token;
  console.log(`  -> ✅ Validation passed! Token: ${token}`);
  console.log(`  -> Preview Counts:`, valRes.data.data.counts);

  // Execute Restore
  console.log('[3] Executing transactional restore with confirmation: "RESTORE BACKUP"...');
  const execRes = await postJson('/api/admin/system/restore', {
    token,
    confirmationText: 'RESTORE BACKUP'
  });

  if (execRes.status !== 200 || !execRes.data?.data) {
    throw new Error(`Restore failed: ${JSON.stringify(execRes)}`);
  }
  console.log(`  -> ✅ Restore Result: ${execRes.data.data.databaseStatus}`);
  console.log(`  -> Restored Records:`, execRes.data.data.restoredCounts);

  // Verify in Live Database
  console.log('[4] Verifying database records directly via Preview API...');
  const wipePreviewRes = await getJson('/api/admin/wipe-all-data/preview');
  const counts = wipePreviewRes.data?.data?.counts;
  console.log(`  -> Live Database Counts:`, counts);

  if (counts.customers !== 3 || counts.loans !== 2 || counts.receipts !== 2 || counts.dayBookEntries !== 3) {
    throw new Error(`Restored database counts do not match expected records! Found: ${JSON.stringify(counts)}`);
  }

  console.log('  -> ✅ All 3 Customers, 2 Loans, 2 Receipts, and 3 DayBook entries verified in database!');
  console.log('\n================================================================');
  console.log('🎉 RICH DATA RESTORATION TEST PASSED (100%)');
  console.log('================================================================\n');
}

testRestoreWithRealRecords().catch((err) => {
  console.error('\n❌ RICH DATA TEST FAILED:', err);
  process.exit(1);
});
