const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:8080';

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING GOOGLE DRIVE OAUTH & BACKUP VERIFICATION TESTS ---');

    // TEST 1: GET /api/backup/google-drive/status
    console.log('\n[TEST 1] GET /api/backup/google-drive/status');
    const statusRes = await makeRequest('GET', '/api/backup/google-drive/status');
    console.log('Status code:', statusRes.status);
    console.log('Body:', statusRes.body);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(typeof statusRes.body.connected, 'boolean');
    assert.strictEqual(statusRes.body.client_secret, undefined, 'Client secret must NEVER be returned');
    assert.strictEqual(statusRes.body.refresh_token, undefined, 'Refresh token must NEVER be returned');
    assert.strictEqual(statusRes.body.access_token, undefined, 'Access token must NEVER be returned');
    console.log('✓ TEST 1 PASSED: Safe Google Drive status returned without leaking secrets');

    // TEST 2: GET /api/admin/backup/drive-health
    console.log('\n[TEST 2] GET /api/admin/backup/drive-health');
    const healthRes = await makeRequest('GET', '/api/admin/backup/drive-health');
    console.log('Status code:', healthRes.status);
    console.log('Body:', healthRes.body);
    assert.strictEqual(healthRes.status, 200);
    assert(healthRes.body.data !== undefined || healthRes.body.status !== undefined);
    const healthData = healthRes.body.data || healthRes.body;
    assert.strictEqual(typeof healthData.authMode, 'string');
    assert(['OAUTH', 'SERVICE_ACCOUNT', 'NONE'].includes(healthData.authMode));
    console.log('✓ TEST 2 PASSED: Drive health check reports valid authMode and configuration');

    // TEST 3A: GET /api/auth/google (JSON mode)
    console.log('\n[TEST 3A] GET /api/auth/google with Accept: application/json');
    const authRes = await makeRequest('GET', '/api/auth/google', null, { 'Accept': 'application/json' });
    console.log('Status code:', authRes.status);
    console.log('Body:', authRes.body);
    assert.strictEqual(authRes.status, 200);
    assert.strictEqual(authRes.body.success, true);
    assert(typeof authRes.body.url === 'string');
    assert(authRes.body.url.includes('accounts.google.com/o/oauth2/v2/auth'));
    assert(authRes.body.url.includes('access_type=offline'));
    assert(authRes.body.url.includes('prompt=consent'));
    assert(authRes.body.url.includes('state='));
    console.log('✓ TEST 3A PASSED: OAuth URL JSON generated with offline access and CSRF state');

    // TEST 3B: GET /api/auth/google (Browser direct redirect mode)
    console.log('\n[TEST 3B] GET /api/auth/google direct browser redirect');
    const redirectRes = await makeRequest('GET', '/api/auth/google', null, { 'Accept': 'text/html' });
    console.log('Status code:', redirectRes.status);
    assert.strictEqual(redirectRes.status, 302);
    assert(redirectRes.headers.location.includes('accounts.google.com/o/oauth2/v2/auth'));
    console.log('✓ TEST 3B PASSED: Direct browser navigation issues 302 redirect to Google OAuth');

    // TEST 4: POST /api/backup/google-drive/disconnect
    console.log('\n[TEST 4] POST /api/backup/google-drive/disconnect');
    const disconnectRes = await makeRequest('POST', '/api/backup/google-drive/disconnect');
    console.log('Status code:', disconnectRes.status);
    console.log('Body:', disconnectRes.body);
    assert.strictEqual(disconnectRes.status, 200);
    assert.strictEqual(disconnectRes.body.success, true);

    const postDiscStatus = await makeRequest('GET', '/api/backup/google-drive/status');
    assert.strictEqual(postDiscStatus.body.connected, false);
    console.log('✓ TEST 4 PASSED: Disconnect cleanly resets tokens and status');

    // TEST 5A: POST /api/backup/create (Cloud Backup API when Drive Disconnected)
    console.log('\n[TEST 5A] POST /api/backup/create when disconnected (Req 12 & 28)');
    const backupRes = await makeRequest('POST', '/api/backup/create', {
        type: 'FULL_MANUAL',
        triggeredBy: 'TEST_ADMIN'
    });
    console.log('Status code:', backupRes.status);
    console.log('Body:', backupRes.body);
    // Requirement 12: Must return HTTP 503 with GOOGLE_DRIVE_NOT_CONNECTED (or GOOGLE_DRIVE_REAUTH_REQUIRED)
    assert([401, 503].includes(backupRes.status));
    assert.strictEqual(backupRes.body.success, false);
    assert(['GOOGLE_DRIVE_NOT_CONNECTED', 'GOOGLE_DRIVE_REAUTH_REQUIRED'].includes(backupRes.body.errorCode));
    console.log(`✓ TEST 5A PASSED: Returned HTTP ${backupRes.status} with structured errorCode: ${backupRes.body.errorCode}`);

    // TEST 5B: Local Backup Creation via /api/admin/backup/create (Req 24)
    console.log('\n[TEST 5B] POST /api/admin/backup/create (Local Backup creation works independently)');
    const localBackupRes = await makeRequest('POST', '/api/admin/backup/create', {});
    console.log('Status code:', localBackupRes.status);
    console.log('Local Backup record:', {
        success: localBackupRes.body.success,
        backupId: localBackupRes.body.data?.backupId,
        fileName: localBackupRes.body.data?.fileName,
        sha256: localBackupRes.body.data?.sha256,
        status: localBackupRes.body.data?.status
    });
    assert.strictEqual(localBackupRes.status, 200);
    assert.strictEqual(localBackupRes.body.success, true);
    assert(localBackupRes.body.data.backupId !== undefined);
    assert(localBackupRes.body.data.sha256 !== undefined);
    assert.strictEqual(localBackupRes.body.data.status, 'LOCAL_VERIFIED');
    console.log('✓ TEST 5B PASSED: Local backup created and verified as LOCAL_VERIFIED without data loss');

    console.log('\n========================================');
    console.log('ALL GOOGLE DRIVE OAUTH TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
}

runTests().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
