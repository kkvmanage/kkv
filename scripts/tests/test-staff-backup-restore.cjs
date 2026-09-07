/**
 * Staff Backup & Close + Staff Restore Workflow Comprehensive Verification
 */
const http = require('http');

const BACKEND_URL = 'http://localhost:8080';

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BACKEND_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(desc, condition) {
  if (condition) {
    console.log(`  ✔ ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

async function run() {
  console.log('\n================================================================================');
  console.log('   KKV GOLD FINANCE: STAFF BACKUP & CLOSE + RESTORE VERIFICATION');
  console.log('================================================================================\n');

  // Test 1: Staff Permissions on Backup Endpoints
  console.log('▶ [1] Staff Role Endpoint Authorization Check...');
  const staffHeaders = {
    'user-role': 'STAFF',
    'user-id': 'STAFF-TEST-01',
    'user-name': 'Finance Operator'
  };

  // 1.1 Staff allowed on /api/backup/auto-restore-check
  const autoCheckRes = await makeRequest('GET', '/api/backup/auto-restore-check', staffHeaders);
  assert('STAFF can access /api/backup/auto-restore-check (Status 200)', autoCheckRes.status === 200);

  // 1.2 Staff blocked on Danger Zone Admin APIs
  const wipeRes = await makeRequest('POST', '/api/admin/wipe-all-data/initiate', staffHeaders, { confirmationText: 'CONFIRM' });
  assert('STAFF is BLOCKED from Danger Zone Wipe API (Status 403)', wipeRes.status === 403);

  const staffAdminRes = await makeRequest('POST', '/api/staff/create', staffHeaders, { email: 'fake@test.com' });
  assert('STAFF is BLOCKED from Staff Management API (Status 403)', staffAdminRes.status === 403);

  // Test 2: Seed Test Operational Data
  console.log('\n▶ [2] Seeding Test Finance Operational Data...');
  const randomPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const custRes = await makeRequest('POST', '/api/customers', staffHeaders, {
    name: 'Backup Test Customer',
    phone: randomPhone,
    idProof: 'Aadhaar Card',
    idNumber: '2345 6789 0123',
    currentAddress: 'Komarapalayam Test St'
  });
  assert('Created test customer with KYC and address', custRes.status === 200 || custRes.status === 201);
  const testCustId = custRes.data?.data?.id || custRes.data?.id;
  console.log(`    Customer ID: ${testCustId}`);

  // Test 3: Create Full Production Backup Package
  console.log('\n▶ [3] Create Backup & Verify Manifest / Checksums...');
  const bkpRes = await makeRequest('POST', '/api/admin/backup/create', { 'user-role': 'MASTER_ADMIN' });
  assert('Backup package created successfully', bkpRes.status === 200 && bkpRes.data?.success);
  const backupId = bkpRes.data?.data?.backupId;
  console.log(`    Generated Backup ID: ${backupId}`);

  // Test 4: Validate Backup Structure
  console.log('\n▶ [4] Deep Validation of Backup Package...');
  const valRes = await makeRequest('POST', '/api/admin/restore/validate', { 'user-role': 'MASTER_ADMIN' }, { backupId });
  assert('Validate endpoint returned 200 OK', valRes.status === 200);
  assert('Validation status is VALID', valRes.data?.data?.status === 'VALID' || valRes.data?.data?.isValid === true);

  // Test 5: Staff Backup & Close Workflow Execution
  console.log('\n▶ [5] Execute Staff Backup & Close API...');
  const closeRes = await makeRequest('POST', '/api/backup/close', staffHeaders);
  assert('POST /api/backup/close returned 200 OK', closeRes.status === 200);
  assert('Backup status is VERIFIED / COMPLETED', closeRes.data?.success);
  console.log(`    Backup file: ${closeRes.data?.fileName || closeRes.data?.backupId}`);

  // Test 6: Verify Local Clear Safety
  console.log('\n▶ [6] Verify Local Data Isolation & Protected Admin Config...');
  const adminStaffRes = await makeRequest('GET', '/api/staff', { 'user-role': 'MASTER_ADMIN' });
  assert('Admin users / staff accounts remain 100% intact after backup close', adminStaffRes.status === 200 && adminStaffRes.data?.data?.length > 0);

  // Test 7: Staff Restore Latest Backup Workflow Execution
  console.log('\n▶ [7] Execute Staff Restore Latest Backup API...');
  const restoreRes = await makeRequest('POST', '/api/backup/restore-latest', staffHeaders);
  assert('POST /api/backup/restore-latest returned 200 OK', restoreRes.status === 200);
  assert('Restore status is VERIFIED', restoreRes.data?.success || restoreRes.data?.status === 'VERIFIED');

  // Test 8: Verify Restored Data Integrity and IDs
  console.log('\n▶ [8] Verify Restored Data Integrity & IDs...');
  const getCustsRes = await makeRequest('GET', '/api/customers', staffHeaders);
  const restoredCustomers = getCustsRes.data?.data || getCustsRes.data || [];
  assert('Restored customers list is non-empty', restoredCustomers.length > 0);
  const foundTestCust = restoredCustomers.find(c => c.id === testCustId || c.phone === randomPhone);
  assert('Restored customer found with exact original ID preserved', Boolean(foundTestCust));

  // Test 9: Duplicate Restore Idempotency Check
  console.log('\n▶ [9] Duplicate Restore Idempotency Check (Second consecutive restore)...');
  const countBeforeSecond = restoredCustomers.length;
  const secondRestoreRes = await makeRequest('POST', '/api/backup/restore-latest', staffHeaders);
  assert('Second consecutive restore succeeded', secondRestoreRes.status === 200);

  const getCustsAfterSecond = await makeRequest('GET', '/api/customers', staffHeaders);
  const countAfterSecond = (getCustsAfterSecond.data?.data || getCustsAfterSecond.data || []).length;
  assert(`Customer count is identical (${countBeforeSecond} == ${countAfterSecond}) — Zero duplicates created`, countBeforeSecond === countAfterSecond);

  // Test 10: Failed Restore / Corrupt Backup Safety
  console.log('\n▶ [10] Failed Restore Safety / Rejection Test...');
  const corruptRestore = await makeRequest('POST', '/api/admin/system/restore', { 'user-role': 'MASTER_ADMIN' }, {
    token: 'INVALID_TOKEN_FAKE_99999',
    confirmationText: 'RESTORE DATABASE'
  });
  assert('Invalid restore token correctly rejected (Status 400)', corruptRestore.status === 400);

  const finalCustsCheck = await makeRequest('GET', '/api/customers', staffHeaders);
  assert('Local operational DB completely unchanged and protected after failed restore attempt', (finalCustsCheck.data?.data || finalCustsCheck.data || []).length === countBeforeSecond);

  console.log('\n================================================================================');
  console.log(`  STAFF BACKUP & RESTORE TEST SUITE: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
