const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- VERIFYING DRIVE HEALTH & BACKEND CONFIGURATION ---');
  try {
    const health = await get('http://localhost:8080/api/admin/backup/drive-health');
    console.log('GET /api/admin/backup/drive-health:', JSON.stringify(health.data, null, 2));

    const staff = await get('http://localhost:8080/api/staff');
    const master = staff.data.data.find(u => u.email === 'goldfinancekkv@gmail.com');
    console.log('Master Admin check in /api/staff:', master ? `✅ Found: ${master.email} (${master.role})` : '❌ Not found');
  } catch (err) {
    console.error('Verification error:', err.message);
  }
}

verify();
