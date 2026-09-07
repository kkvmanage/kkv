const http = require('http');

// Helper to construct a simple multipart/form-data payload using standard Node.js buffers
async function testMultipart() {
  console.log('--- TESTING MULTIPART FORM-DATA SUBMISSION ---');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);

  const fields = {
    fullName: 'Rajesh Kumar Test',
    gender: 'Male',
    phoneNumber: randomPhone,
    email: 'rajesh.kumar@example.com',
    occupation: 'Jeweller',
    age: '38',
    dateOfBirth: '1988-04-12',
    address: '45 Swamy Sannathi Street',
    city: 'Komarapalayam',
    district: 'Namakkal',
    state: 'Tamil Nadu',
    pincode: '638183',
    idProofType: 'Aadhaar',
    idProofNumber: '1234 5678 9012'
  };

  // Mock 1x1 transparent PNG buffer
  const samplePhotoPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  let bodyBuffers = [];

  // Append text fields
  for (const [key, val] of Object.entries(fields)) {
    bodyBuffers.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  // Append customer photo file
  bodyBuffers.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="customerPhoto"; filename="customer-test.png"\r\nContent-Type: image/png\r\n\r\n`
    )
  );
  bodyBuffers.push(samplePhotoPng);
  bodyBuffers.push(Buffer.from('\r\n'));

  // Append KYC document file
  bodyBuffers.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="kycDocuments"; filename="aadhaar-front.png"\r\nContent-Type: image/png\r\n\r\n`
    )
  );
  bodyBuffers.push(samplePhotoPng);
  bodyBuffers.push(Buffer.from('\r\n'));

  // End boundary
  bodyBuffers.push(Buffer.from(`--${boundary}--\r\n`));

  const totalBody = Buffer.concat(bodyBuffers);

  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/customers',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': totalBody.length
    }
  };

  const res = await new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(totalBody);
    req.end();
  });

  console.log('Multipart Create Status:', res.status);
  console.log('Multipart Create Response:', JSON.stringify(res.data, null, 2));

  if (res.status === 201) {
    console.log('✓ Multipart customer create test passed!');
    const custId = res.data?.data?.customerId || res.data?.data?.id;
    if (custId) {
      // Clean up test customer
      console.log(`Cleaning up test customer ${custId}...`);
      const delReq = http.request({
        hostname: 'localhost',
        port: 8080,
        path: `/api/customers/${custId}`,
        method: 'DELETE'
      });
      delReq.end();
    }
  }
}

testMultipart().catch(console.error);
