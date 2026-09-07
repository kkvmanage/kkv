const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body, rawBody: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING FD CONFIGURATION MASTER CONTROL VERIFICATION ===\n');

  // 1. Check Master Settings Endpoint
  console.log('[Step 1] Fetching current Master Settings via /api/admin/settings...');
  const settingsRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'GET'
  });
  console.log(`Status: ${settingsRes.status}`);
  const sData = settingsRes.body?.data || settingsRes.body;
  console.log('FD Settings:', {
    fdInterestRate: sData?.fdInterestRate,
    fdDefaultTenureMonths: sData?.fdDefaultTenureMonths,
    fdMinimumAmount: sData?.fdMinimumAmount,
    fdCalculationMethod: sData?.fdCalculationMethod,
    configurationVersion: sData?.configurationVersion
  });

  if (settingsRes.status !== 200) {
    throw new Error('Failed to fetch master settings');
  }

  // 2. Test Staff Mutation Rejection (RBAC) on /api/admin/settings
  console.log('\n[Step 2] Testing Staff RBAC Rejection for Master Settings update (/api/admin/settings)...');
  const staffAttempt1 = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'user-role': 'STAFF'
    }
  }, {
    fdInterestRate: 99
  });
  console.log(`Staff PUT Status: ${staffAttempt1.status} (Expected: 403)`);
  if (staffAttempt1.status !== 403) {
    throw new Error(`Staff mutation on /api/admin/settings returned ${staffAttempt1.status} instead of 403`);
  }
  console.log('✓ Staff update blocked with 403 Forbidden on /api/admin/settings');

  // Also test /api/fd/config RBAC
  console.log('\n[Step 2b] Testing Staff RBAC Rejection on /api/fd/config...');
  const staffAttempt2 = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/fd/config',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'user-role': 'STAFF'
    }
  }, {
    fdInterestRate: 99
  });
  console.log(`Staff PUT /api/fd/config Status: ${staffAttempt2.status} (Expected: 403)`);
  if (staffAttempt2.status !== 403) {
    throw new Error(`Staff mutation on /api/fd/config returned ${staffAttempt2.status} instead of 403`);
  }
  console.log('✓ Staff update blocked with 403 Forbidden on /api/fd/config');

  // 3. Test Master Admin update of FD Configuration
  console.log('\n[Step 3] Master Admin updating FD Configuration (Rate=15%, Tenure=12, Min=5000)...');
  const updateRes1 = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'user-role': 'MASTER_ADMIN'
    }
  }, {
    fdInterestRate: 15,
    fdDefaultTenureMonths: 12,
    fdMinimumAmount: 5000,
    fdCalculationMethod: 'MONTHLY_DIVIDEND',
    fdAllowedTenures: [6, 12, 24, 36, 60]
  });
  console.log(`Update Status: ${updateRes1.status}`);
  const u1Data = updateRes1.body?.data || updateRes1.body;
  console.log('Updated Settings:', {
    fdInterestRate: u1Data?.fdInterestRate,
    fdDefaultTenureMonths: u1Data?.fdDefaultTenureMonths,
    fdMinimumAmount: u1Data?.fdMinimumAmount,
    fdCalculationMethod: u1Data?.fdCalculationMethod,
    version: u1Data?.configurationVersion
  });

  // 4. Create an FD Customer for test deposits
  console.log('\n[Step 4] Creating Test FD Customer...');
  const custRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/fd/customers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'FD Test Customer ' + Date.now().toString().slice(-4),
    phone: '98' + Math.floor(10000000 + Math.random() * 90000000),
    address: '123 Test Street'
  });
  const cData = custRes.body?.data || custRes.body;
  const customerId = cData?.id;
  const customerName = cData?.name;
  console.log(`FD Customer created: ${customerId} (${customerName})`);

  // 5. Create FD Contract #1 under Rate = 15% (Staff creates deposit without supplying custom rate)
  console.log('\n[Step 5] Creating FD #1 (Deposit Amount: 10,000)...');
  const fd1Res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/fd/deposits',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    customerId,
    depositorName: customerName,
    phone: '9876543210',
    principal: 10000,
    depositDate: '01/09/2026',
    maturityDate: '01/09/2027',
    receivingMethod: 'Cash',
    nomineeName: 'Jane Doe',
    nomineeRelationship: 'Spouse'
  });
  console.log(`FD #1 Create Status: ${fd1Res.status}`);
  const fd1 = fd1Res.body?.data || fd1Res.body;
  console.log('FD #1 Contract Snapshot:', {
    fdNo: fd1?.fdNo,
    principal: fd1?.principal,
    interestRatePA: fd1?.interestRatePA,
    fdInterestRateSnapshot: fd1?.fdInterestRateSnapshot,
    tenureMonths: fd1?.tenureMonths,
    calculationMethodSnapshot: fd1?.calculationMethodSnapshot,
    configurationVersion: fd1?.configurationVersion
  });

  // 6. Master Admin changes FD Configuration to Rate = 12.5%, Tenure = 24
  console.log('\n[Step 6] Master Admin changing Master FD Config to Rate = 12.5%, Tenure = 24...');
  const updateRes2 = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'user-role': 'MASTER_ADMIN'
    }
  }, {
    fdInterestRate: 12.5,
    fdDefaultTenureMonths: 24,
    fdMinimumAmount: 10000,
    fdCalculationMethod: 'MONTHLY_PAYOUT'
  });
  console.log(`Update Status: ${updateRes2.status}`);
  const u2Data = updateRes2.body?.data || updateRes2.body;
  console.log('Updated Settings:', {
    fdInterestRate: u2Data?.fdInterestRate,
    fdDefaultTenureMonths: u2Data?.fdDefaultTenureMonths,
    version: u2Data?.configurationVersion
  });

  // 7. Create FD Contract #2 under Rate = 12.5%
  console.log('\n[Step 7] Creating FD #2 (Deposit Amount: 20,000)...');
  const fd2Res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/fd/deposits',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    customerId,
    depositorName: customerName,
    phone: '9876543210',
    principal: 20000,
    depositDate: '01/09/2026',
    maturityDate: '01/09/2028',
    receivingMethod: 'Bank',
    nomineeName: 'Bob Doe',
    nomineeRelationship: 'Child'
  });
  console.log(`FD #2 Create Status: ${fd2Res.status}`);
  const fd2 = fd2Res.body?.data || fd2Res.body;
  console.log('FD #2 Contract Snapshot:', {
    fdNo: fd2?.fdNo,
    principal: fd2?.principal,
    interestRatePA: fd2?.interestRatePA,
    fdInterestRateSnapshot: fd2?.fdInterestRateSnapshot,
    tenureMonths: fd2?.tenureMonths,
    calculationMethodSnapshot: fd2?.calculationMethodSnapshot,
    configurationVersion: fd2?.configurationVersion
  });

  // 8. Verify Immutability of FD #1 vs FD #2
  console.log('\n[Step 8] Verifying Immutability: Fetching all FDs from /api/fd/deposits...');
  const allFdsRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/fd/deposits',
    method: 'GET'
  });
  const allDeposits = allFdsRes.body?.data || allFdsRes.body || [];
  const fetchedFd1 = allDeposits.find((f) => f.id === fd1.id || f.fdNo === fd1.fdNo);
  const fetchedFd2 = allDeposits.find((f) => f.id === fd2.id || f.fdNo === fd2.fdNo);

  console.log('FD #1 State (Contract 1):', {
    fdNo: fetchedFd1?.fdNo,
    interestRatePA: fetchedFd1?.interestRatePA,
    tenureMonths: fetchedFd1?.tenureMonths,
    snapshotRate: fetchedFd1?.fdInterestRateSnapshot,
    version: fetchedFd1?.configurationVersion
  });
  console.log('FD #2 State (Contract 2):', {
    fdNo: fetchedFd2?.fdNo,
    interestRatePA: fetchedFd2?.interestRatePA,
    tenureMonths: fetchedFd2?.tenureMonths,
    snapshotRate: fetchedFd2?.fdInterestRateSnapshot,
    version: fetchedFd2?.configurationVersion
  });

  const fd1MaintainedRate = fetchedFd1?.interestRatePA === 15;
  const fd2AppliedNewRate = fetchedFd2?.interestRatePA === 12.5;

  if (fd1MaintainedRate && fd2AppliedNewRate) {
    console.log('\n✅ IMMUTABILITY TEST PASSED: Existing FD retained 15% rate; New FD received 12.5% rate.');
  } else {
    throw new Error(`Immutability test failed: FD1 Rate=${fetchedFd1?.interestRatePA} (expected 15), FD2 Rate=${fetchedFd2?.interestRatePA} (expected 12.5)`);
  }

  // 9. Check Rate History Audit Trail
  console.log('\n[Step 9] Checking FD Rate History in Master Settings...');
  const finalSettingsRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'GET'
  });
  const finalSettings = finalSettingsRes.body?.data || finalSettingsRes.body;
  console.log('Rate History Entries:', finalSettings?.fdInterestRateHistory?.length || 0);
  if (finalSettings?.fdInterestRateHistory && finalSettings.fdInterestRateHistory.length > 0) {
    finalSettings.fdInterestRateHistory.slice(0, 5).forEach((h, i) => {
      console.log(`  ${i + 1}. [${h.effectiveFrom || h.changedAt}] Rate: ${h.rate}% (Changed by: ${h.changedBy})`);
    });
  }

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED AND PASSED PERFECTLY ===');
}

runTests().catch(console.error);
