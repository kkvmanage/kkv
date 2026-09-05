const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 8080,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ statusCode: res.statusCode, body: json });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Fetch available backups ---');
  const backupsRes = await request('GET', '/api/admin/backup/history');
  console.log('Backups count:', backupsRes.body?.data?.length);

  let backupId = backupsRes.body?.data?.[0]?.backupId;
  if (!backupId) {
    console.log('Creating a backup package first...');
    const createRes = await request('POST', '/api/admin/backup/create');
    backupId = createRes.body?.data?.backupId;
  }
  console.log('Using backupId:', backupId);

  console.log('\n--- 2. Validate restore package ---');
  const validateRes = await request('POST', '/api/admin/system/restore/validate', { backupId });
  console.log('Validate status:', validateRes.statusCode);
  console.log('Validate success:', validateRes.body?.success);
  console.log('Preview counts:', validateRes.body?.data?.counts);
  const token = validateRes.body?.data?.token;

  if (!token) {
    console.error('No token returned! Validation failed:', validateRes.body);
    return;
  }

  console.log('\n--- 3. Execute restore with confirmation ---');
  const restoreRes = await request('POST', '/api/admin/system/restore', {
    token,
    confirmationText: 'RESTORE BACKUP'
  });
  console.log('Restore statusCode:', restoreRes.statusCode);
  console.log('Restore response:', JSON.stringify(restoreRes.body, null, 2));

  const restoreId = restoreRes.body?.data?.restoreId || restoreRes.body?.restore?.restoreId;
  console.log('\nRestore ID:', restoreId);
  console.log('DB Status:', restoreRes.body?.data?.databaseStatus || restoreRes.body?.restore?.status);
  console.log('Drive Status:', restoreRes.body?.data?.googleDriveSync || restoreRes.body?.googleDrive?.status);

  console.log('\n--- 4. Test Drive Sync Retry ---');
  const retryRes = await request('POST', `/api/admin/system/restore/${restoreId}/sync-drive`);
  console.log('Retry statusCode:', retryRes.statusCode);
  console.log('Retry response:', JSON.stringify(retryRes.body, null, 2));

  console.log('\n--- 5. Verify Restore History ---');
  const historyRes = await request('GET', '/api/admin/system/restore/history');
  console.log('History count:', historyRes.body?.data?.length);
  const latest = historyRes.body?.data?.[0];
  console.log('Latest history item:', {
    restoreId: latest?.restoreId,
    databaseStatus: latest?.databaseStatus,
    googleDriveSync: latest?.googleDriveSync,
    googleDriveError: latest?.googleDriveError,
    googleDriveErrorCode: latest?.googleDriveErrorCode,
    counts: latest?.restoredCounts
  });

  console.log('\n✅ All checks finished.');
}

run().catch(console.error);
