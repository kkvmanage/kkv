import { google, sheets_v4 } from 'googleapis';
import { config } from '../../config/app.config.js';
import { googleDriveRentalService } from './googleDriveRental.service.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  AuditLog
} from '../../types/rental.types.js';

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private initialized = false;
  private spreadsheetId: string = (config.google.spreadsheetId || '').trim();
  private authType: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' = 'NONE';

  constructor() {
    this.init();
  }

  public init(): boolean {
    try {
      this.spreadsheetId = (config.google.spreadsheetId || '').trim();

      // 1. Check if OAuth client is available from GoogleDriveRentalService
      if (googleDriveRentalService.isReady()) {
        const authClient = googleDriveRentalService.getAuthClient();
        if (authClient) {
          this.sheets = google.sheets({ version: 'v4', auth: authClient });
          this.authType = googleDriveRentalService.getAuthMode();
          this.initialized = true;
          console.log(`[GoogleSheetsService] ✅ Initialized Google Sheets API via ${this.authType}`);
          return true;
        }
      }

      // 2. Fallback: Standalone Service Account
      if (config.google.clientEmail && config.google.privateKey) {
        try {
          const formattedKey = config.google.privateKey.replace(/\\n/g, '\n');
          const jwtClient = new google.auth.JWT({
            email: config.google.clientEmail,
            key: formattedKey,
            scopes: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive'
            ]
          });
          this.sheets = google.sheets({ version: 'v4', auth: jwtClient });
          this.authType = 'SERVICE_ACCOUNT';
          this.initialized = true;
          console.log('[GoogleSheetsService] 🏢 Initialized Google Sheets API via Service Account');
          return true;
        } catch (saErr) {
          console.warn('[GoogleSheetsService] Service Account init warning:', saErr);
        }
      }

      this.initialized = false;
      this.sheets = null;
      this.authType = 'NONE';
      return false;
    } catch (err: any) {
      console.warn('[GoogleSheetsService] Failed to initialize Google Sheets service:', err?.message || err);
      this.initialized = false;
      this.sheets = null;
      this.authType = 'NONE';
      return false;
    }
  }

  public isReady(): boolean {
    if (!this.initialized || !this.sheets) {
      return this.init();
    }
    return true;
  }

  public getAuthMode(): string {
    return this.authType;
  }

  public getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  /**
   * Discovers or creates a dedicated Rental Spreadsheet in Google Drive if not explicitly set.
   */
  public async ensureSpreadsheet(): Promise<string> {
    if (this.spreadsheetId) return this.spreadsheetId;

    if (!this.isReady() || !this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      // Create new spreadsheet in Google Drive
      const createRes = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'KKV_Rental_Management_Live_Mirror'
          }
        }
      });

      const newId = createRes.data.spreadsheetId;
      if (newId) {
        this.spreadsheetId = newId;
        console.log(`[GoogleSheetsService] 📊 Created live Google Sheets spreadsheet (${newId})`);
        await this.ensureSheetHeaders();
        return newId;
      }
    } catch (err: any) {
      console.warn('[GoogleSheetsService] Could not auto-create spreadsheet:', err?.message || err);
    }

    return this.spreadsheetId;
  }

  public async verifyAccess(): Promise<{ success: boolean; message: string; spreadsheetTitle?: string }> {
    if (!this.isReady() || !this.sheets) {
      return { success: false, message: 'Google Sheets service not initialized' };
    }

    try {
      const sId = await this.ensureSpreadsheet();
      if (!sId) {
        return { success: true, message: 'Google Sheets authentication ready (OAuth active)' };
      }

      const meta = await this.sheets.spreadsheets.get({ spreadsheetId: sId });
      const title = meta.data.properties?.title || 'KKV Rental Mirror';
      return {
        success: true,
        message: `Connected to Google Sheets: ${title}`,
        spreadsheetTitle: title
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Google Sheets access warning: ${err?.message || err}`
      };
    }
  }

  public async ensureSheetHeaders(): Promise<void> {
    if (!this.isReady() || !this.sheets) return;

    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

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
      console.warn('[GoogleSheetsService] Header verification notice:', err);
    }
  }

  public async syncComplex(complex: RentalComplex): Promise<void> {
    if (!this.isReady() || !this.sheets) return;
    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

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

  public async syncShop(shop: RentalShop): Promise<void> {
    if (!this.isReady() || !this.sheets) return;
    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

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

  public async syncPayment(payment: RentalPayment): Promise<void> {
    if (!this.isReady() || !this.sheets) return;
    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

    const row = [
      payment.paymentId,
      payment.complexId,
      payment.shopId,
      payment.paymentMonth,
      payment.monthlyRent,
      payment.amountReceived,
      payment.advanceUsed,
      payment.advanceGenerated,
      payment.balanceAfterPayment ?? payment.balance,
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

  public async syncExpense(expense: RentalExpense): Promise<void> {
    if (!this.isReady() || !this.sheets) return;
    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

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

  public async syncAuditLog(log: AuditLog): Promise<void> {
    if (!this.isReady() || !this.sheets) return;
    const spreadsheetId = await this.ensureSpreadsheet();
    if (!spreadsheetId) return;

    const row = [log.auditId, log.userId, log.action, log.entityType, log.entityId, log.timestamp];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'AuditLogs!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    } catch (err) {
      console.warn('[GoogleSheetsService] AuditLog sheets append warning:', err);
    }
  }

  private async appendOrUpdateRow(
    spreadsheetId: string,
    sheetTitle: string,
    entityId: string,
    row: any[]
  ): Promise<void> {
    if (!this.sheets) return;

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTitle}!A:A`
      });

      const rows = res.data.values || [];
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === entityId) {
          rowIndex = i + 1; // 1-indexed for Sheets range
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
        console.log(`[GoogleSheetsService] 📝 Updated row ${rowIndex} in sheet '${sheetTitle}' for entity ${entityId}`);
      } else {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetTitle}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
        console.log(`[GoogleSheetsService] ➕ Appended new row in sheet '${sheetTitle}' for entity ${entityId}`);
      }
    } catch (err: any) {
      console.warn(`[GoogleSheetsService] appendOrUpdateRow notice on '${sheetTitle}':`, err?.message || err);
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
