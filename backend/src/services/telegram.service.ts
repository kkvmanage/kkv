import { adminService } from './admin.service.js';
import { backupService } from './backup.service.js';

export class TelegramService {
    public async sendTestMessage(): Promise<{ success: boolean; message: string }> {
        const config = adminService.getTelegramConfig();
        if (!config.botToken || !config.chatId) {
            return { success: false, message: 'Bot Token or Chat ID is missing.' };
        }

        try {
            const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.chatId,
                    text: `⚙️ KKV Gold Finance - Telegram integration test successful!\nTimestamp: ${new Date().toLocaleString()}`
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                return { success: false, message: `Telegram Error: ${res.statusText} (${errorText})` };
            }

            return { success: true, message: 'Test message sent successfully.' };
        } catch (err: any) {
            return { success: false, message: `Connection Error: ${err.message}` };
        }
    }

    public async sendBackup(): Promise<{ success: boolean; message: string }> {
        const config = adminService.getTelegramConfig();
        if (!config.botToken || !config.chatId) {
            return { success: false, message: 'Bot Token or Chat ID is missing.' };
        }

        try {
            const backupResult = backupService.exportBackup();
            const filename = `KKV_Gold_Finance_Backup_${new Date().toISOString().slice(0, 10)}.json`;

            const blob = new Blob([JSON.stringify(backupResult.data, null, 2)], { type: 'application/json' });
            const formData = new FormData();
            formData.append('chat_id', config.chatId);
            formData.append('document', blob, filename);
            formData.append('caption', `📦 KKV Gold Finance Branch Database Backup\nTimestamp: ${new Date().toLocaleString()}\nCustomers: ${backupResult.data.customers.length}\nLoans: ${backupResult.data.loans.length}\nFDs: ${backupResult.data.fixedDeposits.length}`);

            const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorText = await res.text();
                return { success: false, message: `Telegram Error: ${res.statusText} (${errorText})` };
            }

            // Update last backup date in telegram config
            const dateStr = new Date().toLocaleString('en-GB');
            adminService.updateTelegramConfig({ lastBackupDate: dateStr });

            return { success: true, message: 'Database backup file dispatched to Telegram.' };
        } catch (err: any) {
            return { success: false, message: `Backup execution error: ${err.message}` };
        }
    }
}

export const telegramService = new TelegramService();
