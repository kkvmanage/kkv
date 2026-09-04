import http from 'http';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 8080,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✔ ${message}`);
}

async function runTests() {
  console.log('=================================================================');
  console.log('  KKV GOLD FINANCE — DEVICE & ACTIVE SESSION MANAGEMENT TEST     ');
  console.log('=================================================================\n');

  try {
    // 1. Initial Listing
    console.log('▶ [TEST 1] List Initial Authenticated Sessions...');
    const listRes1 = await makeRequest('/sessions');
    assert(listRes1.status === 200 && listRes1.body.success, 'GET /api/sessions returns 200 OK');
    assert(Array.isArray(listRes1.body.data), 'Sessions payload is an array');
    console.log(`    Found ${listRes1.body.data.length} seeded sessions.\n`);

    // 2. Register Device A (Current Device)
    console.log('▶ [TEST 2] Register Device A (Current Device — Windows PC)...');
    const deviceA = {
      sessionId: 'sess_test_device_a_' + Date.now(),
      userId: 'kkv_admin',
      userRole: 'ADMIN',
      userEmail: 'kkvgoldfinance@gmail.com',
      deviceType: 'DESKTOP',
      deviceName: 'Windows PC (HQ Master)',
      operatingSystem: 'Windows 11',
      osVersion: '11',
      browser: 'Chrome 139',
      browserVersion: '139.0.0.0',
      ipAddress: '192.168.1.102',
      location: 'Salem, Tamil Nadu, India',
      status: 'ACTIVE'
    };
    const regResA = await makeRequest('/sessions/register', 'POST', deviceA);
    assert(regResA.status === 200 && regResA.body.success, 'Device A registered successfully');
    assert(regResA.body.data.sessionId === deviceA.sessionId, 'Device A session ID confirmed');
    console.log(`    Device A Session: ${deviceA.sessionId}\n`);

    // 3. Register Device B (Android Phone)
    console.log('▶ [TEST 3] Register Device B (Remote Device — Android Phone)...');
    const deviceB = {
      sessionId: 'sess_test_device_b_' + Date.now(),
      userId: 'kkv_admin',
      userRole: 'ADMIN',
      userEmail: 'kkvgoldfinance@gmail.com',
      deviceType: 'MOBILE',
      deviceName: 'Samsung Galaxy S24',
      operatingSystem: 'Android 15',
      osVersion: '15',
      browser: 'Chrome 138',
      browserVersion: '138.0.0.0',
      ipAddress: '192.168.1.150',
      location: 'Salem, Tamil Nadu, India',
      status: 'ACTIVE'
    };
    const regResB = await makeRequest('/sessions/register', 'POST', deviceB);
    assert(regResB.status === 200 && regResB.body.success, 'Device B registered successfully');
    console.log(`    Device B Session: ${deviceB.sessionId}\n`);

    // 4. Register Device C (MacBook Pro)
    console.log('▶ [TEST 4] Register Device C (Remote Device — MacBook Pro)...');
    const deviceC = {
      sessionId: 'sess_test_device_c_' + Date.now(),
      userId: 'kkv_admin',
      userRole: 'ADMIN',
      userEmail: 'kkvgoldfinance@gmail.com',
      deviceType: 'LAPTOP',
      deviceName: 'MacBook Pro 16',
      operatingSystem: 'macOS Sonoma',
      browser: 'Safari 17',
      ipAddress: '192.168.1.170',
      location: 'Salem, Tamil Nadu, India',
      status: 'ACTIVE'
    };
    const regResC = await makeRequest('/sessions/register', 'POST', deviceC);
    assert(regResC.status === 200 && regResC.body.success, 'Device C registered successfully');
    console.log(`    Device C Session: ${deviceC.sessionId}\n`);

    // 5. Verify Check Session Endpoint for Active Sessions
    console.log('▶ [TEST 5] Verify Session Check for Active Devices...');
    const checkA = await makeRequest(`/sessions/check/${deviceA.sessionId}`);
    assert(checkA.status === 200 && checkA.body.data.isValid === true, 'Device A session check is VALID');
    const checkB = await makeRequest(`/sessions/check/${deviceB.sessionId}`);
    assert(checkB.status === 200 && checkB.body.data.isValid === true, 'Device B session check is VALID');
    console.log('    All newly registered devices are verified ACTIVE & VALID.\n');

    // 6. Heartbeat / Refresh Device A
    console.log('▶ [TEST 6] Heartbeat / Activity Update for Device A...');
    const heartbeatRes = await makeRequest('/sessions/register', 'POST', {
      sessionId: deviceA.sessionId,
      deviceName: 'Windows PC (HQ Master Updated)'
    });
    assert(heartbeatRes.status === 200 && heartbeatRes.body.success, 'Heartbeat accepted');
    assert(heartbeatRes.body.data.deviceName === 'Windows PC (HQ Master Updated)', 'Device name updated without creating duplicate');
    console.log('    Device A updated safely without duplication.\n');

    // 7. Revoke Single Device (Device B)
    console.log('▶ [TEST 7] Remote Sign Out Single Device (Device B)...');
    const revokeResB = await makeRequest(`/sessions/${deviceB.sessionId}/revoke`, 'POST');
    assert(revokeResB.status === 200 && revokeResB.body.success, 'Revocation API call returned success');

    const checkRevokedB = await makeRequest(`/sessions/check/${deviceB.sessionId}`);
    assert(checkRevokedB.body.data.isValid === false, 'Device B is now INVALID / REVOKED');
    console.log('    Device B successfully rejected on session check.\n');

    // 8. Sign Out All Other Devices (Keep Device A)
    console.log('▶ [TEST 8] Sign Out All Other Devices (Preserving Device A)...');
    const revokeOthersRes = await makeRequest('/sessions/revoke-others', 'POST', {
      currentSessionId: deviceA.sessionId
    });
    assert(revokeOthersRes.status === 200 && revokeOthersRes.body.success, 'Revoke-others API returned success');
    assert(typeof revokeOthersRes.body.revokedCount === 'number', 'Revoked count returned');

    // Verify Device A remains valid
    const checkAAfterOthers = await makeRequest(`/sessions/check/${deviceA.sessionId}`);
    assert(checkAAfterOthers.body.data.isValid === true, 'Device A (Current Device) remains VALID & ACTIVE');

    // Verify Device C was revoked
    const checkCAfterOthers = await makeRequest(`/sessions/check/${deviceC.sessionId}`);
    assert(checkCAfterOthers.body.data.isValid === false, 'Device C was revoked by batch sign-out');
    console.log('    Only Device A remains ACTIVE. All other devices revoked.\n');

    console.log('=================================================================');
    console.log('  ALL DEVICE & ACTIVE SESSION MANAGEMENT TESTS PASSED (100%)    ');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
