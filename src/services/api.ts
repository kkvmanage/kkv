// Central Finance Backend API Client for Desktop Multi-Staff Deployment
// Supports Centralized MongoDB Atlas + Downstream Google Drive Outbox Architecture

let customApiBaseUrl: string | null = null;

export const getApiBaseUrl = (): string => {
  if (customApiBaseUrl) return customApiBaseUrl;
  return (
    ((import.meta as any).env?.VITE_API_BASE_URL) ||
    ((import.meta as any).env?.FINANCE_API_BASE_URL) ||
    (typeof window !== 'undefined' && (window as any).__FINANCE_API_URL__) ||
    'http://localhost:8080/api'
  );
};

export const setApiBaseUrl = (url: string) => {
  customApiBaseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_BASE_URL = getApiBaseUrl();

function generateIdempotencyKey(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('kkv_auth_token') ||
    localStorage.getItem('kkv_auth_token') ||
    sessionStorage.getItem('kkv_session_token') ||
    localStorage.getItem('kkv_session_token') ||
    null
  );
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  const token = getStoredAuthToken();
  const method = (options?.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(method !== 'GET' && method !== 'HEAD' ? { 'x-idempotency-key': generateIdempotencyKey() } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (res.status === 409) {
      console.warn(`[Concurrency Conflict] Record modified concurrently on ${endpoint}.`);
      const errorJson = await res.json().catch(() => null);
      throw new Error(errorJson?.message || 'Conflict: Record was modified by another staff member. Please refresh and retry.');
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      if (errorJson?.message) {
        console.warn(`[Backend API] Request failed with ${res.status}: ${errorJson.message}`);
      }
      return null;
    }
    const json = await res.json();
    return json.data ?? json;
  } catch (err: any) {
    if (err.message && err.message.includes('Conflict:')) {
      throw err;
    }
    console.warn(`[Backend Sync] Server unreachable at ${baseUrl}${endpoint}.`);
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
  async getCustomerById(id: string) {
    return fetchJson<any>(`/customers/${encodeURIComponent(id)}`);
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
  async getFDConfig() {
    return fetchJson<any>('/fd/config');
  },
  async updateFDConfig(config: any, userRole: string = 'MASTER_ADMIN') {
    return fetchJson<any>('/fd/config', {
      method: 'PUT',
      headers: { 'user-role': userRole },
      body: JSON.stringify(config)
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
  async updateMasterSettings(settings: any, userRole: string = 'MASTER_ADMIN') {
    return fetchJson<any>('/admin/settings', {
      method: 'PUT',
      headers: { 'user-role': userRole },
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
  async backupAndClose(user?: { userId?: string; name?: string; role?: string }) {
    return fetchJson<any>('/backup/close', {
      method: 'POST',
      headers: {
        'user-id': user?.userId || 'STAFF-001',
        'user-name': user?.name || 'Staff User',
        'user-role': user?.role || 'STAFF'
      }
    });
  },
  async checkAutoRestore() {
    return fetchJson<any>('/backup/auto-restore-check');
  },
  async restoreLatestBackup() {
    return fetchJson<any>('/backup/restore-latest', {
      method: 'POST'
    });
  },
  async getSyncStatus() {
    return fetchJson<any>('/sync/status');
  },
  async retrySyncQueue() {
    return fetchJson<any>('/sync/retry', {
      method: 'POST'
    });
  },
  async getSyncEvents() {
    return fetchJson<any>('/sync/events');
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

  // Google Drive Health & OAuth Management
  async getDriveHealth(): Promise<{
    success: boolean;
    configured: boolean;
    authType: 'SERVICE_ACCOUNT' | 'OAUTH' | 'NONE';
    googlePrincipal: string;
    googleAccount?: string;
    driveAccessible: boolean;
    folderAccessible: boolean;
    folderName?: string;
    folderIdConfigured: boolean;
    writable?: boolean;
    canUpload?: boolean;
    errorCode?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/drive-health`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      return {
        success: false,
        configured: false,
        authType: 'NONE',
        googlePrincipal: '',
        driveAccessible: false,
        folderAccessible: false,
        folderIdConfigured: false,
        errorCode: 'NETWORK_ERROR',
        message: err?.message || 'Failed to connect to backend for Drive health check'
      };
    }
  },

  async getGoogleDriveAuthUrl(): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google-drive/start?json=true`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to initiate Google OAuth.' };
    }
  },

  async disconnectGoogleDrive(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/drive/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to disconnect Google Drive.' };
    }
  },

  // Production Backup Package Management
  async createBackupPackage(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during backup creation.' };
    }
  },

  async getBackupHistory(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/history`);
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data || []
      };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to load backup history.' };
    }
  },

  getBackupDownloadUrl(backupId: string): string {
    return `${API_BASE_URL}/admin/backup/${encodeURIComponent(backupId)}/download`;
  },

  async acknowledgeBackupDownload(backupId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/${encodeURIComponent(backupId)}/acknowledge-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to acknowledge download.' };
    }
  },

  async uploadBackupToDrive(backupId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/${encodeURIComponent(backupId)}/upload-to-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to upload backup to Google Drive.' };
    }
  },

  // Wipe All Data Integration
  async getWipePreview(): Promise<{
    success: boolean;
    data?: {
      counts: {
        customers: number;
        loans: number;
        receipts: number;
        fixedDeposits: number;
        fdCustomers: number;
        fdInterestPayouts: number;
        fdWithdrawals: number;
        dayBookEntries: number;
        reminders: number;
        notifications: number;
        totalOperationalRecords: number;
      };
      wipeableEntities: string[];
      preservedSystemData: string[];
    };
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wipe-all-data/preview`);
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to fetch wipe preview.' };
    }
  },

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

  // System Restore Integration
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

  async validateRestoreBackup(payload: {
    fileId?: string;
    backupId?: string;
    file?: File;
    jsonString?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      let res: Response;
      if (payload.file) {
        const formData = new FormData();
        formData.append('backupFile', payload.file);
        res = await fetch(`${API_BASE_URL}/admin/system/restore/validate`, {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch(`${API_BASE_URL}/admin/system/restore/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: payload.fileId,
            backupId: payload.backupId,
            jsonString: payload.jsonString
          })
        });
      }
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

  async executeSystemRestore(token: string, confirmationText: string): Promise<{ success: boolean; data?: any; message?: string; restore?: any; googleDrive?: any; recordCounts?: any }> {
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
        message: json.message,
        restore: json.restore,
        googleDrive: json.googleDrive,
        recordCounts: json.recordCounts
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during restore execution.' };
    }
  },

  async getRestoreHistory(): Promise<{ success: boolean; data: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/restore/history`);
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data || [] };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to load restore history.' };
    }
  },

  async retryRestoreDriveSync(restoreId: string): Promise<{ success: boolean; data?: any; message?: string; errorCode?: string; restore?: any; googleDrive?: any; recordCounts?: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/restore/${restoreId}/sync-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        data: json.data,
        message: json.message,
        errorCode: json.errorCode || json.error?.code,
        restore: json.restore,
        googleDrive: json.googleDrive,
        recordCounts: json.recordCounts
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to sync restore to Google Drive.' };
    }
  },

  // ── Device & Active Session Management ─────────────────────────────────────
  async getSessions(): Promise<{ success: boolean; data: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions`);
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data || [] };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to load sessions.' };
    }
  },

  async registerSession(sessionData: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to register session.' };
    }
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return { success: res.ok && json.success, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to revoke session.' };
    }
  },

  async revokeOtherSessions(currentSessionId: string): Promise<{ success: boolean; revokedCount?: number; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/revoke-others`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSessionId })
      });
      const json = await res.json();
      return { success: res.ok && json.success, revokedCount: json.revokedCount, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to revoke other sessions.' };
    }
  },

  async revokeAllSessions(): Promise<{ success: boolean; revokedCount?: number; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/revoke-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      return { success: res.ok && json.success, revokedCount: json.revokedCount, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to revoke all sessions.' };
    }
  },

  async checkSessionStatus(sessionId: string): Promise<{ success: boolean; data?: { isValid: boolean; session?: any }; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/check/${sessionId}`);
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to check session.' };
    }
  },

  // ── Staff & Role-Based Access Control ──────────────────────────────────────
  async getStaffList(actorHeaders?: { uid?: string; email?: string }): Promise<{ success: boolean; data: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, {
        headers: {
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        }
      });
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data || [] };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to load staff directory.' };
    }
  },

  async createStaff(
    staffData: any,
    actorHeaders?: { uid?: string; email?: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        },
        body: JSON.stringify(staffData)
      });
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to create staff account.' };
    }
  },

  async updateStaff(
    uid: string,
    updates: any,
    actorHeaders?: { uid?: string; email?: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to update staff profile.' };
    }
  },

  async toggleStaffStatus(
    uid: string,
    isActive: boolean,
    actorHeaders?: { uid?: string; email?: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${uid}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        },
        body: JSON.stringify({ isActive })
      });
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to change staff status.' };
    }
  },

  async revokeStaffSessions(
    uid: string,
    actorHeaders?: { uid?: string; email?: string }
  ): Promise<{ success: boolean; revokedCount?: number; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${uid}/revoke-sessions`, {
        method: 'POST',
        headers: {
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        }
      });
      const json = await res.json();
      return { success: res.ok && json.success, revokedCount: json.revokedCount, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to revoke staff sessions.' };
    }
  },

  async deleteStaff(
    uid: string,
    actorHeaders?: { uid?: string; email?: string }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${uid}`, {
        method: 'DELETE',
        headers: {
          'x-actor-uid': actorHeaders?.uid || '',
          'x-actor-email': actorHeaders?.email || ''
        }
      });
      const json = await res.json();
      return { success: res.ok && json.success, message: json.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete staff account.' };
    }
  },

  async getStaffAuditLogs(): Promise<{ success: boolean; data: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/audit`);
      const json = await res.json();
      return { success: res.ok && json.success, data: json.data || [] };
    } catch (err: any) {
      return { success: false, data: [], message: err?.message || 'Failed to load staff audit logs.' };
    }
  }
};
