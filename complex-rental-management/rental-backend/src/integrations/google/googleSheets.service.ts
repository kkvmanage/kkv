import { google } from 'googleapis';
import { config } from '../../config/app.config.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  AuditLog
} from '../../types/rental.types.js';

export class GoogleSheetsService {
  private auth: any = null;
  private sheets: any = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): boolean {
    if (!config.google.clientEmail || !config.google.privateKey || !config.google.spreadsheetId) {
      return false;
    }

    try {
      this.auth = new google.auth.JWT({
        email: config.google.clientEmail,
        key: config.google.privateKey,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      return true;
    } catch (err) {
      console.warn('Google Sheets service failed to initialize:', err);
      this.initialized = false;
      return false;
    }
  }

  isReady(): boolean {
    if (!this.initialized) {
      return this.init();
    }
    return true;
  }

  async ensureSheetHeaders(): Promise<void> {
    if (!this.isReady()) return;

    const spreadsheetId = config.google.spreadsheetId;
    const requiredSheets = [
      {
        title: 'Complexes',
        headers: ['complex_id', 'complex_name', 'location', 'status', 'created_at', 'updated_at']
      },
      {
        title: 'Shops',
        headers: [
          'shop_id',
          'complex_id',
          'shop_number',
          'shop_name',
          'tenant_name',
          'mobile_number',
          'monthly_rent',
          'status',
          'created_at',
          'updated_at'
        ]
      },
      {
        title: 'RentPayments',
        headers: [
          'payment_id',
          'complex_id',
          'shop_id',
          'payment_month',
          'monthly_rent',
          'amount_received',
          'advance_used',
          'advance_generated',
          'balance',
          'payment_mode',
          'cash_amount',
          'gpay_amount',
          'payment_date',
          'mobile_number',
          'notes',
          'created_at',
          'updated_at'
        ]
      },
      {
        title: 'Expenses',
        headers: [
          'expense_id',
          'complex_id',
          'shop_id',
          'expense_date',
          'category',
          'expense_reason',
          'amount',
          'payment_mode',
          'cash_amount',
          'gpay_amount',
          'notes',
          'created_at',
          'updated_at'
        ]
      },
      {
        title: 'AuditLogs',
        headers: ['audit_id', 'user_id', 'action', 'entity_type', 'entity_id', 'timestamp']
      }
    ];

    try {
      const meta = await this.sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (meta.data.sheets || []).map((s: any) => s.properties?.title);

      for (const sheet of requiredSheets) {
        if (!existingSheets.includes(sheet.title)) {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: { title: sheet.title }
                  }
                }
              ]
            }
          });

          await this.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheet.title}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [sheet.headers]
            }
          });
        }
      }
    } catch (err) {
      console.warn('Google Sheets header verification warning:', err);
    }
  }

  async syncComplex(complex: RentalComplex): Promise<void> {
    if (!this.isReady()) throw new Error('Google Sheets sync is not configured');
    const spreadsheetId = config.google.spreadsheetId;

    const row = [
      complex.complexId,
      complex.complexName,
      complex.location,
      complex.status,
      complex.createdAt,
      complex.updatedAt
    ];

    await this.appendOrUpdateRow(spreadsheetId, 'Complexes', complex.complexId, row);
  }

  async syncShop(shop: RentalShop): Promise<void> {
    if (!this.isReady()) throw new Error('Google Sheets sync is not configured');
    const spreadsheetId = config.google.spreadsheetId;

    const row = [
      shop.shopId,
      shop.complexId,
      shop.shopNumber,
      shop.shopName,
      shop.tenantName,
      shop.mobileNumber,
      shop.monthlyRent,
      shop.status,
      shop.createdAt,
      shop.updatedAt
    ];

    await this.appendOrUpdateRow(spreadsheetId, 'Shops', shop.shopId, row);
  }

  async syncPayment(payment: RentalPayment): Promise<void> {
    if (!this.isReady()) throw new Error('Google Sheets sync is not configured');
    const spreadsheetId = config.google.spreadsheetId;

    const row = [
      payment.paymentId,
      payment.complexId,
      payment.shopId,
      payment.paymentMonth,
      payment.monthlyRent,
      payment.amountReceived,
      payment.advanceUsed,
      payment.advanceGenerated,
      payment.balanceAfterPayment,
      payment.paymentMode,
      payment.cashAmount,
      payment.gpayAmount,
      payment.paymentDate,
      payment.mobileNumber || '',
      payment.notes || '',
      payment.createdAt,
      payment.updatedAt
    ];

    await this.appendOrUpdateRow(spreadsheetId, 'RentPayments', payment.paymentId, row);
  }

  async syncExpense(expense: RentalExpense): Promise<void> {
    if (!this.isReady()) throw new Error('Google Sheets sync is not configured');
    const spreadsheetId = config.google.spreadsheetId;

    const row = [
      expense.expenseId,
      expense.complexId,
      expense.shopId || '',
      expense.expenseDate,
      expense.category,
      expense.expenseReason,
      expense.expenseAmount,
      expense.paymentMode,
      expense.cashAmount,
      expense.gpayAmount,
      expense.notes || '',
      expense.createdAt,
      expense.updatedAt
    ];

    await this.appendOrUpdateRow(spreadsheetId, 'Expenses', expense.expenseId, row);
  }

  async syncAuditLog(log: AuditLog): Promise<void> {
    if (!this.isReady()) return;
    const spreadsheetId = config.google.spreadsheetId;

    const row = [log.auditId, log.userId, log.action, log.entityType, log.entityId, log.timestamp];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'AuditLogs!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    } catch (err) {
      console.warn('AuditLog sheets append failed:', err);
    }
  }

  private async appendOrUpdateRow(
    spreadsheetId: string,
    sheetTitle: string,
    entityId: string,
    row: any[]
  ): Promise<void> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:A`
    });

    const rows = res.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === entityId) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (rowIndex > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    } else {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
