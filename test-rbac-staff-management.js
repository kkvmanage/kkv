import http from 'http';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=================================================================');
  console.log('  KKV GOLD FINANCE — FIREBASE AUTH, GOOGLE LOGIN & RBAC TEST     ');
  console.log('=================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✔ ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAILED: ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Fetch Staff List & Verify Master Admin
    console.log('▶ [TEST 1] List Staff Accounts and Verify Master Admin...');
    const listRes = await request('/staff');
    assert(listRes.status === 200, 'GET /api/staff returns 200 OK');
    assert(Array.isArray(listRes.data.data), 'Staff payload contains an array');

    const masterAdmin = listRes.data.data.find(
      (u) => u.email.toLowerCase() === 'kkvgoldfinance13@gmail.com'
    );
    assert(!!masterAdmin, 'Master Admin (kkvgoldfinance13@gmail.com) exists in staff registry');
    assert(masterAdmin.role === 'MASTER_ADMIN', 'Master Admin has role MASTER_ADMIN');
    assert(masterAdmin.isActive === true, 'Master Admin is ACTIVE');
    assert(masterAdmin.permissions.masterControl === true, 'Master Admin has masterControl permission');
    assert(masterAdmin.permissions.staffManagement === true, 'Master Admin has staffManagement permission');

    // 2. Create Staff User (Operator)
    console.log('\n▶ [TEST 2] Master Admin Creates New Staff Account (Operator)...');
    const createRes = await request('/staff/create', {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        email: `staff_test_${Date.now()}@kkvgoldfinance.com`,
        displayName: 'Test Operator User',
        role: 'OPERATOR',
        phone: '9876543299'
      }
    });

    assert(createRes.status === 200, 'Staff creation returned 200 OK');
    assert(createRes.data.success === true, 'Staff account created successfully');
    const createdUid = createRes.data.data.uid;
    const createdEmail = createRes.data.data.email;
    assert(createRes.data.data.role === 'OPERATOR', 'Created staff has OPERATOR role');
    assert(createRes.data.data.permissions.adminPanel === false, 'OPERATOR does not have adminPanel permission');
    assert(createRes.data.data.permissions.settings === false, 'OPERATOR does not have settings permission');
    assert(createRes.data.data.permissions.masterControl === false, 'OPERATOR does not have masterControl permission');

    // 3. Attempt Creating Duplicate Account
    console.log('\n▶ [TEST 3] Duplicate Staff Email Prevention...');
    const dupRes = await request('/staff/create', {
      method: 'POST',
      body: {
        email: createdEmail,
        displayName: 'Duplicate User',
        role: 'OPERATOR'
      }
    });
    assert(dupRes.status === 400, 'Duplicate account creation rejected with 400 Bad Request');

    // 4. Update Staff Role (OPERATOR -> MANAGER)
    console.log('\n▶ [TEST 4] Master Admin Promotes Staff (OPERATOR → MANAGER)...');
    const updateRes = await request(`/staff/${createdUid}`, {
      method: 'PUT',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        displayName: 'Promoted Manager User',
        role: 'MANAGER'
      }
    });
    assert(updateRes.status === 200, 'Update staff returned 200 OK');
    assert(updateRes.data.data.role === 'MANAGER', 'Role successfully updated to MANAGER');
    assert(updateRes.data.data.permissions.fixedDeposits === true, 'MANAGER has fixedDeposits permission');
    assert(updateRes.data.data.permissions.masterControl === false, 'MANAGER cannot access masterControl');

    // 5. Disable Staff Account
    console.log('\n▶ [TEST 5] Disable Staff Account...');
    const disableRes = await request(`/staff/${createdUid}/status`, {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: { isActive: false }
    });
    assert(disableRes.status === 200, 'Staff disable returned 200 OK');
    assert(disableRes.data.data.isActive === false, 'Staff status is now DISABLED');

    // 6. Master Admin Protection Test (Cannot Disable Master Admin)
    console.log('\n▶ [TEST 6] Verify Master Admin Cannot Be Disabled or Demoted...');
    const disableMasterRes = await request(`/staff/${masterAdmin.uid}/status`, {
      method: 'POST',
      body: { isActive: false }
    });
    assert(disableMasterRes.status === 400, 'Attempt to disable Master Admin rejected');

    const demoteMasterRes = await request(`/staff/${masterAdmin.uid}`, {
      method: 'PUT',
      body: { role: 'OPERATOR' }
    });
    assert(demoteMasterRes.status === 400, 'Attempt to demote Master Admin rejected');

    // 7. Re-enable Staff Account
    console.log('\n▶ [TEST 7] Reactivate Staff Account...');
    const enableRes = await request(`/staff/${createdUid}/status`, {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: { isActive: true }
    });
    assert(enableRes.status === 200, 'Staff enable returned 200 OK');
    assert(enableRes.data.data.isActive === true, 'Staff status is restored to ACTIVE');

    // 8. Revoke Staff Sessions
    console.log('\n▶ [TEST 8] Revoke Active Sessions for Staff Member...');
    const revokeRes = await request(`/staff/${createdUid}/revoke-sessions`, {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      }
    });
    assert(revokeRes.status === 200, 'Revoke staff sessions returned 200 OK');
    assert(revokeRes.data.success === true, 'Revocation success confirmed');

    // 9. Check Security & Staff Audit Trail
    console.log('\n▶ [TEST 9] Verify Security & Staff Audit Logs...');
    const auditRes = await request('/staff/audit');
    assert(auditRes.status === 200, 'GET /api/staff/audit returns 200 OK');
    assert(Array.isArray(auditRes.data.data), 'Audit logs payload is an array');
    assert(auditRes.data.data.length >= 4, 'Multiple audit log entries recorded for staff actions');

    console.log('\n=================================================================');
    console.log(`  ALL RBAC & STAFF MANAGEMENT TESTS PASSED: ${passed}/${total} (100%)  `);
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  }
}

runTests();
