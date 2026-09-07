const fs = require('fs');

async function runTest() {
  console.log('--- 1. Testing Health Endpoint ---');
  const hRes = await fetch('http://localhost:8080/api/health');
  const hData = await hRes.json();
  console.log('Health:', JSON.stringify(hData, null, 2));

  console.log('\n--- 2. Testing Customer Creation with Google Drive Upload ---');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const samplePhoto = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB]);
  const samplePdf = Buffer.from('%PDF-1.4 sample pdf content for aadhaar kyc test');

  const timestamp = Date.now();
  const phone = '9' + Math.floor(100000000 + Math.random() * 900000000);

  const parts = [];
  function addField(name, val) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`));
  }
  function addFile(fieldname, filename, mime, buf) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldname}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(buf);
    parts.push(Buffer.from('\r\n'));
  }

  addField('fullName', 'Google Drive Verified Customer ' + timestamp);
  addField('gender', 'Male');
  addField('phoneNumber', phone);
  addField('age', '32');
  addField('occupation', 'Business Owner');
  addField('address', '123 Anna Salai, Chennai, Tamil Nadu');
  addField('idProofType', 'Aadhaar');
  addField('idProofNumber', '9988 7766 5544');

  addFile('customerPhoto', 'customer-photo.jpg', 'image/jpeg', samplePhoto);
  addFile('aadhaarDoc', 'aadhaar-front.pdf', 'application/pdf', samplePdf);

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const bodyBuffer = Buffer.concat(parts);

  const createRes = await fetch('http://localhost:8080/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  const createData = await createRes.json();
  console.log('Create Customer Status:', createRes.status);
  console.log('Create Customer Response:', JSON.stringify(createData, null, 2));

  if (createData.data && createData.data.customerId) {
    const custId = createData.data.customerId;
    console.log('\n--- 3. Testing Customer Retrieval by ID ---');
    const getRes = await fetch(`http://localhost:8080/api/customers/${custId}`);
    const getData = await getRes.json();
    console.log('Get Customer Status:', getRes.status);
    console.log('Customer Photo in MongoDB:', getData.data.customerPhotoData || getData.data.customerPhoto);
    console.log('KYC Documents in MongoDB:', getData.data.kycDocuments);
  }
}

runTest().catch(console.error);
