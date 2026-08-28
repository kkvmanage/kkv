import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { Reminder } from '../types/index.js';

const FILE_NAME = 'reminders.json';

const initialReminders: Reminder[] = [
  {
    id: 'rem-1',
    title: 'Pledge Interest Due - Thayba Begum',
    date: '25/09/2026',
    customerName: 'Thayba Begum',
    loanNo: 'GL-01',
    phone: '9876543210',
    amount: 1500,
    type: 'PLEDGE_DUE',
    status: 'PENDING',
    notes: 'Monthly interest due date reminder',
    createdAt: '25/08/2026'
  }
];

export class ReminderService {
  public getAll(): Reminder[] {
    return googleDriveRepository.readJson<Reminder[]>(FILE_NAME, initialReminders);
  }

  public getById(id: string): Reminder | null {
    const reminders = this.getAll();
    return reminders.find((r) => r.id === id) || null;
  }

  public create(data: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
    const reminders = this.getAll();
    const newReminder: Reminder = {
      ...data,
      id: `REM-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-GB')
    };
    reminders.unshift(newReminder);
    googleDriveRepository.writeJson(FILE_NAME, reminders);
    return newReminder;
  }

  public update(id: string, updates: Partial<Reminder>): Reminder | null {
    const reminders = this.getAll();
    const index = reminders.findIndex((r) => r.id === id);
    if (index === -1) return null;
    reminders[index] = { ...reminders[index], ...updates };
    googleDriveRepository.writeJson(FILE_NAME, reminders);
    return reminders[index];
  }

  public delete(id: string): boolean {
    const reminders = this.getAll();
    const filtered = reminders.filter((r) => r.id !== id);
    if (filtered.length === reminders.length) return false;
    googleDriveRepository.writeJson(FILE_NAME, filtered);
    return true;
  }
}

export const reminderService = new ReminderService();
