// API Client Service connecting Frontend to Local Node.js + Express Backend (http://localhost:8080/api)
// with persistent Google Drive storage sync

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL) || 'http://localhost:8080/api';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch (err) {
    console.warn(`[Backend Sync] Server unreachable at ${API_BASE_URL}${endpoint}. Utilizing local fallback.`);
    return null;
  }
}

export const apiService = {
  // Health
  async getHealth() {
    return fetchJson<{ application: string; storage: string; googleDrive: string }>('/health');
  },

  // Customers
  async getCustomers() {
    return fetchJson<any[]>('/customers');
  },
  async createCustomer(customer: any) {
    return fetchJson<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  // Loans
  async getLoans() {
    return fetchJson<any[]>('/loans');
  },
  async createLoan(loan: any) {
    return fetchJson<any>('/loans', {
      method: 'POST',
      body: JSON.stringify(loan),
    });
  },
  async topUpLoan(loanNo: string, amount: number, date: string, notes: string) {
    return fetchJson<any>(`/loans/${loanNo}/top-up`, {
      method: 'POST',
      body: JSON.stringify({ amount, date, notes }),
    });
  },
  async closeLoan(loanNo: string) {
    return fetchJson<any>(`/loans/${loanNo}/close`, {
      method: 'POST',
    });
  },

  // Receipts
  async getReceipts() {
    return fetchJson<any[]>('/receipts');
  },
  async createReceipt(receipt: any) {
    return fetchJson<any>('/receipts', {
      method: 'POST',
      body: JSON.stringify(receipt),
    });
  },

  // Fixed Deposits
  async getFDCustomers() {
    return fetchJson<any[]>('/fd/customers');
  },
  async createFDCustomer(customer: any) {
    return fetchJson<any>('/fd/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },
  async getFixedDeposits() {
    return fetchJson<any[]>('/fd/deposits');
  },
  async createFixedDeposit(fd: any) {
    return fetchJson<any>('/fd/deposits', {
      method: 'POST',
      body: JSON.stringify(fd),
    });
  },
  async payFDInterest(fdNo: string, amount: number, mode: string) {
    return fetchJson<any>(`/fd/deposits/${fdNo}/payout`, {
      method: 'POST',
      body: JSON.stringify({ amount, mode })
    });
  },
  async withdrawFD(fdNo: string, mode: string, notes?: string) {
    return fetchJson<any>(`/fd/deposits/${fdNo}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ mode, notes })
    });
  },

  // Accounting / Day Book
  async getDayBook() {
    return fetchJson<any[]>('/accounting/day-book');
  },
  async createVoucher(entry: any) {
    return fetchJson<any>('/accounting/vouchers', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
  async getBalances() {
    return fetchJson<{ cashInHand: number; cashAtBank: number }>('/accounting/balances');
  },

  // Dashboard
  async getDashboardSummary() {
    return fetchJson<any>('/dashboard/summary');
  },

  // Admin & Settings
  async getMasterSettings() {
    return fetchJson<any>('/admin/settings');
  },
  async updateMasterSettings(settings: any) {
    return fetchJson<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },
  async getWhatsAppTemplates() {
    return fetchJson<any>('/admin/whatsapp-templates');
  },
  async updateWhatsAppTemplates(templates: any) {
    return fetchJson<any>('/admin/whatsapp-templates', {
      method: 'PUT',
      body: JSON.stringify(templates)
    });
  },

  // Backup & Restore
  async exportBackup() {
    return fetchJson<any>('/backup/export');
  },
  async restoreBackup(data: any) {
    return fetchJson<any>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

