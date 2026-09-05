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

async function runInterestSyncTests() {
  console.log('========================================================');
  console.log('RUNNING INTEREST SYNC & CONTRACTUAL SNAPSHOT SUITE');
  console.log('========================================================');

  // 1. Configure Master Control: Gold Loan (2%, ₹75) and Silver Loan (3%, ₹60)
  console.log('\n--- Step 1: Configure Gold & Silver in Master Control ---');
  const goldConfigRes = await makeRequest('PUT', '/api/config/loan-types/gold-loan', {
    name: 'Gold Loan',
    cardFee: 75,
    cardFeeEnabled: true,
    defaultMonthlyRate: 2.0,
    interestProfileId: 'gold-bands',
    useMasterDefaults: false,
    active: true,
    showOnLoanIssue: true
  });
  console.log('Gold Loan Configured:', goldConfigRes.body.data.name, 'Rate:', goldConfigRes.body.data.interestRate + '%', 'Card Fee: ₹' + goldConfigRes.body.data.cardFee, 'Version: V' + goldConfigRes.body.data.configurationVersion);

  const silverConfigRes = await makeRequest('PUT', '/api/config/loan-types/silver-loan', {
    name: 'Silver Loan',
    cardFee: 60,
    cardFeeEnabled: true,
    defaultMonthlyRate: 3.0,
    interestProfileId: 'silver-bands',
    useMasterDefaults: false,
    active: true,
    showOnLoanIssue: true
  });
  console.log('Silver Loan Configured:', silverConfigRes.body.data.name, 'Rate:', silverConfigRes.body.data.interestRate + '%', 'Card Fee: ₹' + silverConfigRes.body.data.cardFee, 'Version: V' + silverConfigRes.body.data.configurationVersion);

  // 2. Query Configuration API to verify resolution
  console.log('\n--- Step 2: Verify /api/config/loan-types Resolution ---');
  const configListRes = await makeRequest('GET', '/api/config/loan-types?issueOnly=true');
  const goldType = configListRes.body.data.find(t => t.id === 'gold-loan');
  const silverType = configListRes.body.data.find(t => t.id === 'silver-loan');

  console.log('Resolved Gold:', { interestRate: goldType.interestRate, cardFee: goldType.cardFee, profile: goldType.interestProfile });
  console.log('Resolved Silver:', { interestRate: silverType.interestRate, cardFee: silverType.cardFee, profile: silverType.interestProfile });

  if (goldType.interestRate !== 2.0 || goldType.cardFee !== 75) {
    throw new Error(`Step 2 Failed: Expected Gold 2% / ₹75, got ${goldType.interestRate}% / ₹${goldType.cardFee}`);
  }
  if (silverType.interestRate !== 3.0 || silverType.cardFee !== 60) {
    throw new Error(`Step 2 Failed: Expected Silver 3% / ₹60, got ${silverType.interestRate}% / ₹${silverType.cardFee}`);
  }

  // 3. Create Loan A (Gold Loan: 2%, ₹75)
  console.log('\n--- Step 3: Create Loan A under Gold Loan (2%, ₹75) ---');
  const loanPayloadA = {
    loanTypeId: 'gold-loan',
    customerId: 'CUST-001',
    customerName: 'Borrower Alpha',
    customerPhone: '9876543210',
    customerGender: 'Male',
    customerAge: 32,
    customerOccupation: 'Trade',
    customerCurrentAddress: '100 South Street',
    customerPermanentAddress: '100 South Street',
    principal: 80000,
    items: [{ id: 'item-1', item: 'Gold Necklace', qty: 1, purity: '22ct', grossWeight: 15, netWeight: 14.5 }],
    deductAdvanceInterest: false,
    bankMode: 'Cash',
    cashAmount: 80000,
    bankAmount: 0
  };

  const createLoanA = await makeRequest('POST', '/api/loans', loanPayloadA);
  console.log('Loan A Created:', createLoanA.body.data.loanNo, 'ID:', createLoanA.body.data.id);
  console.log('Contractual Snapshot A:', {
    interestRateSnapshot: createLoanA.body.data.interestRateSnapshot,
    cardFeeSnapshot: createLoanA.body.data.cardFeeSnapshot,
    interestProfileSnapshot: createLoanA.body.data.interestProfileSnapshot,
    configurationVersion: createLoanA.body.data.configurationVersion
  });

  if (createLoanA.body.data.interestRateSnapshot !== 2.0 || createLoanA.body.data.cardFeeSnapshot !== 75) {
    throw new Error('Step 3 Failed: Loan A snapshot does not match configured Master Control values.');
  }

  // 4. Create Loan S under Silver Loan (3%, ₹60)
  console.log('\n--- Step 4: Create Loan S under Silver Loan (3%, ₹60) ---');
  const loanPayloadS = {
    ...loanPayloadA,
    loanTypeId: 'silver-loan',
    customerName: 'Silver Borrower'
  };
  const createLoanS = await makeRequest('POST', '/api/loans', loanPayloadS);
  console.log('Loan S Created:', createLoanS.body.data.loanNo, 'ID:', createLoanS.body.data.id);
  console.log('Contractual Snapshot S:', {
    interestRateSnapshot: createLoanS.body.data.interestRateSnapshot,
    cardFeeSnapshot: createLoanS.body.data.cardFeeSnapshot,
    interestProfileSnapshot: createLoanS.body.data.interestProfileSnapshot
  });

  if (createLoanS.body.data.interestRateSnapshot !== 3.0 || createLoanS.body.data.cardFeeSnapshot !== 60) {
    throw new Error('Step 4 Failed: Loan S snapshot does not match Silver configuration.');
  }

  // 5. Update Master Control: Gold Loan (Interest = 2.5%, Card Fee = ₹100)
  console.log('\n--- Step 5: Update Master Control Gold Loan -> 2.5%, ₹100 ---');
  const updateGoldRes = await makeRequest('PUT', '/api/config/loan-types/gold-loan', {
    defaultMonthlyRate: 2.5,
    cardFee: 100
  });
  console.log('Updated Gold Loan:', updateGoldRes.body.data.name, 'New Rate:', updateGoldRes.body.data.interestRate + '%', 'New Fee: ₹' + updateGoldRes.body.data.cardFee, 'New Version: V' + updateGoldRes.body.data.configurationVersion);

  // 6. Create Loan B under updated Gold Loan (2.5%, ₹100)
  console.log('\n--- Step 6: Create Loan B under Updated Gold Loan ---');
  const createLoanB = await makeRequest('POST', '/api/loans', {
    ...loanPayloadA,
    customerName: 'Borrower Beta'
  });
  console.log('Loan B Created:', createLoanB.body.data.loanNo, 'ID:', createLoanB.body.data.id);
  console.log('Contractual Snapshot B:', {
    interestRateSnapshot: createLoanB.body.data.interestRateSnapshot,
    cardFeeSnapshot: createLoanB.body.data.cardFeeSnapshot,
    configurationVersion: createLoanB.body.data.configurationVersion
  });

  if (createLoanB.body.data.interestRateSnapshot !== 2.5 || createLoanB.body.data.cardFeeSnapshot !== 100) {
    throw new Error('Step 6 Failed: Loan B did not receive updated Master Control parameters.');
  }

  // 7. Verify Historical Loan A Immutability
  console.log('\n--- Step 7: Verify Historical Loan A Immutability ---');
  const fetchedLoanA = await makeRequest('GET', `/api/loans/${createLoanA.body.data.id}`);
  console.log('Fetched Historical Loan A:', {
    interestRateSnapshot: fetchedLoanA.body.data.interestRateSnapshot,
    cardFeeSnapshot: fetchedLoanA.body.data.cardFeeSnapshot,
    configurationVersion: fetchedLoanA.body.data.configurationVersion
  });

  if (fetchedLoanA.body.data.interestRateSnapshot !== 2.0 || fetchedLoanA.body.data.cardFeeSnapshot !== 75) {
    throw new Error('Step 7 Failed: Historical Loan A values changed after Master Control update!');
  }

  // 8. Test Manipulated Frontend Input Protection
  console.log('\n--- Step 8: Test Frontend Manipulation Protection ---');
  const manipulatedLoan = await makeRequest('POST', '/api/loans', {
    ...loanPayloadA,
    loanTypeId: 'gold-loan',
    customerName: 'Hacker Test',
    interestRate: 99.9, // Attacker attempts to set 99.9%
    cardFee: 1          // Attacker attempts to set ₹1 fee
  });
  console.log('Manipulated Request Stamped As:', {
    interestRateSnapshot: manipulatedLoan.body.data.interestRateSnapshot,
    cardFeeSnapshot: manipulatedLoan.body.data.cardFeeSnapshot
  });

  if (manipulatedLoan.body.data.interestRateSnapshot !== 2.5 || manipulatedLoan.body.data.cardFeeSnapshot !== 100) {
    throw new Error('Step 8 Failed: Backend trusted client financial input over Master Control!');
  }

  console.log('\n========================================================');
  console.log('ALL INTEREST SYNC & AUTHORITATIVE BACKEND TESTS PASSED 100%!');
  console.log('========================================================');
}

runInterestSyncTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
