const path = require('path');
const { google } = require(path.resolve(__dirname, '../backend/node_modules/googleapis'));
const dotenv = require(path.resolve(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function testOAuthDrive() {
  console.log('Testing OAuth Drive...');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  console.log('Client ID:', clientId ? clientId.slice(0, 15) + '...' : 'NONE');
  console.log('Redirect URI:', redirectUri);
  console.log('Refresh Token:', refreshToken ? refreshToken.slice(0, 15) + '...' : 'NONE');
  console.log('Root Folder ID:', rootFolderId);

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const tokenRes = await oauth2Client.getAccessToken();
    console.log('Access token obtained successfully!', tokenRes.token ? 'YES' : 'NO');

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    console.log('OAuth User Email:', userInfo.data.email);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const rootRes = await drive.files.get({
      fileId: rootFolderId,
      fields: 'id, name, mimeType, trashed, capabilities',
      supportsAllDrives: true
    });
    console.log('Root Folder Name:', rootRes.data.name, 'ID:', rootRes.data.id, 'Capabilities:', rootRes.data.capabilities);

    // Test creating a small test file in root folder and deleting it
    console.log('Testing test file upload in folder via OAuth...');
    const testFile = await drive.files.create({
      requestBody: {
        name: `KKV_TEST_${Date.now()}.txt`,
        parents: [rootFolderId]
      },
      media: {
        mimeType: 'text/plain',
        body: 'OAuth Drive Health Check Test'
      },
      fields: 'id, name, size',
      supportsAllDrives: true
    });
    console.log('Test file created! ID:', testFile.data.id, 'Size:', testFile.data.size);

    await drive.files.delete({ fileId: testFile.data.id, supportsAllDrives: true });
    console.log('Test file deleted! OAuth write permission 100% verified.');

  } catch (err) {
    console.error('OAuth test error:', err.message || err);
    if (err.response?.data) {
      console.error('Error details:', err.response.data);
    }
  }
}

testOAuthDrive();
