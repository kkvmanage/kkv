import { systemRestoreService } from './src/services/systemRestore.service.js';

async function testRestoreWorkflow() {
  console.log('--- Testing System Restore Fail-Safe Requirements ---');

  // Test 1: Validate restore execution requires exact confirmation text
  try {
    await systemRestoreService.executeRestore('rt_fake_token', 'INVALID TEXT');
    console.error('FAIL: Allowed restore with invalid text!');
    process.exit(1);
  } catch (err: any) {
    console.log('PASS: Rejected invalid confirmation text:', err.message);
  }

  // Test 2: Validate restore execution requires valid token
  try {
    await systemRestoreService.executeRestore('rt_fake_token', 'RESTORE SYSTEM');
    console.error('FAIL: Allowed restore with invalid token!');
    process.exit(1);
  } catch (err: any) {
    console.log('PASS: Rejected restore with invalid token:', err.message);
  }

  console.log('ALL RESTORE FAIL-SAFE TESTS PASSED CLEANLY!');
}

testRestoreWorkflow();
