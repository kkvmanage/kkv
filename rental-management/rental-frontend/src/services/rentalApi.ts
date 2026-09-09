import { request } from './api.ts';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  RentalDashboardData,
  MonthlyRentReportItem,
  PaymentModeReportData,
  SyncSummary,
  ShopMonthlyStatus,
  AuditLog,
  RentalStatus,
  PaymentMode,
  ExpenseCategory,
} from '../types/rental.types.ts';

export const rentalApi = {
  // Complexes
  getComplexes: async (): Promise<{ success: boolean; data: RentalComplex[] }> => {
    return request('/rental/complexes');
  },

  getComplexById: async (id: string): Promise<{ success: boolean; data: RentalComplex }> => {
    return request(`/rental/complexes/${id}`);
  },

  createComplex: async (data: { complexName: string; location: string; status?: RentalStatus }): Promise<{ success: boolean; data: RentalComplex; message: string }> => {
    return request('/rental/complexes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateComplex: async (id: string, data: Partial<RentalComplex>): Promise<{ success: boolean; data: RentalComplex; message: string }> => {
    return request(`/rental/complexes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Shops
  getShops: async (complexId?: string, status?: RentalStatus): Promise<{ success: boolean; data: RentalShop[] }> => {
    const params = new URLSearchParams();
    if (complexId) params.append('complexId', complexId);
    if (status) params.append('status', status);
    const qs = params.toString();
    return request(`/rental/shops${qs ? `?${qs}` : ''}`);
  },

  getShopById: async (id: string): Promise<{ success: boolean; data: RentalShop }> => {
    return request(`/rental/shops/${id}`);
  },

  getShopMonthlyStatus: async (id: string, month?: string): Promise<{ success: boolean; data: ShopMonthlyStatus }> => {
    const qs = month ? `?month=${month}` : '';
    return request(`/rental/shops/${id}/monthly-status${qs}`);
  },

  createShop: async (data: {
    complexId: string;
    shopNumber: string;
    shopName: string;
    tenantName: string;
    mobileNumber: string;
    monthlyRent: number;
    status?: RentalStatus;
  }): Promise<{ success: boolean; data: RentalShop; message: string }> => {
    return request('/rental/shops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateShop: async (id: string, data: Partial<RentalShop>): Promise<{ success: boolean; data: RentalShop; message: string }> => {
    return request(`/rental/shops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Payments
  getPayments: async (filters?: {
    complexId?: string;
    shopId?: string;
    month?: string;
    paymentMode?: PaymentMode;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: RentalPayment[] }> => {
    const params = new URLSearchParams();
    if (filters?.complexId) params.append('complexId', filters.complexId);
    if (filters?.shopId) params.append('shopId', filters.shopId);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.paymentMode) params.append('paymentMode', filters.paymentMode);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString();
    return request(`/rental/payments${qs ? `?${qs}` : ''}`);
  },

  createPayment: async (data: {
    complexId: string;
    shopId: string;
    paymentMonth: string;
    amountReceived: number;
    paymentMode: PaymentMode;
    cashAmount?: number;
    gpayAmount?: number;
    advanceToUse?: number;
    paymentDate: string;
    mobileNumber?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: RentalPayment; message: string }> => {
    return request('/rental/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Expenses
  getExpenses: async (filters?: {
    complexId?: string;
    shopId?: string;
    category?: ExpenseCategory;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: RentalExpense[] }> => {
    const params = new URLSearchParams();
    if (filters?.complexId) params.append('complexId', filters.complexId);
    if (filters?.shopId) params.append('shopId', filters.shopId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString();
    return request(`/rental/expenses${qs ? `?${qs}` : ''}`);
  },

  createExpense: async (data: {
    complexId: string;
    shopId?: string;
    expenseDate: string;
    category: ExpenseCategory;
    expenseReason: string;
    expenseAmount: number;
    paymentMode: PaymentMode;
    cashAmount?: number;
    gpayAmount?: number;
    notes?: string;
  }): Promise<{ success: boolean; data: RentalExpense; message: string }> => {
    return request('/rental/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteExpense: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request(`/rental/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  // Dashboard & Analytics
  getDashboardData: async (month?: string): Promise<{ success: boolean; data: RentalDashboardData }> => {
    const qs = month ? `?month=${month}` : '';
    return request(`/rental/dashboard${qs}`);
  },

  getMonthlyReport: async (month?: string): Promise<{ success: boolean; data: MonthlyRentReportItem[] }> => {
    const qs = month ? `?month=${month}` : '';
    return request(`/rental/reports/monthly${qs}`);
  },

  getPaymentModeReport: async (startDate?: string, endDate?: string): Promise<{ success: boolean; data: PaymentModeReportData }> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();
    return request(`/rental/reports/payment-modes${qs ? `?${qs}` : ''}`);
  },

  getAuditLogs: async (): Promise<{ success: boolean; data: AuditLog[] }> => {
    return request('/rental/audit-logs');
  },

  // Google Sync
  getSyncStatus: async (): Promise<{ success: boolean; data: SyncSummary }> => {
    return request('/sync/status');
  },

  triggerSync: async (): Promise<{ success: boolean; message: string; data: any }> => {
    return request('/sync/trigger', {
      method: 'POST',
    });
  },

  testGoogleConnection: async (): Promise<{ success: boolean; message: string }> => {
    return request('/sync/test-connection');
  },
};
