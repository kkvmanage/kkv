import assert from 'assert';

const BASE_URL = 'http://localhost:8080/api';

async function runTests() {
    console.log('🚀 Starting Admin Portal API Integration Tests...');

    // Helper function for POST/PUT/GET requests
    async function request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const json = await response.json();
        return { status: response.status, data: json };
    }

    try {
        // 1. Test Password Unlock API
        console.log('\n🔑 Testing Password Unlock Endpoint...');

        // Test correct password
        const unlockRes = await request('/admin/unlock', 'POST', { password: 'admin123' });
        console.log('Unlock correct response:', unlockRes);
        assert.strictEqual(unlockRes.status, 200);
        assert.strictEqual(unlockRes.data.success, true);
        assert.strictEqual(unlockRes.data.message, 'Master Control unlocked');

        // Test incorrect password
        const unlockFailRes = await request('/admin/unlock', 'POST', { password: 'wrongpassword' });
        console.log('Unlock incorrect response:', unlockFailRes);
        assert.strictEqual(unlockFailRes.status, 401);
        assert.strictEqual(unlockFailRes.data.success, false);

        // 2. Test Get/Put Master Settings API
        console.log('\n⚙️ Testing Master Settings Endpoint...');

        // Fetch initial settings
        const settingsGet = await request('/admin/settings');
        console.log('GET Settings Status:', settingsGet.status);
        assert.strictEqual(settingsGet.status, 200);
        assert.strictEqual(settingsGet.data.success, true);

        const initialSettings = settingsGet.data.data;
        assert.ok(initialSettings.goldLoanMonthlyRate !== undefined);
        assert.ok(Array.isArray(initialSettings.amountBands));
        assert.ok(Array.isArray(initialSettings.areas));

        // Update settings (e.g. modify silver loan rate, change lockers toggle, update new card fees and overdue method)
        const testSettingsUpdate = {
            ...initialSettings,
            silverLoanMonthlyRate: 2.75,
            lockersEnabled: true,
            silverShowOnLoanIssue: false,
            pronoteShowOnLoanIssue: false,
            pronoteRate: 15,
            goldCardFeeEnabled: false,
            goldCardFee: 25,
            silverCardFeeEnabled: false,
            silverCardFee: 30,
            pronoteCardFeeEnabled: false,
            pronoteCardFee: 35,
            hireCardFeeEnabled: false,
            hireCardFee: 40,
            overdueCalculationMethod: 'Exact days — calculation based on actual days late',
            areas: [...initialSettings.areas, 'Test Temp Area']
        };

        console.log('Updating settings details...');
        const settingsPut = await request('/admin/settings', 'PUT', testSettingsUpdate);
        assert.strictEqual(settingsPut.status, 200);
        assert.strictEqual(settingsPut.data.success, true);
        assert.strictEqual(settingsPut.data.data.silverLoanMonthlyRate, 2.75);
        assert.strictEqual(settingsPut.data.data.lockersEnabled, true);
        assert.strictEqual(settingsPut.data.data.silverShowOnLoanIssue, false);
        assert.strictEqual(settingsPut.data.data.pronoteShowOnLoanIssue, false);
        assert.strictEqual(settingsPut.data.data.pronoteRate, 15);
        assert.strictEqual(settingsPut.data.data.goldCardFeeEnabled, false);
        assert.strictEqual(settingsPut.data.data.goldCardFee, 25);
        assert.strictEqual(settingsPut.data.data.silverCardFeeEnabled, false);
        assert.strictEqual(settingsPut.data.data.silverCardFee, 30);
        assert.strictEqual(settingsPut.data.data.pronoteCardFeeEnabled, false);
        assert.strictEqual(settingsPut.data.data.pronoteCardFee, 35);
        assert.strictEqual(settingsPut.data.data.hireCardFeeEnabled, false);
        assert.strictEqual(settingsPut.data.data.hireCardFee, 40);
        assert.strictEqual(settingsPut.data.data.overdueCalculationMethod, 'Exact days — calculation based on actual days late');
        assert.ok(settingsPut.data.data.areas.includes('Test Temp Area'));

        // Fetch again to verify persistence
        const settingsGetVerify = await request('/admin/settings');
        assert.strictEqual(settingsGetVerify.data.data.silverLoanMonthlyRate, 2.75);
        assert.strictEqual(settingsGetVerify.data.data.lockersEnabled, true);
        assert.strictEqual(settingsGetVerify.data.data.silverShowOnLoanIssue, false);
        assert.strictEqual(settingsGetVerify.data.data.pronoteShowOnLoanIssue, false);
        assert.strictEqual(settingsGetVerify.data.data.pronoteRate, 15);
        assert.strictEqual(settingsGetVerify.data.data.goldCardFeeEnabled, false);
        assert.strictEqual(settingsGetVerify.data.data.goldCardFee, 25);
        assert.strictEqual(settingsGetVerify.data.data.silverCardFeeEnabled, false);
        assert.strictEqual(settingsGetVerify.data.data.silverCardFee, 30);
        assert.strictEqual(settingsGetVerify.data.data.pronoteCardFeeEnabled, false);
        assert.strictEqual(settingsGetVerify.data.data.pronoteCardFee, 35);
        assert.strictEqual(settingsGetVerify.data.data.hireCardFeeEnabled, false);
        assert.strictEqual(settingsGetVerify.data.data.hireCardFee, 40);
        assert.strictEqual(settingsGetVerify.data.data.overdueCalculationMethod, 'Exact days — calculation based on actual days late');
        assert.ok(settingsGetVerify.data.data.areas.includes('Test Temp Area'));
        console.log('✔️ Master settings GET/PUT validated and verified persistent');

        // Clean up settings to original values
        console.log('Reverting settings back...');
        const settingsRevert = await request('/admin/settings', 'PUT', initialSettings);
        assert.strictEqual(settingsRevert.status, 200);

        // 3. Test Get/Put WhatsApp Templates API
        console.log('\n💬 Testing WhatsApp Templates Endpoint...');

        // Fetch initial templates
        const templatesGet = await request('/admin/whatsapp-templates');
        assert.strictEqual(templatesGet.status, 200);
        assert.strictEqual(templatesGet.data.success, true);
        const initialTemplates = templatesGet.data.data;
        assert.ok(initialTemplates.welcomeMessage !== undefined);

        // Update templates
        const testTemplatesUpdate = {
            welcomeMessage: 'Test Welcome message template {name}',
            dueReminderMessage: 'Test Due Reminder template {amount}',
            receiptMessage: 'Test Receipt template {billNo}'
        };

        const templatesPut = await request('/admin/whatsapp-templates', 'PUT', testTemplatesUpdate);
        assert.strictEqual(templatesPut.status, 200);
        assert.strictEqual(templatesPut.data.success, true);
        assert.strictEqual(templatesPut.data.data.welcomeMessage, 'Test Welcome message template {name}');

        // Fetch templates again to verify persistence
        const templatesGetVerify = await request('/admin/whatsapp-templates');
        assert.strictEqual(templatesGetVerify.data.data.welcomeMessage, 'Test Welcome message template {name}');
        assert.strictEqual(templatesGetVerify.data.data.dueReminderMessage, 'Test Due Reminder template {amount}');
        console.log('✔️ WhatsApp templates GET/PUT validated and verified persistent');

        // Revert templates
        console.log('Reverting templates back...');
        const templatesRevert = await request('/admin/whatsapp-templates', 'PUT', initialTemplates);
        assert.strictEqual(templatesRevert.status, 200);

        console.log('\n🎉 ALL ADMIN PORTAL API TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ Test Failure detected:');
        console.error(error);
        process.exit(1);
    }
}

runTests();
