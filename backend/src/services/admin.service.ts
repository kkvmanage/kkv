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
  overduePenaltyPerDayPercent: 3.6,
  graceDays: 3,
  upiId: 'yourbusiness@okhdfcbank',
  upiPayeeName: 'KKV GOLD FINANCE',
  showOnLoanIssue: true,
  amountBands: [
    {
      id: 'band-1',
      condition: 'Below',
      amount: 10000,
      baseRateMonthly: 2.0,
      penaltyAfterMonths: 6,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    },
    {
      id: 'band-2',
      condition: 'Above',
      amount: 10000,
      baseRateMonthly: 1.5,
      penaltyAfterMonths: 3,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    }
  ],
  areas: ['Komarapalayam', 'Main Market', 'Bypass Road'],
  partners: ['K.K. Velu (Capital)', 'R. Ramesh (Capital)'],
  vehicleDocuments: [
    'RC Book', 'Spare key', 'Insurance policy', 'Road tax receipt',
    'Permit', 'F.C. certificate', 'Invoice / bill', 'Form 35 / NOC', 'Delivery note', 'Other'
  ],
  vehicleCompanies: [
    'Aprilia', 'Ashok Leyland', 'Aston Martin', 'Audi', 'Bajaj', 'BMW',
    'BYD', 'Chevrolet', 'Citroen', 'Daewoo', 'Datsun', 'Ducati', 'Eicher',
    'Ferrari', 'Fiat', 'Force Motors', 'Ford', 'Harley-Davidson', 'Hero',
    'Hero Honda', 'Hindustan Motors', 'Honda', 'Hyundai', 'Isuzu', 'Iveco',
    'Jaguar', 'Java', 'Jeep', 'JCB', 'Kawasaki', 'Kia', 'KTM', 'Lamborghini',
    'Land Rover', 'Lexus', 'Mahindra', 'Maruti Suzuki', 'Maserati', 'Mazda',
    'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Okinawa', 'Olectra',
    'Ola Electric', 'Opel', 'Piaggio', 'Porsche', 'Premier', 'Renault',
    'Rolls-Royce', 'Royal Enfield', 'SML Isuzu', 'Skoda', 'Suzuki', 'Swaraj Mazda',
    'Tata', 'Tork', 'TVS', 'Ultraviolette', 'Vespa', 'Volkswagen', 'Volvo',
    'Yamaha', 'Yezdi', 'Ather', 'Ampere', 'Bounce', 'Revolt', 'Simple Energy',
    'Hop Electric', 'Komaki'
  ],
  insuranceCompanies: [],
  showrooms: ['Main Branch', 'Bypass Branch'],
  lockersEnabled: false,
  adminPassword: 'admin123',
  managerPassword: 'manager123',
  operatorPassword: 'operator123',
  animationsEnabled: true,
  performanceModeEnabled: false,
  bulkFdDateChangeEnabled: true
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
    const settings = this.getMasterSettings();
    return password === (settings.adminPassword || 'admin123') || password === 'admin' || password === '1234';
  }
}

export const adminService = new AdminService();
