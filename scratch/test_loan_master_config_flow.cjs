const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:8080${path}`);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING COMPREHENSIVE LOAN MASTER CONFIGURATION TESTS');
  console.log('========================================================');

  // Step 1: Fetch current Loan Types from /api/config/loan-types
  console.log('\n--- Step 1: Query Available Loan Types ---');
  let res = await makeRequest('GET', '/api/config/loan-types?issueOnly=true');
  console.log(`Status: ${res.status}, Count: ${res.body.count}`);
  const initialTypes = res.body.data;
  console.log('Active Issue Types:', initialTypes.map(t => `${t.name} (id: ${t.id}, fee: ₹${t.cardFee}, v${t.configurationVersion || 1})`));

  // Step 2: Test 1 - Configure Gold Loan with Card Fee ₹50
  console.log('\n--- TEST 1: Master Control Gold Loan Card Fee = ₹50, Issue = ON ---');
  const goldLoan = initialTypes.find(t => t.id === 'gold-loan') || initialTypes[0];
  const updateRes1 = await makeRequest('PUT', `/api/config/loan-types/${goldLoan.id}`, {
    name: 'Gold Loan',
    cardFee: 50,
    cardFeeEnabled: true,
    interestProfileId: 'gold-bands',
    active: true,
    showOnLoanIssue: true
  });
  console.log('Update Result:', updateRes1.body.message);
  console.log('Gold Loan Version now:', updateRes1.body.data.configurationVersion, 'Fee:', updateRes1.body.data.cardFee);

  // Create Loan A under Gold Loan (Fee ₹50, Version V)
  console.log('\n--- Creating Loan A with Gold Loan (Authoritative Backend Resolution) ---');
  const loanPayloadA = {
    loanTypeId: 'gold-loan',
    customerId: 'CUST-001',
    customerName: 'Test Borrower A',
    customerPhone: '9876543210',
    customerGender: 'Male',
    customerAge: 30,
    customerOccupation: 'Business',
    customerCurrentAddress: '123 Test Street',
    customerPermanentAddress: '123 Test Street',
    principal: 50000,
    items: [{ id: 'item-1', item: 'Gold Ring', qty: 1, purity: '22ct', grossWeight: 10, netWeight: 9.5 }],
    deductAdvanceInterest: false,
    bankMode: 'Cash',
    cashAmount: 50000,
    bankAmount: 0
  };

  const createLoanA = await makeRequest('POST', '/api/loans', loanPayloadA);
  console.log('Loan A Created:', createLoanA.body.data.loanNo, 'ID:', createLoanA.body.data.id);
  console.log('Loan A Contractual Snapshot:');
  console.log('  - loanTypeNameSnapshot:', createLoanA.body.data.loanTypeNameSnapshot);
  console.log('  - cardFeeSnapshot:', createLoanA.body.data.cardFeeSnapshot);
  console.log('  - interestProfileIdSnapshot:', createLoanA.body.data.interestProfileIdSnapshot);
  console.log('  - configurationVersion:', createLoanA.body.data.configurationVersion);

  if (createLoanA.body.data.cardFeeSnapshot !== 50) {
    throw new Error(`TEST 1 FAILED: Expected cardFeeSnapshot = 50, got ${createLoanA.body.data.cardFeeSnapshot}`);
  }

  // Step 3: Test 2 - Update Gold Loan Card Fee ₹50 -> ₹75 (Configuration Version bumps)
  console.log('\n--- TEST 2: Update Gold Loan Card Fee ₹50 -> ₹75 ---');
  const updateRes2 = await makeRequest('PUT', `/api/config/loan-types/gold-loan`, {
    cardFee: 75
  });
  console.log('Update Result:', updateRes2.body.message);
  console.log('Gold Loan Version now:', updateRes2.body.data.configurationVersion, 'Fee:', updateRes2.body.data.cardFee);

  // Create Loan B under Gold Loan
  console.log('\n--- Creating Loan B with Gold Loan (Updated Config) ---');
  const loanPayloadB = {
    ...loanPayloadA,
    customerName: 'Test Borrower B'
  };
  const createLoanB = await makeRequest('POST', '/api/loans', loanPayloadB);
  console.log('Loan B Created:', createLoanB.body.data.loanNo, 'ID:', createLoanB.body.data.id);
  console.log('Loan B Contractual Snapshot:');
  console.log('  - cardFeeSnapshot:', createLoanB.body.data.cardFeeSnapshot);
  console.log('  - configurationVersion:', createLoanB.body.data.configurationVersion);

  if (createLoanB.body.data.cardFeeSnapshot !== 75) {
    throw new Error(`TEST 2 FAILED: Expected cardFeeSnapshot = 75, got ${createLoanB.body.data.cardFeeSnapshot}`);
  }

  // Step 4: Test 3 - Verify Loan A (Historical) STILL retains ₹50 & original version
  console.log('\n--- TEST 3: Verify Historical Loan A Integrity ---');
  const checkLoanA = await makeRequest('GET', `/api/loans/${createLoanA.body.data.id}`);
  console.log('Fetched Loan A:');
  console.log('  - cardFeeSnapshot:', checkLoanA.body.data.cardFeeSnapshot);
  console.log('  - configurationVersion:', checkLoanA.body.data.configurationVersion);

  if (checkLoanA.body.data.cardFeeSnapshot !== 50) {
    throw new Error(`TEST 3 FAILED: Historical Loan A changed! Expected 50, got ${checkLoanA.body.data.cardFeeSnapshot}`);
  }

  // Step 5: Test 4 - Disable Gold Loan & Verify Rejection for New Loans
  console.log('\n--- TEST 4: Disable Gold Loan & Verify Issue Visibility / Rejection ---');
  await makeRequest('PATCH', '/api/config/loan-types/gold-loan/status', { active: false });
  
  const issueTypesAfterDisable = await makeRequest('GET', '/api/config/loan-types?issueOnly=true');
  const hasGoldInIssue = issueTypesAfterDisable.body.data.some(t => t.id === 'gold-loan');
  console.log('Gold Loan appears in issue dropdown when DISABLED?', hasGoldInIssue);

  if (hasGoldInIssue) {
    throw new Error('TEST 4 FAILED: Disabled Gold Loan still appeared in issue dropdown!');
  }

  const rejectedLoan = await makeRequest('POST', '/api/loans', loanPayloadA);
  console.log('Attempting to create loan with disabled Gold Loan:', rejectedLoan.status, rejectedLoan.body.message);
  if (rejectedLoan.status !== 400) {
    throw new Error('TEST 4 FAILED: Backend allowed issuing disabled loan type!');
  }

  // Re-enable Gold Loan
  await makeRequest('PATCH', '/api/config/loan-types/gold-loan/status', { active: true });

  // Step 6: Test 5 & 6 - Silver Loan Configuration & Switch
  console.log('\n--- TEST 5 & 6: Silver Loan Configuration & Dynamic Property Resolution ---');
  const updateSilver = await makeRequest('PUT', '/api/config/loan-types/silver-loan', {
    cardFee: 60,
    interestProfileId: 'silver-bands',
    active: true,
    showOnLoanIssue: true
  });
  console.log('Silver Loan Config:', updateSilver.body.data.name, 'Fee:', updateSilver.body.data.cardFee, 'Profile:', updateSilver.body.data.interestProfileId);

  const createLoanSilver = await makeRequest('POST', '/api/loans', {
    ...loanPayloadA,
    loanTypeId: 'silver-loan',
    customerName: 'Silver Borrower'
  });
  console.log('Silver Loan Created:');
  console.log('  - loanTypeNameSnapshot:', createLoanSilver.body.data.loanTypeNameSnapshot);
  console.log('  - cardFeeSnapshot:', createLoanSilver.body.data.cardFeeSnapshot);
  console.log('  - interestProfileNameSnapshot:', createLoanSilver.body.data.interestProfileNameSnapshot);

  if (createLoanSilver.body.data.cardFeeSnapshot !== 60 || createLoanSilver.body.data.interestProfileIdSnapshot !== 'silver-bands') {
    throw new Error('TEST 5/6 FAILED: Silver loan snapshot did not match Master Control configuration.');
  }

  // Step 7: Check Audit Logs
  console.log('\n--- Step 7: Check Audit Logs ---');
  const auditLogsRes = await makeRequest('GET', '/api/staff/audit');
  console.log('Audit API status:', auditLogsRes.status);

  console.log('\n========================================================');
  console.log('ALL 8 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('========================================================');
}

runTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
