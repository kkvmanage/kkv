import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { Receipt } from '../types/index.js';

const FILE_NAME = 'receipts.json';

const initialReceipts: Receipt[] = [
  {
    id: 'RCPT-1',
    receiptNo: 1,
    loanId: 'L-1',
    loanNo: 'GL-01',
    customerId: 'CUST-001',
    customerName: 'thayba',
    kind: 'NEW LOAN',
    loanType: 'GOLD LOAN',
    amount: 100000,
    principalComponent: 100000,
    interestComponent: 0,
    paymentMode: 'UPI',
    date: '25/08/2026',
    notes: 'New Loan Disbursement'
  },
  {
    id: 'RCPT-2',
    receiptNo: 2,
    loanId: 'L-1',
    loanNo: 'GL-01',
    customerId: 'CUST-001',
    customerName: 'thayba',
    kind: 'INTEREST PAYMENT',
    loanType: 'GOLD LOAN',
    amount: 1500,
    principalComponent: 0,
    interestComponent: 1500,
    paymentMode: 'Cash',
    date: '25/08/2026',
    notes: 'Monthly interest payment'
  }
];

export class ReceiptService {
  public getAll(): Receipt[] {
    return googleDriveRepository.readJson<Receipt[]>(FILE_NAME, initialReceipts);
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
    return newReceipt;
  }
}

export const receiptService = new ReceiptService();
