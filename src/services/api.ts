// API Client Service connecting Frontend to Local Node.js + Express Backend (http://localhost:8080/api)
// with Google Drive integration for secure file management

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

function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; data?: T; message?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${endpoint}`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, data: json.data || json, message: json.message });
        } else {
          resolve({ success: false, message: json.message || 'Upload failed' });
        }
      } catch {
        resolve({ success: false, message: 'Invalid server response' });
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, message: 'Network error occurred during upload' });
    };

    xhr.send(formData);
  });
}

export const apiService = {
  // Health & Search & Drive Status
  async getHealth() {
    return fetchJson<{ application: string; storage: string; googleDrive: string }>('/health');
  },
  async getDriveStatus() {
    return fetchJson<{ connected: boolean; googleAccount?: string; rootFolderConfigured?: boolean; message?: string }>('/google-drive/status');
  },
  async globalSearch(query: string) {
    if (!query || !query.trim()) {
      return { customers: [], loans: [], receipts: [] };
    }
    return fetchJson<{ customers: any[]; loans: any[]; receipts: any[] }>(`/search?q=${encodeURIComponent(query)}`);
  },
  async resolveLocationLink(url: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/location/resolve-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Failed to resolve location link');
      }
      const json = await res.json();
      return json.data;
    } catch (err: any) {
      throw new Error(err.message || 'Location link resolution failed');
    }
  },
  async createCloudBackup(backupData?: any, deviceId?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData, deviceId })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Failed to create cloud backup');
      }
      const json = await res.json();
      return json.data;
    } catch (err: any) {
      throw new Error(err.message || 'Cloud backup service unreachable');
    }
  },

  // Google Drive Endpoints
  async uploadDriveFile(
    file: File,
    meta?: { folderId?: string; customerId?: string; loanId?: string; category?: string },
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.folderId) formData.append('folderId', meta.folderId);
    if (meta?.customerId) formData.append('customerId', meta.customerId);
    if (meta?.loanId) formData.append('loanId', meta.loanId);
    if (meta?.category) formData.append('category', meta.category);

    return uploadWithProgress<any>('/drive/upload', formData, onProgress);
  },

  async getDriveFiles(folderId?: string, search?: string) {
    const params = new URLSearchParams();
    if (folderId) params.append('folderId', folderId);
    if (search) params.append('search', search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<any[]>(`/drive/files${queryString}`);
  },

  async deleteDriveFile(fileId: string) {
    return fetchJson<{ success: boolean; message: string }>(`/drive/file/${fileId}`, {
      method: 'DELETE'
    });
  },

  async uploadCustomerDocument(
    customerId: string,
    file: File,
    category: 'profile' | 'kyc' = 'kyc',
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return uploadWithProgress<any>(`/drive/customers/${customerId}/documents`, formData, onProgress);
  },

  async uploadLoanDocument(
    loanId: string,
    file: File,
    category: 'document' | 'receipt' = 'document',
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return uploadWithProgress<any>(`/drive/loans/${loanId}/documents`, formData, onProgress);
  },

  // Customers
  async getCustomers(includeDeleted: boolean = false) {
    return fetchJson<any[]>(`/customers${includeDeleted ? '?includeDeleted=true' : ''}`);
  },
  async createCustomer(customer: any) {
    return fetchJson<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },
  async updateCustomer(id: string, customer: any) {
    return fetchJson<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  },
  async deleteCustomer(id: string, userRole: string = 'ADMIN') {
    return fetchJson<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
      headers: { 'user-role': userRole }
    });
  },
  async restoreCustomer(id: string, userRole: string = 'ADMIN') {
    return fetchJson<{ success: boolean; message: string }>(`/customers/${id}/restore`, {
      method: 'POST',
      headers: { 'user-role': userRole }
    });
  },
  async deleteCustomerPermanently(id: string, userRole: string = 'ADMIN') {
    return fetchJson<{ success: boolean; message: string }>(`/customers/${id}/permanent`, {
      method: 'DELETE',
      headers: { 'user-role': userRole }
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
  },

  // Telegram Integration
  async getTelegramConfig() {
    return fetchJson<any>('/telegram/config');
  },
  async updateTelegramConfig(config: any) {
    return fetchJson<any>('/telegram/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  },
  async testTelegram() {
    return fetchJson<any>('/telegram/test', {
      method: 'POST'
    });
  },
  async backupTelegram() {
    return fetchJson<any>('/telegram/backup', {
      method: 'POST'
    });
  },
  async bulkUpdateFDDates(fdNos: string[], newDepositDate?: string, offsetDays?: number) {
    return fetchJson<any>('/fd/deposits/bulk-date-change', {
      method: 'POST',
      body: JSON.stringify({ fdNos, newDepositDate, offsetDays })
    });
  },

  // Wipe All Data Integration
  async initiateWipeBackup(confirmationText: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wipe-all-data/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText })
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during backup initiation.' };
    }
  },

  async confirmSystemWipe(token: string, confirmationText: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wipe-all-data/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirmationText })
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during system wipe.' };
    }
  },

  // Hidden System Restore Integration
  async getRestoreBackups(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/backups`);
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data || [],
        message: json.message
      };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to fetch Google Drive backups.' };
    }
  },

  async validateRestoreBackup(fileId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/restore/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during backup validation.' };
    }
  },

  async executeSystemRestore(token: string, confirmationText: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirmationText })
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during system restore.' };
    }
  }
};
