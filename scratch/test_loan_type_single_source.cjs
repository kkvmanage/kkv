const http = require('http');

const API_BASE = 'http://localhost:8080/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
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
  console.log('========================================================');
  console.log('RUNNING SINGLE-SOURCE LOAN TYPE CONFIGURATION VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Fetch Loan Types from Central Config Endpoint
    console.log('--- TEST 1: Fetch Central Loan Types ---');
    const getRes = await request('/config/loan-types');
    const list = getRes.body.data || getRes.body;
    assert(getRes.status === 200 && Array.isArray(list), 'GET /api/config/loan-types returns 200 and array');
    console.log(`Found ${list.length} configured loan types: ${list.map(t => t.name).join(', ')}`);

    // 2. Create a New Loan Type
    console.log('\n--- TEST 2: Create New Loan Type ---');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testName = `Platinum Elite Loan ${uniqueSuffix}`;
    const createRes = await request('/config/loan-types', {
      method: 'POST',
      body: {
        name: testName,
        description: 'High-value platinum backed finance',
        cardFee: 65,
        cardFeeEnabled: true,
        interestProfileId: 'gold-bands',
        defaultMonthlyRate: 1.75,
        active: true,
        showOnLoanIssue: true
      }
    });

    const createdType = createRes.body.data || createRes.body;
    assert(createRes.status === 201 && createdType.id, 'POST /api/config/loan-types creates new loan type with ID');
    const createdId = createdType.id;
    assert(createdType.cardFee === 65, 'Created loan type has cardFee = 65');
    assert(createdType.configurationVersion === 1, 'Created loan type starts with configurationVersion = 1');
    console.log(`Created Loan Type ID: ${createdId}, Version: ${createdType.configurationVersion}`);

    // 3. Issue Loan #1 using New Master Configuration
    console.log('\n--- TEST 3: Issue Loan #1 using New Master Configuration ---');
    const loanPayload1 = {
      loanNo: `GL-TEST-${uniqueSuffix}-01`,
      receiptBillNo: parseInt(uniqueSuffix) * 10 + 1,
      customerId: 'CUST-0001',
      customerName: 'Sanjay Test Kumar',
      loanTypeId: createdId,
      principal: 75000,
      items: [
        { id: 'item-1', item: 'Diamond Ring', qty: 1, grossWeight: 15, netWeight: 12, purity: '22ct' }
      ]
    };

    const issueRes1 = await request('/loans', {
      method: 'POST',
      body: loanPayload1
    });

    const loan1 = issueRes1.body.data || issueRes1.body;
    assert(issueRes1.status === 201 || issueRes1.status === 200, 'Loan #1 created successfully');
    assert(loan1.loanTypeId === createdId, 'Loan #1 has loanTypeId = ' + createdId);
    assert(loan1.cardFeeSnapshot === 65, 'Loan #1 stores cardFeeSnapshot = 65 from master config');
    assert(loan1.configurationVersion === 1, 'Loan #1 stores configurationVersion = 1');
    assert(loan1.loanTypeNameSnapshot === testName, 'Loan #1 stores loanTypeNameSnapshot');
    console.log(`Loan #1 created with LoanNo: ${loan1.loanNo}, CardFeeSnapshot: ₹${loan1.cardFeeSnapshot}, ConfigVersion: ${loan1.configurationVersion}`);

    // 4. Update Loan Type (Bumping Fee and Configuration Version)
    console.log('\n--- TEST 4: Admin Updates Loan Type (₹65 -> ₹90, Rate -> 2.10%) ---');
    const updateRes = await request(`/config/loan-types/${createdId}`, {
      method: 'PUT',
      body: {
        cardFee: 90,
        defaultMonthlyRate: 2.10,
        interestProfileId: 'silver-bands'
      }
    });

    const updatedType = updateRes.body.data || updateRes.body;
    assert(updateRes.status === 200, 'PUT /api/config/loan-types/:id updates loan type');
    assert(updatedType.cardFee === 90, 'Updated loan type has cardFee = 90');
    assert(updatedType.configurationVersion === 2, 'Updated loan type incremented configurationVersion = 2');
    console.log(`Loan Type Updated. New Version: ${updatedType.configurationVersion}, New Fee: ₹${updatedType.cardFee}`);

    // 5. Issue Loan #2 with Updated Configuration
    console.log('\n--- TEST 5: Issue Loan #2 under New Configuration Version 2 ---');
    const loanPayload2 = {
      loanNo: `GL-TEST-${uniqueSuffix}-02`,
      receiptBillNo: parseInt(uniqueSuffix) * 10 + 2,
      customerId: 'CUST-0001',
      customerName: 'Sanjay Test Kumar',
      loanTypeId: createdId,
      principal: 80000,
      items: [
        { id: 'item-2', item: 'Diamond Necklace', qty: 1, grossWeight: 25, netWeight: 22, purity: '22ct' }
      ]
    };

    const issueRes2 = await request('/loans', {
      method: 'POST',
      body: loanPayload2
    });

    const loan2 = issueRes2.body.data || issueRes2.body;
    assert(issueRes2.status === 201 || issueRes2.status === 200, 'Loan #2 created successfully');
    assert(loan2.cardFeeSnapshot === 90, 'Loan #2 stores cardFeeSnapshot = 90');
    assert(loan2.configurationVersion === 2, 'Loan #2 stores configurationVersion = 2');
    assert(loan2.interestProfileIdSnapshot === 'silver-bands', 'Loan #2 stores interestProfileIdSnapshot = silver-bands');
    console.log(`Loan #2 created with LoanNo: ${loan2.loanNo}, CardFeeSnapshot: ₹${loan2.cardFeeSnapshot}, ConfigVersion: ${loan2.configurationVersion}`);

    // 6. Verify Loan #1 Historical Contractual Snapshot is UNCHANGED
    console.log('\n--- TEST 6: Verify Loan #1 Contractual Snapshot Remains Intact ---');
    const fetchLoan1Res = await request(`/loans/${loan1.id || loan1.loanNo}`);
    assert(fetchLoan1Res.status === 200, 'Fetch Loan #1 returns 200');
    const retrievedLoan1 = fetchLoan1Res.body.data || fetchLoan1Res.body;
    assert(retrievedLoan1.cardFeeSnapshot === 65, 'Loan #1 STILL has cardFeeSnapshot = 65 (Not overwritten by master v2)');
    assert(retrievedLoan1.configurationVersion === 1, 'Loan #1 STILL has configurationVersion = 1');
    assert(retrievedLoan1.interestProfileIdSnapshot === 'gold-bands', 'Loan #1 STILL has interestProfileIdSnapshot = gold-bands');
    console.log(`Loan #1 Verification Successful: Retains Original ₹65 fee and v1 config.`);

    // 7. Test Disabling / Hiding from Loan Issue
    console.log('\n--- TEST 7: Disable / Hide Loan Type ---');
    const toggleRes = await request(`/config/loan-types/${createdId}/visibility`, {
      method: 'PATCH',
      body: { showOnLoanIssue: false }
    });
    const toggledType = toggleRes.body.data || toggleRes.body;
    assert(toggleRes.status === 200, 'PATCH visibility returns 200');
    assert(toggledType.showOnLoanIssue === false, 'showOnLoanIssue is now false');

    const activeListRes = await request('/config/loan-types?issueOnly=true');
    const activeList = activeListRes.body.data || activeListRes.body;
    assert(!activeList.some(t => t.id === createdId), 'Hidden loan type is excluded from active loan issue list');

    // 8. Test Security: Prevent Client-Side Overriding of Master Financial Configuration
    console.log('\n--- TEST 8: Financial Tampering Prevention ---');
    const tamperedPayload = {
      loanNo: 'GL-TEST-03',
      receiptBillNo: 9993,
      customerId: 'CUST-0001',
      customerName: 'Sanjay Test Kumar',
      loanTypeId: 'gold-loan',
      cardFee: 0, // Client tries to spoof 0 fee
      interestRate: 0.1, // Client tries to spoof 0.1% interest
      principal: 50000,
      items: [
        { id: 'item-3', item: 'Gold Chain', qty: 1, grossWeight: 10, netWeight: 9.5, purity: '22ct' }
      ]
    };

    const tamperRes = await request('/loans', {
      method: 'POST',
      body: tamperedPayload
    });

    const tamperedLoan = tamperRes.body.data || tamperRes.body;
    assert(tamperedLoan.cardFeeSnapshot >= 10, `Backend enforced authoritative cardFee (${tamperedLoan.cardFeeSnapshot}), ignoring client 0`);
    assert(tamperedLoan.interestRate >= 1.5, `Backend enforced authoritative interest rate (${tamperedLoan.interestRate}%), ignoring client 0.1%`);

    console.log('\n========================================================');
    console.log(`FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
    console.log('========================================================');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
