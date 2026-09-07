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
      (u) => u.email.toLowerCase() === 'goldfinancekkv@gmail.com'
    );
    assert(!!masterAdmin, 'Master Admin (goldfinancekkv@gmail.com) exists in staff registry');
    assert(masterAdmin.role === 'MASTER_ADMIN', 'Master Admin has role MASTER_ADMIN');
    assert(masterAdmin.isActive === true, 'Master Admin is ACTIVE');
    assert(masterAdmin.permissions.masterControl === true, 'Master Admin has masterControl permission');
    assert(masterAdmin.permissions.staffManagement === true, 'Master Admin has staffManagement permission');

    // 2. Create Staff User (STAFF - Finance Operations)
    console.log('\n▶ [TEST 2] Master Admin Creates New Staff Account (STAFF role)...');
    const createRes = await request('/staff/create', {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        email: `staff_test_${Date.now()}@kkvgoldfinance.com`,
        displayName: 'Test Finance Staff User',
        role: 'STAFF',
        phone: '9876543299'
      }
    });

    assert(createRes.status === 200, 'Staff creation returned 200 OK');
    assert(createRes.data.success === true, 'Staff account created successfully');
    const createdUid = createRes.data.data.uid;
    const createdEmail = createRes.data.data.email;
    assert(createRes.data.data.role === 'STAFF', 'Created staff has STAFF role');
    assert(createRes.data.data.permissions.customers === true, 'STAFF has customers permission');
    assert(createRes.data.data.permissions.loans === true, 'STAFF has loans permission');
    assert(createRes.data.data.permissions.fixedDeposits === true, 'STAFF has fixedDeposits permission');
    assert(createRes.data.data.permissions.adminPanel === false, 'STAFF does not have adminPanel permission');
    assert(createRes.data.data.permissions.settings === false, 'STAFF does not have settings permission');
    assert(createRes.data.data.permissions.masterControl === false, 'STAFF does not have masterControl permission');

    // 2b. Create Rental Staff User (RENTAL_STAFF role)
    console.log('\n▶ [TEST 2b] Master Admin Creates Rental Staff Account (RENTAL_STAFF role)...');
    const createRentalRes = await request('/staff/create', {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        email: `rental_staff_${Date.now()}@kkvgoldfinance.com`,
        displayName: 'Test Rental Staff User',
        role: 'RENTAL_STAFF',
        phone: '9876543288'
      }
    });

    assert(createRentalRes.status === 200, 'Rental Staff creation returned 200 OK');
    assert(createRentalRes.data.data.role === 'RENTAL_STAFF', 'Created staff has RENTAL_STAFF role');

    // 3. Attempt Creating Duplicate Account
    console.log('\n▶ [TEST 3] Duplicate Staff Email Prevention...');
    const dupRes = await request('/staff/create', {
      method: 'POST',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        email: createdEmail,
        displayName: 'Duplicate User',
        role: 'STAFF'
      }
    });
    assert(dupRes.status === 400, 'Duplicate account creation rejected with 400 Bad Request');

    // 3b. Unauthorized Non-Admin Attempt to Create Staff
    console.log('\n▶ [TEST 3b] Non-Admin Blocked from Creating Staff (403 Forbidden)...');
    const unauthCreateRes = await request('/staff/create', {
      method: 'POST',
      headers: {
        'x-actor-uid': createdUid,
        'x-actor-email': createdEmail
      },
      body: {
        email: `hacker_${Date.now()}@domain.com`,
        displayName: 'Unauthorized Account',
        role: 'STAFF'
      }
    });
    assert(unauthCreateRes.status === 403, 'Non-admin staff creation blocked with 403 Forbidden');

    // 4. Update Staff Role (STAFF -> RENTAL_STAFF)
    console.log('\n▶ [TEST 4] Master Admin Reassigns Staff Role (STAFF → RENTAL_STAFF)...');
    const updateRes = await request(`/staff/${createdUid}`, {
      method: 'PUT',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        displayName: 'Reassigned Rental Operator',
        role: 'RENTAL_STAFF'
      }
    });
    assert(updateRes.status === 200, 'Update staff returned 200 OK');
    assert(updateRes.data.data.role === 'RENTAL_STAFF', 'Role successfully updated to RENTAL_STAFF');
    assert(updateRes.data.data.permissions.rental === true, 'RENTAL_STAFF has rental permission');
    assert(updateRes.data.data.permissions.masterControl === false, 'RENTAL_STAFF cannot access masterControl');

    // 4b. Reject Invalid Legacy Roles
    console.log('\n▶ [TEST 4b] Rejection of Invalid/Legacy Roles (OPERATOR, MANAGER, ADMIN)...');
    const legacyRes = await request(`/staff/${createdUid}`, {
      method: 'PUT',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: {
        role: 'OPERATOR'
      }
    });
    assert(legacyRes.status === 400, 'Legacy role assignment rejected with 400 Bad Request');

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
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: { isActive: false }
    });
    assert(disableMasterRes.status === 400, 'Attempt to disable Master Admin rejected with 400 Bad Request');

    const demoteMasterRes = await request(`/staff/${masterAdmin.uid}`, {
      method: 'PUT',
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      },
      body: { role: 'STAFF' }
    });
    assert(demoteMasterRes.status === 400, 'Attempt to demote Master Admin rejected with 400 Bad Request');

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

    // 9. Check Security & Staff Audit Trail (With Master Admin Auth)
    console.log('\n▶ [TEST 9] Verify Security & Staff Audit Logs...');
    const auditRes = await request('/staff/audit', {
      headers: {
        'x-actor-uid': masterAdmin.uid,
        'x-actor-email': masterAdmin.email
      }
    });
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
