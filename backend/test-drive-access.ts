import { googleDriveService } from './src/services/googleDriveService.js';

async function test() {
  console.log('Testing Google Drive Root Folder Access...');
  try {
    const res = await googleDriveService.testRootFolderAccess();
    console.log('Root Folder Access Result:', res);
  } catch (err: any) {
    console.error('Test Error:', err);
  }
}

test();
