import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { MasterControlSettings, WhatsAppTemplates, TelegramConfig } from '../types/index.js';

const SETTINGS_FILE = 'settings.json';
const WA_FILE = 'whatsapp_templates.json';
const TG_FILE = 'telegram_settings.json';

const defaultMasterSettings: MasterControlSettings = {
  goldLoanMonthlyRate: 1.5,
  silverLoanMonthlyRate: 2.0,
  pronoteMonthlyRate: 2.5,
  hirePurchaseMonthlyRate: 3.0,
  defaultCardFee: 10,
  overdueInterestRatePA: 24,
  upiId: 'yourbusiness@okhdfcbank',
  upiPayeeName: 'KKV Gold Finance'
};

const defaultWhatsAppTemplates: WhatsAppTemplates = {
  welcomeMessage: 'Dear {name}, Thank you for choosing {bankName}. Your pledge account {loanId} for ₹{principal} has been disbursed. Next due date is {dueDate}.',
  dueReminderMessage: 'Dear {name}, your interest payment for Gold Loan {loanId} (Principal ₹{principal}) is pending. Due date: {dueDate}. Total amount due: ₹{amount}. UPI ID: {upiId}',
  receiptMessage: 'Dear {name}, payment receipt #{billNo} of ₹{amount} for loan {loanId} has been successfully recorded on {date}. Thank you, {bankName}.'
};

const defaultTelegramConfig: TelegramConfig = {
  botToken: '',
  chatId: '',
  isSecured: false,
  autoBackupOnOpen: false,
  lastBackupDate: ''
};

export class AdminService {
  public getMasterSettings(): MasterControlSettings {
    return googleDriveRepository.readJson<MasterControlSettings>(SETTINGS_FILE, defaultMasterSettings);
  }

  public updateMasterSettings(data: Partial<MasterControlSettings>): MasterControlSettings {
    const current = this.getMasterSettings();
    const updated = { ...current, ...data };
    googleDriveRepository.writeJson(SETTINGS_FILE, updated);
    return updated;
  }

  public getWhatsAppTemplates(): WhatsAppTemplates {
    return googleDriveRepository.readJson<WhatsAppTemplates>(WA_FILE, defaultWhatsAppTemplates);
  }

  public updateWhatsAppTemplates(data: Partial<WhatsAppTemplates>): WhatsAppTemplates {
    const current = this.getWhatsAppTemplates();
    const updated = { ...current, ...data };
    googleDriveRepository.writeJson(WA_FILE, updated);
    return updated;
  }

  public getTelegramConfig(): TelegramConfig {
    return googleDriveRepository.readJson<TelegramConfig>(TG_FILE, defaultTelegramConfig);
  }

  public updateTelegramConfig(data: Partial<TelegramConfig>): TelegramConfig {
    const current = this.getTelegramConfig();
    const updated = { ...current, ...data };
    googleDriveRepository.writeJson(TG_FILE, updated);
    return updated;
  }

  public unlockMasterControl(password: string): boolean {
    return password === 'admin123' || password === 'admin' || password === '1234';
  }
}

export const adminService = new AdminService();
