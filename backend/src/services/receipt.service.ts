import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { syncQueueService } from './syncQueue.service.js';
import { counterService } from './counter.service.js';
import { Receipt } from '../types/index.js';

const FILE_NAME = 'receipts.json';

const initialReceipts: Receipt[] = [];

export class ReceiptService {
  public getAll(): Receipt[] {
    const list = googleDriveRepository.readJson<Receipt[]>(FILE_NAME, initialReceipts);
    return Array.isArray(list) ? list : [];
  }

  public getById(id: string): Receipt | null {
    const receipts = this.getAll();
    return receipts.find((r) => r.id === id) || null;
  }

  public getByReceiptNo(receiptNo: number): Receipt | null {
    const receipts = this.getAll();
    return receipts.find((r) => r.receiptNo === receiptNo) || null;
  }

  public async create(receiptData: Omit<Receipt, 'id'> & { receiptNo?: number }): Promise<Receipt> {
    const receipts = this.getAll();
    let receiptNo = receiptData.receiptNo;
    if (!receiptNo || receiptNo <= 0) {
      receiptNo = await counterService.getNextSequence('receiptNo');
    }

    const newReceipt: Receipt = {
      ...receiptData,
      id: `RCPT-${Date.now()}`,
      receiptNo
    };

    receipts.unshift(newReceipt);
    googleDriveRepository.writeJson(FILE_NAME, receipts);

    // Enqueue background sync event
    syncQueueService.enqueue('receipt', String(receiptNo), 'CREATE', newReceipt);

    return newReceipt;
  }
}

export const receiptService = new ReceiptService();

