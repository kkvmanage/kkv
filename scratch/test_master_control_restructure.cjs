const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING MASTER CONTROL RESTRUCTURE INTEGRATION TESTS ===\n');

  try {
    // 1. Fetch Master Control Settings
    console.log('1. Testing GET /api/admin/master-settings...');
    const masterRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/settings',
      method: 'GET'
    });

    console.log('Master Settings Response Status:', masterRes.status);
    const settings = masterRes.body.data || masterRes.body;
    console.log('Master Control Settings:', {
      goldRate22ct: settings.goldRate22ct,
      goldLoanMonthlyRate: settings.goldLoanMonthlyRate,
      defaultCardFee: settings.defaultCardFee,
      fdInterestRate: settings.fdInterestRate,
      fdDefaultTenureMonths: settings.fdDefaultTenureMonths,
      fdMinimumAmount: settings.fdMinimumAmount,
      fdRenewalPolicy: settings.fdRenewalPolicy,
      fdCalculationMethod: settings.fdCalculationMethod,
      configurationVersion: settings.configurationVersion
    });

    if (
      settings.goldRate22ct === undefined ||
      settings.fdInterestRate === undefined ||
      settings.fdDefaultTenureMonths === undefined ||
      settings.fdMinimumAmount === undefined ||
      settings.configurationVersion === undefined
    ) {
      throw new Error('Master control settings missing essential restructuring fields');
    }
    console.log('✔ Master settings retrieval verified.\n');

    // 2. Update Master Settings and verify configurationVersion increments
    console.log('2. Testing PUT /api/admin/settings (Updating FD & Loan rates)...');
    const initialVersion = settings.configurationVersion || 1;
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'MASTER_ADMIN'
      }
    }, {
      goldRate22ct: 6850,
      goldLoanMonthlyRate: 1.5,
      defaultCardFee: 25,
      fdInterestRate: 12.5,
      fdDefaultTenureMonths: 12,
      fdMinimumAmount: 5000,
      fdRenewalPolicy: 'AUTO_RENEW_PRINCIPAL_ONLY',
      fdCalculationMethod: 'SIMPLE_MONTHLY'
    });

    console.log('Update Status:', updateRes.status);
    const updatedSettings = updateRes.body.data || updateRes.body;
    console.log('New Configuration Version:', updatedSettings.configurationVersion);
    if (updatedSettings.configurationVersion <= initialVersion) {
      console.warn('Note: Version did not increment because values may match existing, testing with changed values...');
      const updateRes2 = await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/admin/settings',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'MASTER_ADMIN'
        }
      }, {
        ...updatedSettings,
        fdInterestRate: updatedSettings.fdInterestRate === 12.5 ? 13.0 : 12.5
      });
      const updated2 = updateRes2.body.data || updateRes2.body;
      console.log('Updated version after explicit rate change:', updated2.configurationVersion);
      if (updated2.configurationVersion <= initialVersion) {
        throw new Error('Version failed to increment after master control financial change');
      }
    }
    console.log('✔ Master control update and versioning verified.\n');

    // 3. Test Fixed Deposit validation (< minimum amount)
    console.log('3. Testing Fixed Deposit creation with amount below minimum (₹1,000 < ₹5,000)...');
    const invalidFdRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/fd/deposits',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN'
      }
    }, {
      customerId: 'CUST-001',
      depositorName: 'Test Depositor',
      phone: '9876543210',
      principal: 1000, // below 5000
      tenureMonths: 12,
      receivingMethod: 'Cash'
    });

    console.log('Invalid FD creation status:', invalidFdRes.status);
    if (invalidFdRes.status !== 400) {
      throw new Error(`Expected status 400 for deposit below minimum amount, got ${invalidFdRes.status}`);
    }
    console.log('✔ Fixed deposit minimum amount validation rejected as expected.\n');

    // 4. Test Valid Fixed Deposit creation with Master Defaults Resolution & Contractual Snapshots
    console.log('4. Testing Valid Fixed Deposit creation...');
    const validFdRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/fd/deposits',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN'
      }
    }, {
      customerId: 'CUST-001',
      depositorName: 'Master Test Depositor',
      phone: '9876543210',
      principal: 100000,
      receivingMethod: 'Bank'
    });

    console.log('Valid FD creation status:', validFdRes.status);
    const createdFd = validFdRes.body.data || validFdRes.body;
    console.log('Created FD Contract Snapshots:', {
      fdNo: createdFd.fdNo,
      principal: createdFd.principal,
      interestRatePA: createdFd.interestRatePA,
      fdInterestRateSnapshot: createdFd.fdInterestRateSnapshot,
      fdTenureSnapshot: createdFd.fdTenureSnapshot,
      calculationMethodSnapshot: createdFd.calculationMethodSnapshot,
      minimumAmountSnapshot: createdFd.minimumAmountSnapshot,
      configurationVersion: createdFd.configurationVersion,
      monthlyPayout: createdFd.monthlyPayout
    });

    if (
      !createdFd.fdInterestRateSnapshot ||
      !createdFd.fdTenureSnapshot ||
      !createdFd.calculationMethodSnapshot ||
      !createdFd.configurationVersion
    ) {
      throw new Error('Created FD is missing immutable contractual snapshot fields');
    }
    console.log('✔ Fixed deposit created with complete immutable contractual snapshots.\n');

    // 5. Test Loan Issue inheritance and snapshot stamping
    console.log('5. Testing Loan creation inheriting Master Control defaults...');
    const loanRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/loans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN'
      }
    }, {
      customerId: 'CUST-001',
      customerName: 'Master Loan Customer',
      customerPhone: '9876543210',
      loanType: 'gold-loan',
      principal: 50000,
      bankMode: 'Cash',
      date: '05-09-2026',
      grossWeight: 10,
      netWeight: 9.5,
      items: [{ item: 'Gold Ring', purity: '22K', count: 1, grossWeight: 10, netWeight: 9.5 }],
      repaymentType: 'monthly-interest-only'
    });

    console.log('Loan creation status:', loanRes.status);
    if (loanRes.status !== 201) {
      console.error('Loan creation failure body:', loanRes.body);
      throw new Error(`Expected status 201 for loan creation, got ${loanRes.status}`);
    }
    const createdLoan = loanRes.body.data || loanRes.body;
    console.log('Created Loan Snapshots:', {
      loanNo: createdLoan.loanNo,
      principalAmount: createdLoan.principalAmount,
      interestRate: createdLoan.interestRate,
      cardFee: createdLoan.cardFee,
      cardFeeSnapshot: createdLoan.cardFeeSnapshot,
      configurationVersion: createdLoan.configurationVersion
    });

    if (!createdLoan.cardFeeSnapshot || !createdLoan.configurationVersion) {
      throw new Error('Created loan is missing snapshot fields');
    }
    console.log('✔ Loan creation verified with Master defaults.\n');

    // 6. Test Immutability: Update Master Control again and verify earlier FD snapshots remain unchanged
    console.log('6. Testing Immutability: Altering Master Control settings...');
    await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'MASTER_ADMIN'
      }
    }, {
      goldRate22ct: 7000,
      goldLoanMonthlyRate: 2.0,
      defaultCardFee: 50,
      fdInterestRate: 15.0,
      fdDefaultTenureMonths: 24,
      fdMinimumAmount: 10000,
      fdRenewalPolicy: 'AUTO_RENEW_PRINCIPAL_ONLY',
      fdCalculationMethod: 'SIMPLE_MONTHLY'
    });

    const fdCheckRes = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/fd/deposits',
      method: 'GET'
    });

    const fdList = fdCheckRes.body.data || fdCheckRes.body;
    const historicalFd = fdList.find(f => f.id === createdFd.id || f.fdNo === createdFd.fdNo);
    console.log('Historical FD after Master update:', {
      fdNo: historicalFd.fdNo,
      interestRatePA: historicalFd.interestRatePA,
      fdInterestRateSnapshot: historicalFd.fdInterestRateSnapshot,
      fdTenureSnapshot: historicalFd.fdTenureSnapshot,
      configurationVersion: historicalFd.configurationVersion
    });

    if (
      historicalFd.fdInterestRateSnapshot !== createdFd.fdInterestRateSnapshot ||
      historicalFd.interestRatePA !== createdFd.interestRatePA
    ) {
      throw new Error('Historical FD contract snapshot was mutated by a master control update!');
    }
    console.log('✔ Immutability verified: historical contracts remain perfectly preserved.\n');

    console.log('====================================================');
    console.log('ALL MASTER CONTROL RESTRUCTURE TESTS PASSED 100%!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
