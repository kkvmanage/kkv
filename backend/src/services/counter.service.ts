import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { getFinanceDb } from '../config/database.js';

const FILE_NAME = 'counters.json';

export class CounterService {
  private getCounters(): Record<string, number> {
    return googleDriveRepository.readJson<Record<string, number>>(FILE_NAME, { customerId: 4, loanNo: 2, receiptNo: 1, fdNo: 1 });
  }

  private setLocalIfHigher(name: string, value: number): void {
    const counters = this.getCounters();
    if ((counters[name] || 0) < value) {
      counters[name] = value;
      googleDriveRepository.writeJson(FILE_NAME, counters);
    }
  }

  /**
   * Concurrency-safe atomic counter generation via MongoDB Atlas with local fallback
   */
  public async getNextSequence(name: string): Promise<number> {
    try {
      const db = await getFinanceDb();
      if (db) {
        const result = await db.collection('counters').findOneAndUpdate(
          { _id: name as any },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: 'after' }
        );
        const seqVal = (result as any)?.seq ?? (result as any)?.value?.seq;
        if (typeof seqVal === 'number') {
          this.setLocalIfHigher(name, seqVal);
          return seqVal;
        }
      }
    } catch (err) {
      console.warn(`[CounterService] MongoDB counter atomic fetch warning for ${name}:`, err);
    }

    // Fallback to local / Drive file counter
    const counters = this.getCounters();
    const nextVal = (counters[name] || 0) + 1;
    counters[name] = nextVal;
    googleDriveRepository.writeJson(FILE_NAME, counters);
    return nextVal;
  }

  public getNextSequenceSync(name: string): number {
    const counters = this.getCounters();
    const nextVal = (counters[name] || 0) + 1;
    counters[name] = nextVal;
    googleDriveRepository.writeJson(FILE_NAME, counters);
    return nextVal;
  }

  public async setSequenceIfHigher(name: string, value: number): Promise<void> {
    try {
      const db = await getFinanceDb();
      if (db) {
        await db.collection('counters').updateOne(
          { _id: name as any },
          { $max: { seq: value } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.warn(`[CounterService] MongoDB counter update warning for ${name}:`, err);
    }

    this.setLocalIfHigher(name, value);
  }

  public async getNextCustomerId(): Promise<string> {
    const seq = await this.getNextSequence('customerId');
    return `CUST-${String(seq).padStart(3, '0')}`;
  }

  public async getNextLoanNo(): Promise<string> {
    const seq = await this.getNextSequence('loanNo');
    return `GL-${String(seq).padStart(2, '0')}`;
  }

  public async getNextReceiptNo(): Promise<string> {
    const seq = await this.getNextSequence('receiptNo');
    return `REC-${String(seq).padStart(4, '0')}`;
  }

  public async getNextFdNo(): Promise<string> {
    const seq = await this.getNextSequence('fdNo');
    return `FD-${String(seq).padStart(4, '0')}`;
  }
}

export const counterService = new CounterService();
