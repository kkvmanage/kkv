// End-to-end automated verification script for Complex Rental Management system
import http from 'http';

const BASE_URL = 'http://localhost:5001/api';

const apiRequest = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
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

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
};

const runVerification = async () => {
  console.log('🚀 Starting Complex Rental Management End-to-End Verification...\n');

  // 1. Healthcheck
  console.log('1. Testing Health Endpoint...');
  const health = await apiRequest('/health');
  console.log('   Health Status:', health.status, health.data?.status || health.data);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Staff Login
  console.log('\n2. Testing Staff Login...');
  const loginRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: 'staff', password: 'rental123' },
  });
  console.log('   Login Response:', loginRes.status, loginRes.data?.user?.username, 'Role:', loginRes.data?.user?.role);
  if (loginRes.status !== 200 || !loginRes.data?.token) throw new Error('Login failed');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Create Commercial Complex
  console.log('\n3. Creating Commercial Complex...');
  const complexRes = await apiRequest('/rental/complexes', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexName: 'Grand Horizon Commercial Plaza',
      location: '124 Anna Salai, Chennai',
      status: 'ACTIVE',
    },
  });
  console.log('   Complex Created:', complexRes.status, complexRes.data?.data?.complexId, complexRes.data?.data?.complexName);
  const complexId = complexRes.data?.data?.complexId;
  if (!complexId) throw new Error('Complex creation failed');

  // 4. Create Shop #1
  console.log('\n4. Creating Shop #1 with Tenant...');
  const shop1Res = await apiRequest('/rental/shops', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopNumber: 'G-01',
      shopName: 'Horizon Electronics',
      tenantName: 'Senthil Nathan',
      mobileNumber: '9876543210',
      monthlyRent: 20000,
      status: 'ACTIVE',
    },
  });
  console.log('   Shop #1 Created:', shop1Res.status, shop1Res.data?.data?.shopId, 'Rent: ₹' + shop1Res.data?.data?.monthlyRent);
  const shop1Id = shop1Res.data?.data?.shopId;

  // 5. Create Shop #2
  console.log('\n5. Creating Shop #2 with Tenant...');
  const shop2Res = await apiRequest('/rental/shops', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopNumber: 'G-02',
      shopName: 'Green Leaf Cafe',
      tenantName: 'Ananya Sharma',
      mobileNumber: '9845012345',
      monthlyRent: 15000,
      status: 'ACTIVE',
    },
  });
  console.log('   Shop #2 Created:', shop2Res.status, shop2Res.data?.data?.shopId, 'Rent: ₹' + shop2Res.data?.data?.monthlyRent);
  const shop2Id = shop2Res.data?.data?.shopId;

  // 6. Test Rent Payment with Advance Generation (Paying 25,000 for 20,000 rent => 5,000 Advance Credit)
  console.log('\n6. Testing Overpayment & Advance Generation on Shop #1...');
  const pay1Res = await apiRequest('/rental/payments', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopId: shop1Id,
      paymentMonth: '2026-09',
      amountReceived: 25000,
      paymentMode: 'GPAY',
      paymentDate: '2026-09-04',
      notes: 'Initial rent + advance deposit',
    },
  });
  console.log('   Payment #1:', pay1Res.status, pay1Res.data?.data?.paymentId, 'Advance Generated: ₹' + pay1Res.data?.data?.advanceGenerated);
  if (pay1Res.data?.data?.advanceGenerated !== 5000) throw new Error('Advance generation logic mismatch');

  // Check shop 1 advance balance
  const shop1Updated = await apiRequest(`/rental/shops/${shop1Id}`, { headers: authHeaders });
  console.log('   Shop #1 Available Advance Balance in DB:', '₹' + shop1Updated.data?.data?.availableAdvance);
  if (shop1Updated.data?.data?.availableAdvance !== 5000) throw new Error('Shop advance balance not updated');

  // 7. Test Advance Usage on Next Month's Rent
  console.log('\n7. Testing Advance Deduction (₹5,000) + Cash (₹15,000) for October Rent...');
  const pay2Res = await apiRequest('/rental/payments', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopId: shop1Id,
      paymentMonth: '2026-10',
      amountReceived: 15000,
      advanceToUse: 5000,
      paymentMode: 'CASH',
      paymentDate: '2026-09-04',
      notes: 'October rent using 5k advance + 15k cash',
    },
  });
  console.log('   Payment #2:', pay2Res.status, pay2Res.data?.data?.paymentId, 'Balance Due: ₹' + pay2Res.data?.data?.balanceAfterPayment, 'Status:', pay2Res.data?.data?.paymentStatus);
  if (pay2Res.data?.data?.balanceAfterPayment !== 0 || pay2Res.data?.data?.paymentStatus !== 'PAID') {
    throw new Error('Advance usage calculation failed');
  }

  // 8. Test Partial Rent Payment & Split Mode (BOTH: Cash + GPay) on Shop #2
  console.log('\n8. Testing Split Payment (Cash: ₹5,000 + GPay: ₹5,000 = ₹10,000) for ₹15,000 Rent...');
  const pay3Res = await apiRequest('/rental/payments', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopId: shop2Id,
      paymentMonth: '2026-09',
      amountReceived: 10000,
      paymentMode: 'BOTH',
      cashAmount: 5000,
      gpayAmount: 5000,
      paymentDate: '2026-09-04',
      notes: 'Partial payment split',
    },
  });
  console.log('   Payment #3:', pay3Res.status, 'Status:', pay3Res.data?.data?.paymentStatus, 'Remaining Balance Due: ₹' + pay3Res.data?.data?.balanceAfterPayment);
  if (pay3Res.data?.data?.paymentStatus !== 'PARTIAL' || pay3Res.data?.data?.balanceAfterPayment !== 5000) {
    throw new Error('Partial payment / split calculation failed');
  }

  // 9. Test Split Mismatch Validation Failure
  console.log('\n9. Testing Invalid Split Sum (Expect 400 Bad Request)...');
  const invalidSplitRes = await apiRequest('/rental/payments', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      shopId: shop2Id,
      paymentMonth: '2026-09',
      amountReceived: 5000,
      paymentMode: 'BOTH',
      cashAmount: 2000,
      gpayAmount: 2000, // Sum = 4000 != 5000
      paymentDate: '2026-09-04',
    },
  });
  console.log('   Invalid Split Response Status:', invalidSplitRes.status, invalidSplitRes.data?.message);
  if (invalidSplitRes.status !== 400) throw new Error('Expected 400 Bad Request for split mismatch');

  // 10. Record Building Expense
  console.log('\n10. Recording Maintenance Expense...');
  const expRes = await apiRequest('/rental/expenses', {
    method: 'POST',
    headers: authHeaders,
    body: {
      complexId,
      expenseDate: '2026-09-04',
      category: 'Maintenance',
      expenseReason: 'Building common area painting and washroom cleaning',
      expenseAmount: 3500,
      paymentMode: 'CASH',
      notes: 'Paid to Painter Murugan',
    },
  });
  console.log('   Expense Created:', expRes.status, expRes.data?.data?.expenseId, 'Amount: ₹' + expRes.data?.data?.expenseAmount);

  // 11. Verify Dashboard Metrics
  console.log('\n11. Verifying Aggregated Dashboard Metrics...');
  const dashRes = await apiRequest('/rental/dashboard?month=2026-09', { headers: authHeaders });
  const metrics = dashRes.data?.data;
  console.log('    Total Complexes:', metrics.totalComplexes);
  console.log('    Total Shops:', metrics.totalShops);
  console.log('    Expected Rent:', '₹' + metrics.expectedMonthlyRent);
  console.log('    Collected This Month:', '₹' + metrics.collectedThisMonth);
  console.log('    Pending Rent:', '₹' + metrics.pendingRent);
  console.log('    Expenses:', '₹' + metrics.thisMonthExpenses);
  console.log('    Net Collection:', '₹' + metrics.netCollection);
  console.log('    Cash Split:', '₹' + metrics.paymentModeSplit.cashTotal);
  console.log('    GPay Split:', '₹' + metrics.paymentModeSplit.gpayTotal);

  // 12. Verify Admin-Facing Public Integration Summary
  console.log('\n12. Verifying Finance Admin Shared Endpoint (/api/finance-summary)...');
  const summaryRes = await apiRequest('/finance-summary');
  console.log('    Summary Status:', summaryRes.status, 'Expected Rent:', summaryRes.data?.data?.expectedMonthlyRent, 'Net:', summaryRes.data?.data?.netCollection);
  if (summaryRes.status !== 200) throw new Error('Finance summary endpoint failed');

  console.log('\n======================================================');
  console.log('✅ ALL COMPLEX RENTAL MANAGEMENT VERIFICATIONS PASSED!');
  console.log('======================================================\n');
};

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
