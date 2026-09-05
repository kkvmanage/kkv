import { google, sheets_v4 } from 'googleapis';
import { env } from '../../../config/env.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  RentalAuditLog
} from '../types/rental.types.js';
import { driveTokenService } from '../../../services/drive/DriveTokenService.js';

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private isConfigured: boolean = false;
  private spreadsheetId: string = (process.env.RENTAL_SPREADSHEET_ID || '').trim();

  constructor() {
    this.initAuth();
  }

  private initAuth(): boolean {
    try {
      this.spreadsheetId = (process.env.RENTAL_SPREADSHEET_ID || '').trim();

      // Check Service Account credentials first
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
      const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

      if (clientEmail && rawKey) {
        const privateKey = rawKey.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });
        this.sheets = google.sheets({ version: 'v4', auth });
        this.isConfigured = true;
        return true;
      }

      // Fallback to OAuth if configured
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const refreshToken = driveTokenService.getRefreshToken() || env.GOOGLE_REFRESH_TOKEN;

      if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          env.GOOGLE_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        this.isConfigured = true;
        return true;
      }

      this.isConfigured = false;
      this.sheets = null;
      return false;
    } catch (err) {
      console.warn('[GoogleSheetsService] Initialization warning:', err);
      this.isConfigured = false;
      this.sheets = null;
      return false;
    }
  }

  public isReady(): boolean {
    if (!this.isConfigured || !this.sheets || !this.spreadsheetId) {
      return this.initAuth() && !!this.spreadsheetId;
    }
    return true;
  }

  public getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  public async ensureHeaders(): Promise<void> {
    if (!this.isReady()) return;

    try {
      const sheetsToEnsure: { title: string; headers: string[] }[] = [
        {
          title: 'Complexes',
          headers: ['complex_id', 'complex_name', 'location', 'status', 'created_at', 'updated_at']
        },
        {
          title: 'Shops',
          headers: ['shop_id', 'complex_id', 'shop_number', 'shop_name', 'tenant_name', 'mobile_number', 'monthly_rent', 'status', 'created_at', 'updated_at']
        },
        {
          title: 'RentPayments',
          headers: ['payment_id', 'complex_id', 'shop_id', 'payment_month', 'monthly_rent', 'amount_received', 'advance_used', 'advance_generated', 'balance_amount', 'payment_mode', 'cash_amount', 'gpay_amount', 'payment_date', 'mobile_number', 'notes', 'created_at', 'updated_at']
        },
        {
          title: 'Expenses',
          headers: ['expense_id', 'complex_id', 'shop_id', 'expense_date', 'category', 'expense_reason', 'expense_amount', 'payment_mode', 'cash_amount', 'gpay_amount', 'notes', 'created_at', 'updated_at']
        },
        {
          title: 'AuditLogs',
          headers: ['log_id', 'user_id', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'timestamp']
        }
      ];

      for (const item of sheetsToEnsure) {
        try {
          const res = await this.sheets!.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${item.title}!A1:Z1`
          });
          if (!res.data.values || res.data.values.length === 0) {
            await this.sheets!.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `${item.title}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [item.headers] }
            });
          }
        } catch (e: any) {
          // If sheet does not exist, add it
          if (e.message?.includes('Unable to parse range') || e.message?.includes('not found')) {
            await this.sheets!.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: {
                requests: [{ addSheet: { properties: { title: item.title } } }]
              }
            });
            await this.sheets!.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `${item.title}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [item.headers] }
            });
          }
        }
      }
    } catch (err) {
      console.warn('[GoogleSheetsService] Header check error:', err);
    }
  }

  // ── Sync Complex ───────────────────────────────────────────────────────────
  public async syncComplex(complex: RentalComplex): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Sheets service not configured or spreadsheet ID missing' };
    }

    try {
      await this.ensureHeaders();
      const row = [
        complex.complexId,
        complex.complexName,
        complex.location,
        complex.status,
        complex.createdAt,
        complex.updatedAt
      ];

      // Check if row exists to update
      const existing = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Complexes!A2:A'
      });

      const values = existing.data.values || [];
      const rowIndex = values.findIndex((r) => r[0] === complex.complexId);

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Complexes!A${rowNum}:F${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
      } else {
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Complexes!A:F',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] }
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[GoogleSheetsService] syncComplex error:', err);
      return { success: false, error: err.message || 'Google Sheets API error' };
    }
  }

  // ── Sync Shop ──────────────────────────────────────────────────────────────
  public async syncShop(shop: RentalShop): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Sheets service not configured or spreadsheet ID missing' };
    }

    try {
      await this.ensureHeaders();
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

      const existing = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Shops!A2:A'
      });

      const values = existing.data.values || [];
      const rowIndex = values.findIndex((r) => r[0] === shop.shopId);

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Shops!A${rowNum}:J${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
      } else {
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Shops!A:J',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] }
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[GoogleSheetsService] syncShop error:', err);
      return { success: false, error: err.message || 'Google Sheets API error' };
    }
  }

  // ── Sync Payment ───────────────────────────────────────────────────────────
  public async syncPayment(payment: RentalPayment): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Sheets service not configured or spreadsheet ID missing' };
    }

    try {
      await this.ensureHeaders();
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
        payment.mobileNumber,
        payment.notes || '',
        payment.createdAt,
        payment.updatedAt
      ];

      const existing = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'RentPayments!A2:A'
      });

      const values = existing.data.values || [];
      const rowIndex = values.findIndex((r) => r[0] === payment.paymentId);

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `RentPayments!A${rowNum}:Q${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
      } else {
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'RentPayments!A:Q',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] }
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[GoogleSheetsService] syncPayment error:', err);
      return { success: false, error: err.message || 'Google Sheets API error' };
    }
  }

  // ── Sync Expense ───────────────────────────────────────────────────────────
  public async syncExpense(expense: RentalExpense): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Sheets service not configured or spreadsheet ID missing' };
    }

    try {
      await this.ensureHeaders();
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

      const existing = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Expenses!A2:A'
      });

      const values = existing.data.values || [];
      const rowIndex = values.findIndex((r) => r[0] === expense.expenseId);

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Expenses!A${rowNum}:M${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
      } else {
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Expenses!A:M',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] }
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[GoogleSheetsService] syncExpense error:', err);
      return { success: false, error: err.message || 'Google Sheets API error' };
    }
  }

  // ── Sync Audit Log ─────────────────────────────────────────────────────────
  public async syncAuditLog(log: RentalAuditLog): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Sheets service not configured or spreadsheet ID missing' };
    }

    try {
      await this.ensureHeaders();
      const row = [
        log.auditId,
        log.userId,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.oldValue || ''),
        JSON.stringify(log.newValue || ''),
        log.timestamp
      ];

      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'AuditLogs!A:H',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });

      return { success: true };
    } catch (err: any) {
      console.error('[GoogleSheetsService] syncAuditLog error:', err);
      return { success: false, error: err.message || 'Google Sheets API error' };
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
