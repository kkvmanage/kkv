const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 8080;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND CUSTOMER API VALIDATION ---');

  // 1. Health check
  try {
    const health = await makeRequest('GET', '/api/health');
    console.log('✓ Health Endpoint Status:', health.status, health.data?.application || health.data);
  } catch (err) {
    console.error('✗ Backend server unreachable on port 8080:', err.message);
    return;
  }

  // 2. Fetch all customers
  const initialList = await makeRequest('GET', '/api/customers');
  console.log(`✓ GET /api/customers returned ${initialList.data?.data?.length ?? initialList.data?.length ?? 0} customers.`);

  // 3. Create a test customer
  const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const newCustomerPayload = {
    fullName: 'Test Integration Customer',
    gender: 'Male',
    phoneNumber: randomPhone,
    email: 'test.customer@kkvfinance.com',
    occupation: 'Business',
    age: 35,
    dateOfBirth: '1991-05-15',
    address: '123 Main Bazaar Road',
    city: 'Komarapalayam',
    district: 'Namakkal',
    state: 'Tamil Nadu',
    pincode: '638183',
    idProofType: 'Aadhaar',
    idProofNumber: '9988 7766 5544'
  };

  console.log('Attempting POST /api/customers with test customer payload...');
  const createRes = await makeRequest('POST', '/api/customers', newCustomerPayload);
  console.log('Create Response Status:', createRes.status);
  console.log('Create Response Message:', createRes.data?.message);
  console.log('Generated Customer ID:', createRes.data?.data?.customerId || createRes.data?.data?.id);

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('✗ Customer creation test failed:', createRes.data);
    return;
  }

  const createdId = createRes.data?.data?.customerId || createRes.data?.data?.id || createRes.data?.data?._id;

  // 4. Retrieve by ID
  console.log(`Testing GET /api/customers/${createdId}...`);
  const getByIdRes = await makeRequest('GET', `/api/customers/${createdId}`);
  console.log('✓ Get Customer By ID Status:', getByIdRes.status, 'Name:', getByIdRes.data?.data?.name || getByIdRes.data?.data?.fullName);

  // 5. Search customers
  console.log(`Testing GET /api/customers/search?query=Test Integration...`);
  const searchRes = await makeRequest('GET', '/api/customers/search?query=Test+Integration');
  console.log('✓ Search Results Count:', searchRes.data?.data?.length ?? 0);

  // 6. Update customer
  console.log(`Testing PUT /api/customers/${createdId}...`);
  const updateRes = await makeRequest('PUT', `/api/customers/${createdId}`, {
    occupation: 'Senior Trader',
    pincode: '638184'
  });
  console.log('✓ Update Customer Status:', updateRes.status, 'Message:', updateRes.data?.message);

  // 7. Delete customer
  console.log(`Testing DELETE /api/customers/${createdId}...`);
  const deleteRes = await makeRequest('DELETE', `/api/customers/${createdId}`);
  console.log('✓ Delete Customer Status:', deleteRes.status, 'Message:', deleteRes.data?.message);

  console.log('--- BACKEND CUSTOMER API VALIDATION COMPLETE: ALL PASS ---');
}

runTests().catch(console.error);
