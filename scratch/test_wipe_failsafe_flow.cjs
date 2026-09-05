const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('TEST 1: GET /api/admin/backup/drive-health');
  console.log('====================================================');
  const healthRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/backup/drive-health',
    method: 'GET'
  });
  console.log(`Status: ${healthRes.status}`);
  console.log('Response:', JSON.stringify(healthRes.data, null, 2));

  console.log('\n====================================================');
  console.log('TEST 2: POST /api/admin/wipe-all-data/initiate (INVALID CONFIRMATION)');
  console.log('====================================================');
  const badConfirmRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/wipe-all-data/initiate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { confirmationText: 'INCORRECT TEXT' });
  console.log(`Status: ${badConfirmRes.status} (Expected: 400)`);
  console.log('Response:', JSON.stringify(badConfirmRes.data, null, 2));

  console.log('\n====================================================');
  console.log('TEST 3: POST /api/admin/wipe-all-data/confirm (INVALID / MISSING TOKEN)');
  console.log('====================================================');
  const fakeTokenRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/wipe-all-data/confirm',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { token: 'wt_fake_nonexistent_token', confirmationText: 'WIPE ALL DATA' });
  console.log(`Status: ${fakeTokenRes.status} (Expected: 500/400)`);
  console.log('Response:', JSON.stringify(fakeTokenRes.data, null, 2));

  console.log('\n====================================================');
  console.log('TEST 4: POST /api/admin/wipe-all-data/initiate (VALID CONFIRMATION)');
  console.log('====================================================');
  const validInitiateRes = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/wipe-all-data/initiate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { confirmationText: 'WIPE ALL DATA' });
  console.log(`Status: ${validInitiateRes.status}`);
  console.log('Response:', JSON.stringify(validInitiateRes.data, null, 2));

  if (validInitiateRes.data?.success && validInitiateRes.data?.data) {
    const tokenRecord = validInitiateRes.data.data;
    console.log('\n✅ Backup successfully uploaded and verified!');
    console.log(`Token: ${tokenRecord.token}`);
    console.log(`File ID: ${tokenRecord.fileId}`);
    console.log(`File Name: ${tokenRecord.fileName}`);
    console.log(`SHA-256: ${tokenRecord.sha256}`);
    console.log(`Status: ${tokenRecord.backupStatus}`);
  }
}

runTests().catch(console.error);
