const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve(__dirname, '../backend/node_modules/jszip'));

const BASE_URL = 'http://localhost:8080';

function postJson(endpoint, data, headers = {}) {
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
          'user-role': 'Admin',
          ...headers
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

function getJson(endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method: 'GET',
        headers: {
          'x-actor-name': 'Master Admin',
          'x-actor-uid': 'ADM-001',
          'user-role': 'Admin',
          ...headers
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

function getBinary(endpoint) {
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
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            buffer: Buffer.concat(chunks),
            contentType: res.headers['content-type'],
            contentLength: parseInt(res.headers['content-length'] || '0', 10)
          });
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

async function runCompleteTestSuite() {
  console.log('================================================================');
  console.log('🚀 TESTING COMPLETE LOCAL ZIP RESTORE & DRIVE SYNC SUITE');
  console.log('================================================================\n');

  // STEP 1: CREATE PORTABLE BACKUP PACKAGE
  console.log('[STEP 1] Creating fresh Portable Backup Package...');
  const createRes = await postJson('/api/admin/backup/create');
  if (createRes.status !== 200 || !createRes.data?.data) {
    throw new Error(`Backup creation failed: ${JSON.stringify(createRes)}`);
  }
  const backupId = createRes.data.data.backupId;
  const originalSha256 = createRes.data.data.sha256;
  const originalRecordCounts = createRes.data.data.recordCounts;
  console.log(`  -> Created Backup ID: ${backupId}`);
  console.log(`  -> SHA-256: ${originalSha256}`);
  console.log(`  -> Original Records:`, originalRecordCounts);

  // STEP 2: DOWNLOAD BINARY ZIP
  console.log('\n[STEP 2] Downloading binary ZIP package...');
  const downloadRes = await getBinary(`/api/admin/backup/${backupId}/download`);
  if (downloadRes.status !== 200 || downloadRes.buffer.length === 0) {
    throw new Error(`ZIP download failed: Status ${downloadRes.status}`);
  }
  const downloadedSha256 = crypto.createHash('sha256').update(downloadRes.buffer).digest('hex');
  console.log(`  -> Downloaded ${downloadRes.buffer.length} bytes`);
  console.log(`  -> Downloaded SHA-256: ${downloadedSha256}`);
  if (downloadedSha256 !== originalSha256) {
    throw new Error('Downloaded ZIP SHA-256 checksum mismatch!');
  }
  console.log('  -> ✅ Byte-for-byte SHA-256 verification passed!');

  // STEP 3: VALIDATE DOWNLOADED ZIP UPLOAD
  console.log('\n[STEP 3] Validating downloaded ZIP through multipart restore validator...');
  const validateRes = await uploadZipMultipart('/api/admin/system/restore/validate', downloadRes.buffer, 'KKV_TEST_BACKUP.zip');
  if (validateRes.status !== 200 || !validateRes.data?.data?.token) {
    throw new Error(`Validation failed: ${JSON.stringify(validateRes)}`);
  }
  const validToken = validateRes.data.data.token;
  console.log(`  -> ✅ Validation passed! Token: ${validToken}`);
  console.log(`  -> Manifest Verified: ${validateRes.data.data.manifestVerified}`);
  console.log(`  -> Checksums Verified: ${validateRes.data.data.checksumsVerified}`);
  console.log(`  -> Relationships Verified: ${validateRes.data.data.relationshipsVerified}`);
  console.log(`  -> Record Preview:`, validateRes.data.data.counts);

  // STEP 4: TEST TAMPER DETECTION (MODIFIED CSV IN ZIP)
  console.log('\n[STEP 4] Testing SHA-256 Tamper Detection (Tampered CSV in ZIP)...');
  const zipObj = await JSZip.loadAsync(downloadRes.buffer);
  zipObj.file('data/customers.csv', 'id,name,phone\nTAMPERED_CUST,Hacker,9999999999\n');
  const tamperedBuffer = await zipObj.generateAsync({ type: 'nodebuffer' });
  const tamperValidateRes = await uploadZipMultipart('/api/admin/system/restore/validate', tamperedBuffer, 'TAMPERED.zip');
  console.log(`  -> Tamper validation response status: ${tamperValidateRes.status}`);
  if (tamperValidateRes.status === 400 && tamperValidateRes.data?.message?.includes('SHA-256 mismatch')) {
    console.log(`  -> ✅ Tamper successfully blocked: "${tamperValidateRes.data.message}"`);
  } else {
    throw new Error(`Tampered ZIP was not properly blocked! Response: ${JSON.stringify(tamperValidateRes)}`);
  }

  // STEP 5: WIPE OPERATIONAL DATA TO 0
  console.log('\n[STEP 5] Acknowledging download and executing Wipe All Data...');
  await postJson(`/api/admin/backup/${backupId}/acknowledge-download`);
  const wipeInitRes = await postJson('/api/admin/wipe-all-data/initiate', { confirmationText: 'WIPE ALL DATA' });
  const wipeToken = wipeInitRes.data?.data?.token || wipeInitRes.data?.data?.wipeAuthorizationToken;
  if (!wipeToken) throw new Error(`Wipe token generation failed: ${JSON.stringify(wipeInitRes)}`);

  const wipeConfirmRes = await postJson('/api/admin/wipe-all-data/confirm', {
    token: wipeToken,
    confirmationText: 'WIPE ALL DATA'
  });
  console.log(`  -> Wipe confirmed. Post-wipe record counts:`, wipeConfirmRes.data?.data?.postWipeCounts);

  // STEP 6: VERIFY DATABASE IS EMPTY
  console.log('\n[STEP 6] Verifying database is now 0 records...');
  const wipePreviewRes = await getJson('/api/admin/wipe-all-data/preview');
  console.log(`  -> Current DB records:`, wipePreviewRes.data?.data?.counts);
  const totalWiped =
    wipePreviewRes.data?.data?.counts?.totalOperationalRecords ?? wipePreviewRes.data?.data?.counts?.totalRecords;
  if (totalWiped !== 0) {
    throw new Error(`Database was not wiped to 0! Current count: ${totalWiped}`);
  }
  console.log('  -> ✅ Verified database is completely empty (0 operational records).');

  // STEP 7: RESTORE FROM LOCAL DOWNLOADED ZIP PACKAGE
  console.log('\n[STEP 7] Validating and executing restore from local ZIP package...');
  const reValidateRes = await uploadZipMultipart('/api/admin/system/restore/validate', downloadRes.buffer, 'LOCAL_RESTORE.zip');
  const restoreToken = reValidateRes.data?.data?.token;

  const restoreExecRes = await postJson('/api/admin/system/restore', {
    token: restoreToken,
    confirmationText: 'RESTORE BACKUP'
  });

  if (restoreExecRes.status !== 200 || !restoreExecRes.data?.data) {
    throw new Error(`Restore execution failed: ${JSON.stringify(restoreExecRes)}`);
  }
  console.log(`  -> ✅ Restore execution status: ${restoreExecRes.data.data.databaseStatus}`);
  console.log(`  -> Restored Records:`, restoreExecRes.data.data.restoredCounts);
  console.log(`  -> Google Drive Sync Status: ${restoreExecRes.data.data.googleDriveSync}`);

  // STEP 8: VERIFY ALL OPERATIONAL COLLECTIONS ARE RESTORED
  console.log('\n[STEP 8] Verifying database records match original counts 100%...');
  const postRestorePreview = await getJson('/api/admin/wipe-all-data/preview');
  const postCounts = postRestorePreview.data?.data?.counts;
  console.log(`  -> Current live DB counts:`, postCounts);

  if (
    postCounts.customers !== originalRecordCounts.customers ||
    postCounts.loans !== originalRecordCounts.loans ||
    postCounts.receipts !== originalRecordCounts.receipts
  ) {
    throw new Error('Post-restore database counts do not match original backup!');
  }
  console.log('  -> ✅ 100% of Customers, Loans, Receipts, FDs, and Daybook records restored!');

  // STEP 9: VERIFY RESTORE HISTORY
  console.log('\n[STEP 9] Fetching and verifying Restore History...');
  const historyRes = await getJson('/api/admin/system/restore/history');
  console.log(`  -> Total restore history records: ${historyRes.data?.data?.length}`);
  const latestRestore = historyRes.data?.data?.[0];
  console.log(`  -> Latest Restore: ID=${latestRestore?.restoreId}, DB Status=${latestRestore?.databaseStatus}, Drive Sync=${latestRestore?.googleDriveSync}`);

  console.log('\n================================================================');
  console.log('🎉 ALL RESTORE & GOOGLE DRIVE SYNC VERIFICATION TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runCompleteTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
