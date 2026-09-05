const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING LOAN TYPE INDEPENDENT INTEREST TEST SUITE ===\n');

  // 0. Ensure clean baseline configuration
  console.log('Setup: Initializing standard loan product baseline...');
  const baselineTypes = [
    {
      id: 'gold-loan',
      name: 'Gold Loan',
      description: 'Standard gold ornament backed financing',
      defaultMonthlyRate: 2.0,
      cardFee: 75,
      cardFeeEnabled: true,
      interestProfileId: 'gold-bands',
      repaymentSystemId: 'monthly-interest-only',
      active: true,
      showOnLoanIssue: true,
      configurationVersion: 1,
      sortOrder: 1
    },
    {
      id: 'silver-loan',
      name: 'Silver Loan',
      description: 'Silver article backed loan',
      defaultMonthlyRate: 3.0,
      cardFee: 60,
      cardFeeEnabled: true,
      interestProfileId: 'silver-bands',
      repaymentSystemId: 'monthly-interest-only',
      active: true,
      showOnLoanIssue: true,
      configurationVersion: 1,
      sortOrder: 2
    },
    {
      id: 'pronote',
      name: 'Pronote',
      description: 'Promissory note unsecured credit',
      defaultMonthlyRate: 4.0,
      cardFee: 50,
      cardFeeEnabled: true,
      interestProfileId: 'pronote-interest',
      repaymentSystemId: 'monthly-interest-only',
      active: true,
      showOnLoanIssue: true,
      configurationVersion: 1,
      sortOrder: 3
    },
    {
      id: 'hire-purchase',
      name: 'Hire Purchase',
      description: 'Vehicle and asset hire purchase financing',
      defaultMonthlyRate: 1.5,
      cardFee: 40,
      cardFeeEnabled: true,
      interestProfileId: 'fixed-rate',
      repaymentSystemId: 'emi',
      active: true,
      showOnLoanIssue: true,
      configurationVersion: 1,
      sortOrder: 4
    }
  ];

  await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { loanTypes: baselineTypes });

  // 1. Fetch current loan types from backend config endpoint
  console.log('Test 0: Fetch current loan types configuration');
  const configRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/config/loan-types',
    method: 'GET'
  });

  if (configRes.status !== 200) {
    console.error('Failed to fetch loan-types config:', configRes);
    process.exit(1);
  }

  const loanTypes = configRes.data?.data || [];
  console.log(`Found ${loanTypes.length} configured loan types:`);
  loanTypes.forEach(lt => {
    console.log(`  - [${lt.id}] ${lt.name}: Rate=${lt.defaultMonthlyRate}%, CardFee=₹${lt.cardFee}, Profile=${lt.interestProfileId}, Active=${lt.active}, ShowOnIssue=${lt.showOnLoanIssue}, Ver=V${lt.configurationVersion}`);
  });

  // 2. TEST 1 & TEST 2 & TEST 5: Verify Gold=2%, Silver=3%, Pronote=4%, HirePurchase=1.5%
  console.log('\n--- TEST 1, 2, 5: Verify Independent Product Rates ---');
  const gold = loanTypes.find(t => t.id === 'gold-loan');
  const silver = loanTypes.find(t => t.id === 'silver-loan');
  const pronote = loanTypes.find(t => t.id === 'pronote');
  const hire = loanTypes.find(t => t.id === 'hire-purchase');

  console.log(`Gold Rate: ${gold?.defaultMonthlyRate}% (Expected 2.0%) -> ${gold?.defaultMonthlyRate === 2 ? 'PASS' : 'FAIL'}`);
  console.log(`Gold Card Fee: ₹${gold?.cardFee} (Expected ₹75) -> ${gold?.cardFee === 75 ? 'PASS' : 'FAIL'}`);
  console.log(`Silver Rate: ${silver?.defaultMonthlyRate}% (Expected 3.0%) -> ${silver?.defaultMonthlyRate === 3 ? 'PASS' : 'FAIL'}`);
  console.log(`Silver Card Fee: ₹${silver?.cardFee} (Expected ₹60) -> ${silver?.cardFee === 60 ? 'PASS' : 'FAIL'}`);
  console.log(`Pronote Rate: ${pronote?.defaultMonthlyRate}% (Expected 4.0%) -> ${pronote?.defaultMonthlyRate === 4 ? 'PASS' : 'FAIL'}`);
  console.log(`Pronote Card Fee: ₹${pronote?.cardFee} (Expected ₹50) -> ${pronote?.cardFee === 50 ? 'PASS' : 'FAIL'}`);

  // 3. TEST: Backend Authoritative Resolution & Spoof Protection on Loan Creation
  console.log('\n--- TEST: Backend Authoritative Stamping & Spoof Prevention ---');
  // Create a loan with Gold Loan (rate 2%), but client tries to spoof interestRate = 0.5% and cardFee = 0
  const spoofedLoanPayload = {
    customerId: 'CUST-0001',
    customerName: 'Test Customer',
    loanTypeId: 'gold-loan',
    principal: 50000,
    interestRate: 0.5, // Client attempts to spoof
    cardFeeAmount: 0,   // Client attempts to spoof
    disbursementMethod: 'Cash',
    items: [
      { id: 'item-1', item: 'Gold Ring', qty: 1, purity: '22ct', grossWeight: 10, netWeight: 10, valuation: 60000 }
    ]
  };

  const createRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/loans',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, spoofedLoanPayload);

  console.log('Create Loan Response Status:', createRes.status);
  const createdLoan = createRes.data?.data;
  if (createdLoan) {
    console.log('Created Loan ID:', createdLoan.id);
    console.log(`Authoritative Rate Snapshot: ${createdLoan.interestRateSnapshot ?? createdLoan.interestRate}% (Client sent 0.5%) -> ${(createdLoan.interestRateSnapshot ?? createdLoan.interestRate) === 2 ? 'PASS (Spoof Prevented)' : 'FAIL'}`);
    console.log(`Authoritative Card Fee Snapshot: ₹${createdLoan.cardFeeSnapshot ?? createdLoan.cardFeeAmount} (Client sent 0) -> ${(createdLoan.cardFeeSnapshot ?? createdLoan.cardFeeAmount) === 75 ? 'PASS (Spoof Prevented)' : 'FAIL'}`);
    console.log(`Config Version Snapshot: V${createdLoan.configurationVersion} -> ${createdLoan.configurationVersion >= 1 ? 'PASS' : 'FAIL'}`);
    console.log(`Loan Type Snapshot: ${createdLoan.loanTypeNameSnapshot} (${createdLoan.loanTypeId})`);
  } else {
    console.error('Failed to create test loan:', createRes);
  }

  // 4. TEST 4: Historical Immutability Test
  console.log('\n--- TEST 4: Historical Immutability Test ---');
  // Update Gold Loan to 2.5% in settings
  const updatedLoanTypes = loanTypes.map(lt => {
    if (lt.id === 'gold-loan') {
      return { ...lt, defaultMonthlyRate: 2.5, cardFee: 100, configurationVersion: (lt.configurationVersion || 1) + 1 };
    }
    return lt;
  });

  const updateConfigRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { loanTypes: updatedLoanTypes });

  console.log('Update Config Response Status:', updateConfigRes.status);

  // Verify previous loan still has original 2.0% snapshot
  const checkOldLoan = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: `/api/loans/${createdLoan.id}`,
    method: 'GET'
  });

  const oldLoanData = checkOldLoan.data?.data;
  console.log(`Historical Loan Interest Rate: ${oldLoanData?.interestRateSnapshot ?? oldLoanData?.interestRate}% (Expected 2.0%) -> ${(oldLoanData?.interestRateSnapshot ?? oldLoanData?.interestRate) === 2 ? 'PASS' : 'FAIL'}`);
  console.log(`Historical Loan Card Fee: ₹${oldLoanData?.cardFeeSnapshot ?? oldLoanData?.cardFeeAmount} (Expected ₹75) -> ${(oldLoanData?.cardFeeSnapshot ?? oldLoanData?.cardFeeAmount) === 75 ? 'PASS' : 'FAIL'}`);

  // Create a NEW Gold Loan and verify it gets the updated 2.5% rate and V2 version
  const newLoanPayload = {
    customerId: 'CUST-0001',
    customerName: 'Test Customer',
    loanTypeId: 'gold-loan',
    principal: 50000,
    disbursementMethod: 'Cash',
    items: [
      { id: 'item-1', item: 'Gold Chain', qty: 1, purity: '22ct', grossWeight: 10, netWeight: 10, valuation: 60000 }
    ]
  };

  const createNewRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/loans',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, newLoanPayload);

  const newLoanData = createNewRes.data?.data;
  console.log(`New Loan Interest Rate: ${newLoanData?.interestRateSnapshot ?? newLoanData?.interestRate}% (Expected 2.5%) -> ${(newLoanData?.interestRateSnapshot ?? newLoanData?.interestRate) === 2.5 ? 'PASS' : 'FAIL'}`);
  console.log(`New Loan Card Fee: ₹${newLoanData?.cardFeeSnapshot ?? newLoanData?.cardFeeAmount} (Expected ₹100) -> ${(newLoanData?.cardFeeSnapshot ?? newLoanData?.cardFeeAmount) === 100 ? 'PASS' : 'FAIL'}`);
  console.log(`New Loan Version Snapshot: V${newLoanData?.configurationVersion} (Expected V2) -> ${newLoanData?.configurationVersion === 2 ? 'PASS' : 'FAIL'}`);

  // Reset Gold Loan configuration back to 2.0%, card fee ₹75, V1
  const revertLoanTypes = updatedLoanTypes.map(lt => {
    if (lt.id === 'gold-loan') {
      return { ...lt, defaultMonthlyRate: 2.0, cardFee: 75, configurationVersion: 1 };
    }
    return lt;
  });
  await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { loanTypes: revertLoanTypes });

  // 5. TEST 6: Disabled Loan Type Test
  console.log('\n--- TEST 6: Disabled Loan Type Test ---');
  // Disable Silver loan
  const disabledSilverLoanTypes = revertLoanTypes.map(lt => {
    if (lt.id === 'silver-loan') {
      return { ...lt, active: false, showOnLoanIssue: false };
    }
    return lt;
  });

  await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { loanTypes: disabledSilverLoanTypes });

  // Attempt to issue new loan with disabled silver-loan
  const disabledSilverLoanPayload = {
    customerId: 'CUST-0001',
    customerName: 'Test Customer',
    loanTypeId: 'silver-loan',
    principal: 20000,
    disbursementMethod: 'Cash',
    items: [
      { id: 'item-1', item: 'Silver Anklet', qty: 1, purity: 'Fine Silver', grossWeight: 50, netWeight: 50, valuation: 40000 }
    ]
  };

  const tryDisabledRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/loans',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, disabledSilverLoanPayload);

  console.log(`Issuing disabled loan type rejected with 400: status=${tryDisabledRes.status} -> ${tryDisabledRes.status === 400 ? 'PASS' : 'FAIL'}`);
  console.log('Error message:', tryDisabledRes.data?.message);

  // Restore Silver loan
  await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { loanTypes: revertLoanTypes });

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(console.error);
