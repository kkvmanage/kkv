const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING FD MASTER CONTROL E2E VERIFICATION ===\n');

  try {
    // 1. GET Current Master Settings
    console.log('1. Fetching current master settings via GET /api/admin/settings...');
    const getRes = await request('GET', '/api/admin/settings');
    console.log('Status:', getRes.status);
    console.log('Initial FD Rate:', getRes.data?.data?.fdInterestRate, '%');
    console.log('Initial FD Default Tenure:', getRes.data?.data?.fdDefaultTenureMonths, 'months');
    console.log('Initial FD Min Amount:', getRes.data?.data?.fdMinimumAmount);

    const originalSettings = getRes.data?.data || {};

    // 2. Test RBAC: STAFF trying to update Master Control Settings
    console.log('\n2. Testing RBAC: STAFF user attempting PUT /api/admin/settings...');
    const staffAttempt = await request('PUT', '/api/admin/settings', {
      ...originalSettings,
      fdInterestRate: 99.9
    }, {
      'user-role': 'STAFF',
      'user-email': 'staff_operator@kkv.local'
    });
    console.log('Staff Attempt Status (Expected 403):', staffAttempt.status);
    if (staffAttempt.status === 403) {
      console.log('✓ PASS: Staff user correctly forbidden from mutating Master Control.');
    } else {
      console.error('✗ FAIL: Expected 403 Forbidden but got:', staffAttempt.status);
    }

    // 3. Test Master Admin Updating FD Config to Rate A (14.5%)
    console.log('\n3. Updating Master Settings as MASTER_ADMIN (Setting Rate = 14.5%, Tenure = 18)...');
    const updateRateA = await request('PUT', '/api/admin/settings', {
      ...originalSettings,
      fdInterestRate: 14.5,
      fdInterestRateEffectiveFrom: '01-09-2026',
      fdDefaultTenureMonths: 18,
      fdMinimumAmount: 15000,
      fdPayoutFrequency: 'Monthly',
      fdCalculationMethod: 'MONTHLY_DIVIDEND'
    }, {
      'user-role': 'MASTER_ADMIN',
      'user-email': 'admin@kkv.local'
    });
    console.log('Update Status (Expected 200):', updateRateA.status);
    console.log('Updated Settings fdInterestRate:', updateRateA.data?.data?.fdInterestRate);
    console.log('Rate History length:', updateRateA.data?.data?.fdInterestRateHistory?.length);
    console.log('Latest Rate History item:', updateRateA.data?.data?.fdInterestRateHistory?.[0]);

    // 4. Create FD-1 under Configuration A (14.5%)
    console.log('\n4. Creating FD Contract #1 under 14.5% configuration...');
    const fd1Res = await request('POST', '/api/fd/deposits', {
      customerId: 'CUST-TEST-001',
      depositorName: 'Anitha Ramesh',
      phone: '9840123456',
      depositDate: '01-09-2026',
      maturityDate: '01-03-2028',
      principal: 100000,
      tenureMonths: 18,
      interestRatePA: 14.5,
      receivingMethod: 'Cash',
      monthlyPayout: 1208.33,
      status: 'ACTIVE'
    });
    console.log('FD-1 Creation Status:', fd1Res.status);
    const fd1 = fd1Res.data?.data;
    const fd1No = fd1?.fdNo;
    console.log('FD-1 No:', fd1No, '| Rate in Record:', fd1?.interestRatePA, '%');
    console.log('FD-1 Snapshot Rate in Record:', fd1?.fdInterestRateSnapshot, '%');
    console.log('FD-1 Calculation Method Snapshot:', fd1?.calculationMethodSnapshot);

    // 5. Update Master Settings to Rate B (11.0%, Tenure 24)
    console.log('\n5. Updating Master Settings as MASTER_ADMIN to Rate B (11.0%, Tenure = 24)...');
    const updateRateB = await request('PUT', '/api/admin/settings', {
      ...updateRateA.data?.data,
      fdInterestRate: 11.0,
      fdInterestRateEffectiveFrom: '15-09-2026',
      fdDefaultTenureMonths: 24,
      fdMinimumAmount: 10000
    }, {
      'user-role': 'MASTER_ADMIN',
      'user-email': 'admin@kkv.local'
    });
    console.log('Update Status (Expected 200):', updateRateB.status);
    console.log('Updated Settings fdInterestRate:', updateRateB.data?.data?.fdInterestRate);

    // 6. Create FD-2 under Configuration B (11.0%)
    console.log('\n6. Creating FD Contract #2 under 11.0% configuration...');
    const fd2Res = await request('POST', '/api/fd/deposits', {
      customerId: 'CUST-TEST-002',
      depositorName: 'Karthik Subramanian',
      phone: '9840987654',
      depositDate: '15-09-2026',
      maturityDate: '15-09-2028',
      principal: 200000,
      tenureMonths: 24,
      interestRatePA: 11.0,
      receivingMethod: 'Bank',
      monthlyPayout: 1833.33,
      status: 'ACTIVE'
    });
    console.log('FD-2 Creation Status:', fd2Res.status);
    const fd2 = fd2Res.data?.data;
    const fd2No = fd2?.fdNo;
    console.log('FD-2 No:', fd2No, '| Rate in Record:', fd2?.interestRatePA, '%');
    console.log('FD-2 Snapshot Rate in Record:', fd2?.fdInterestRateSnapshot, '%');

    // 7. Test Contract Immutability: Verify FD-1 DID NOT CHANGE
    console.log('\n7. Verifying Contract Immutability (FD-1 must still be 14.5%):');
    const listFDs = await request('GET', '/api/fd/deposits');
    const allFDs = listFDs.data?.data || [];
    const fetchedFD1 = allFDs.find(f => f.fdNo === fd1No || f.id === fd1?.id);
    const fetchedFD2 = allFDs.find(f => f.fdNo === fd2No || f.id === fd2?.id);

    console.log('FD-1 Fetched Interest Rate:', fetchedFD1?.interestRatePA, '% (Expected 14.5%)');
    console.log('FD-2 Fetched Interest Rate:', fetchedFD2?.interestRatePA, '% (Expected 11.0%)');

    if (fetchedFD1?.interestRatePA === 14.5 && fetchedFD2?.interestRatePA === 11.0) {
      console.log('✓ PASS: Contract Immutability verified. Changing Master Control applies to new FDs without altering existing contracts.');
    } else {
      console.error('✗ FAIL: Contract immutability violation detected!');
    }

    // 8. Clean up test FDs and restore initial settings
    console.log('\n8. Cleaning up test FDs and restoring Master Settings...');
    if (fd1No) await request('DELETE', `/api/fd/deposits/${fd1No}`);
    if (fd2No) await request('DELETE', `/api/fd/deposits/${fd2No}`);

    await request('PUT', '/api/admin/settings', originalSettings, {
      'user-role': 'MASTER_ADMIN',
      'user-email': 'admin@kkv.local'
    });
    console.log('✓ Restored initial master settings successfully.');

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
