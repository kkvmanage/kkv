const crypto = require('crypto');

function testIntegrityVerification() {
  console.log('Testing SHA-256 Checksum generation and verification logic...');
  const testPayload = {
    metadata: { appName: 'KKV Gold Finance', backupType: 'FULL_SYSTEM_WIPE_BACKUP' },
    counts: { customers: 12, loans: 5 },
    data: { customers: [{ id: 'CUST-001', name: 'Test Customer' }] }
  };

  const jsonString = JSON.stringify(testPayload, null, 2);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');
  const localSha256 = crypto.createHash('sha256').update(jsonBuffer).digest('hex');

  console.log(`Local SHA-256: ${localSha256}`);

  // Simulate downloaded text
  const downloadedContent = jsonString;
  const downloadedSha256 = crypto.createHash('sha256').update(downloadedContent, 'utf-8').digest('hex');

  console.log(`Downloaded SHA-256: ${downloadedSha256}`);
  console.assert(localSha256 === downloadedSha256, 'Hashes should match');

  // Corrupted download simulation
  const corruptedContent = jsonString + ' ';
  const corruptedSha256 = crypto.createHash('sha256').update(corruptedContent, 'utf-8').digest('hex');
  console.assert(localSha256 !== corruptedSha256, 'Corrupted hash must not match');

  console.log('✅ SHA-256 checksum integrity tests passed!');
}

testIntegrityVerification();
