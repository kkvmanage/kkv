import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { syncQueueService } from './syncQueue.service.js';
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

  public create(receiptData: Omit<Receipt, 'id'> & { receiptNo?: number }): Receipt {
    const receipts = this.getAll();
    const nextNo = receipts.length > 0 ? Math.max(...receipts.map((r) => r.receiptNo)) + 1 : 1;
    const receiptNo = receiptData.receiptNo && receiptData.receiptNo > 0 ? receiptData.receiptNo : nextNo;

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

