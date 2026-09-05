const { google } = require('../backend/node_modules/googleapis');
const { Readable } = require('stream');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function testFullFlow() {
  console.log('--- Testing Google Drive Service with Service Account ---');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const jwtClient = new google.auth.JWT(
    email,
    null,
    key,
    ['https://www.googleapis.com/auth/drive']
  );
  const drive = google.drive({ version: 'v3', auth: jwtClient });
  const rootFolderId = '15MY3DHoYCSccsIvh5j31lUOZ6ZrSYdlh';

  // 1. Verify root folder
  const root = await drive.files.get({
    fileId: rootFolderId,
    fields: 'id, name, mimeType, trashed, capabilities'
  });
  console.log('1. Root Folder:', root.data.name, 'Writable:', root.data.capabilities?.canAddChildren);

  // 2. Find or create KKV_DATABASE / Backups / Full_System_Backups
  async function getOrCreateSubfolder(name, parentId) {
    const q = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id, name)' });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id, name'
    });
    return created.data.id;
  }

  const kkvDbId = await getOrCreateSubfolder('KKV_DATABASE', rootFolderId);
  console.log('2. KKV_DATABASE Folder ID:', kkvDbId);

  const backupsId = await getOrCreateSubfolder('Backups', kkvDbId);
  console.log('3. Backups Folder ID:', backupsId);

  const fullBackupsId = await getOrCreateSubfolder('Full_System_Backups', backupsId);
  console.log('4. Full_System_Backups Folder ID:', fullBackupsId);

  // 3. Test uploading a file
  const testPayload = JSON.stringify({ test: 'health_check', timestamp: new Date().toISOString() });
  const stream = new Readable();
  stream.push(testPayload);
  stream.push(null);

  const testUpload = await drive.files.create({
    requestBody: {
      name: 'KKV_TEST_FILE.json',
      mimeType: 'application/json',
      parents: [fullBackupsId]
    },
    media: {
      mimeType: 'application/json',
      body: stream
    },
    fields: 'id, name, size, md5Checksum'
  });
  console.log('5. Uploaded Test File:', testUpload.data.id, testUpload.data.name, 'Size:', testUpload.data.size);

  // 4. Download and verify
  const download = await drive.files.get({
    fileId: testUpload.data.id,
    alt: 'media'
  }, { responseType: 'text' });
  console.log('6. Downloaded content:', download.data);

  // 5. Delete test file
  await drive.files.delete({ fileId: testUpload.data.id });
  console.log('7. Cleaned up test file successfully!');
}

testFullFlow().catch(console.error);
