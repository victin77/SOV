const BASE_URL = '/api';
const TOKEN_KEY = 'crm_token';
const REFRESH_TOKEN_KEY = 'crm_refresh_token';
const ORIGINAL_TOKEN_KEY = 'crm_original_token';
const ORIGINAL_REFRESH_TOKEN_KEY = 'crm_original_refresh_token';

export type ImportProgressEvent = {
  type: 'progress' | 'complete' | 'error';
  phase: 'preparing' | 'reading' | 'importing' | 'completed';
  processedRows: number;
  totalRows: number;
  importedRows?: number;
  message: string;
};

function isImpersonating(): boolean {
  return !!localStorage.getItem('crm_impersonate_company_id');
}

function storeSession(_token?: string | null, _refreshToken?: string | null) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_REFRESH_TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('crm_user');
  localStorage.removeItem(ORIGINAL_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_REFRESH_TOKEN_KEY);
  localStorage.removeItem('crm_impersonate_company_name');
  localStorage.removeItem('crm_impersonate_company_id');
}

async function refreshSession(_refreshToken?: string | null): Promise<{ ok?: boolean } | null> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({}),
  });

  if (!res.ok) return null;

  const data = await res.json();
  storeSession(data.token, data.refreshToken);
  return data;
}

async function request<T>(endpoint: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, credentials: 'same-origin', headers });

  const shouldHandleUnauthorizedRedirect = !['/auth/login', '/auth/refresh', '/auth/me'].includes(endpoint);

  if (res.status === 401 && shouldHandleUnauthorizedRedirect) {
    const canRefresh = allowRetry && endpoint !== '/auth/refresh' && !isImpersonating();

    if (canRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return request<T>(endpoint, options, false);
      }
    }

    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Nao autenticado');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${res.status}`);
  }

  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }

  return res.blob() as unknown as T;
}

async function requestImportXlsxWithProgress(
  base64Data: string,
  onProgress: (event: ImportProgressEvent) => void,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/import-export/xlsx/progress`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64Data }),
  });

  if (res.status === 401) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Nao autenticado');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Erro ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  if (!res.body) {
    throw new Error('Nao foi possivel acompanhar o progresso da importacao.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let finalMessage = '';

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ImportProgressEvent;
    if (event.type === 'error') {
      throw new Error(event.message || 'Erro ao importar XLSX');
    }
    onProgress(event);
    if (event.type === 'complete') {
      finalMessage = event.message;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = pending.split('\n');
    pending = lines.pop() || '';

    for (const line of lines) {
      handleLine(line);
    }

    if (done) break;
  }

  handleLine(pending);

  return { message: finalMessage || 'Importacao concluida com sucesso' };
}

export const api = {
  storeSession,
  clearSession,
  refreshSession,

  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token?: string; refreshToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleLogin: (idToken: string) =>
    request<{ user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  adminResetUserPassword: (userId: string) =>
    request<{ message: string; temporaryPassword: string; emailSent: boolean }>(
      `/users/${userId}/reset-password`,
      { method: 'POST' }
    ),

  register: (data: { email: string; password: string; name: string; role?: string }) =>
    request<{ user: any; token?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<any>('/auth/me'),

  updateProfile: (data: { name?: string; phone?: string; avatar?: string; whatsappNumber?: string }) =>
    request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  updatePresence: () =>
    request<{ ok: boolean; lastSeenAt: string }>('/auth/presence', { method: 'POST' }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  // Company
  getCurrentCompanySettings: () =>
    request<any>('/company/current'),

  updateCurrentCompany: (data: { name: string }) =>
    request<any>('/company/current', { method: 'PUT', body: JSON.stringify(data) }),

  updateCurrentCompanyWhatsApp: (data: {
    enabled?: boolean;
    phoneNumberId?: string;
    apiVersion?: string;
    apiToken?: string;
    webhookVerifyToken?: string;
    appSecret?: string;
  }) =>
    request<any>('/company/current/whatsapp', { method: 'PUT', body: JSON.stringify(data) }),

  // Leads
  getLeads: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<{ leads: any[]; total: number; page: number; totalPages: number }>(`/leads${query}`);
  },

  getLead: (id: string) => request<any>(`/leads/${id}`),

  createLead: (data: any) =>
    request<any>('/leads', { method: 'POST', body: JSON.stringify(data) }),

  updateLead: (id: string, data: any) =>
    request<any>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  sendLeadWhatsApp: (id: string, message: string) =>
    request<{ ok: boolean; provider: 'company_config' | 'env_fallback' | 'link_only'; link?: string | null }>(
      `/leads/${id}/whatsapp`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    ),

  deleteLead: (id: string) =>
    request<any>(`/leads/${id}`, { method: 'DELETE' }),

  deleteAllLeads: async (confirmation: string) => {
    const body = JSON.stringify({ confirmation });
    try {
      return await request<{ message: string; deletedCount: number }>('/leads/delete-all', {
        method: 'POST',
        body,
      });
    } catch (err: any) {
      if (err?.status !== 404) throw err;
      return request<{ message: string; deletedCount: number }>('/leads/all', {
        method: 'DELETE',
        body,
      });
    }
  },

  updateLeadTags: (id: string, tagIds: string[]) =>
    request<any>(`/leads/${id}/tags`, { method: 'PUT', body: JSON.stringify({ tagIds }) }),

  addLeadActivity: (id: string, data: { type: string; description: string }) =>
    request<any>(`/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(data) }),

  bulkUpdateLeads: (ids: string[], data: any) =>
    request<any>('/leads/bulk', { method: 'POST', body: JSON.stringify({ ids, data }) }),

  // Pipeline
  getPipeline: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any[]>(`/pipeline${query}`);
  },

  createStage: (data: { name: string; color?: string }) =>
    request<any>('/pipeline/stages', { method: 'POST', body: JSON.stringify(data) }),

  updateStage: (id: string, data: { name?: string; color?: string; order?: number }) =>
    request<any>(`/pipeline/stages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteStage: (id: string) =>
    request<any>(`/pipeline/stages/${id}`, { method: 'DELETE' }),

  reorderStages: (stageOrders: { id: string; order: number }[]) =>
    request<any>('/pipeline/stages/reorder', { method: 'PUT', body: JSON.stringify({ stageOrders }) }),

  moveLead: (leadId: string, stageId: string, targetLeadId?: string | null, placement?: 'before' | 'after') =>
    request<any>('/pipeline/move', {
      method: 'PUT',
      body: JSON.stringify({ leadId, stageId, targetLeadId, placement }),
    }),

  // Appointments
  getAppointments: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any[]>(`/appointments${query}`);
  },

  createAppointment: (data: any) =>
    request<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),

  updateAppointment: (id: string, data: any) =>
    request<any>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteAppointment: (id: string) =>
    request<any>(`/appointments/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => request<any[]>('/tags'),

  createTag: (data: { name: string; color?: string }) =>
    request<any>('/tags', { method: 'POST', body: JSON.stringify(data) }),

  updateTag: (id: string, data: { name?: string; color?: string }) =>
    request<any>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTag: (id: string) =>
    request<any>(`/tags/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request<any[]>('/users'),

  createUser: (data: { email: string; password?: string; name: string; role?: string; phone?: string; whatsappNumber?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id: string) =>
    request<any>(`/users/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any>(`/dashboard${query}`);
  },

  getDashboardTrend: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any[]>(`/dashboard/trend${query}`);
  },

  // Audit
  getAuditLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<{ logs: any[]; total: number; page: number; totalPages: number }>(`/audit${query}`);
  },

  // Import/Export
  exportJson: () =>
    request<any>('/import-export/json'),

  exportXlsx: () =>
    fetch(`${BASE_URL}/import-export/xlsx`, {
      credentials: 'same-origin',
    }).then((r) => r.blob()),

  importJson: (leads: any[]) =>
    request<any>('/import-export/json', { method: 'POST', body: JSON.stringify({ leads }) }),

  previewImportJson: (leads: any[]) =>
    request<any>('/import-export/preview/json', { method: 'POST', body: JSON.stringify({ leads }) }),

  importXlsx: (base64Data: string) =>
    request<any>('/import-export/xlsx', { method: 'POST', body: JSON.stringify({ data: base64Data }) }),

  importXlsxWithProgress: requestImportXlsxWithProgress,

  previewImportXlsx: (base64Data: string) =>
    request<any>('/import-export/preview/xlsx', { method: 'POST', body: JSON.stringify({ data: base64Data }) }),

  // Notifications
  getNotifications: () =>
    request<{ notifications: any[]; unreadCount: number }>('/notifications'),

  createNotification: (data: { title: string; message: string; type?: string; link?: string }) =>
    request<any>('/notifications', { method: 'POST', body: JSON.stringify(data) }),

  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllNotificationsRead: () =>
    request<any>('/notifications/read-all', { method: 'PUT' }),

  // WhatsApp
  getWhatsAppStatus: () =>
    request<any>('/whatsapp/status'),

  getWhatsAppConversations: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any[]>(`/whatsapp/conversations${query}`);
  },

  getWhatsAppConversation: (leadId: string) =>
    request<any>(`/whatsapp/conversations/${leadId}/messages`),

  sendWhatsAppConversationMessage: (leadId: string, message: string) =>
    request<{ ok: boolean; provider: 'company_config' | 'env_fallback' | 'link_only'; link?: string | null; message: any }>(
      `/whatsapp/conversations/${leadId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    ),

  // Super Admin
  getSuperAdminDashboard: () =>
    request<any>('/super-admin/dashboard'),

  getSuperAdminCompanies: () =>
    request<any[]>('/super-admin/companies'),

  getSuperAdminCompany: (id: string) =>
    request<any>(`/super-admin/companies/${id}`),

  createCompany: (data: { name: string; adminName: string; adminEmail: string; adminPassword: string }) =>
    request<any>('/super-admin/companies', { method: 'POST', body: JSON.stringify(data) }),

  updateCompany: (id: string, data: { name?: string; active?: boolean }) =>
    request<any>(`/super-admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCompany: (id: string) =>
    request<any>(`/super-admin/companies/${id}`, { method: 'DELETE' }),

  getCompanyMetrics: (id: string) =>
    request<any>(`/super-admin/companies/${id}/metrics`),

  createCompanyUser: (companyId: string, data: { name: string; email: string; password: string; role?: string }) =>
    request<any>(`/super-admin/companies/${companyId}/users`, { method: 'POST', body: JSON.stringify(data) }),

  updateCompanyUser: (companyId: string, userId: string, data: { active?: boolean; role?: string }) =>
    request<any>(`/super-admin/companies/${companyId}/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCompanyUser: (companyId: string, userId: string) =>
    request<any>(`/super-admin/companies/${companyId}/users/${userId}`, { method: 'DELETE' }),

  impersonateCompany: (companyId: string) =>
    request<{ token?: string; company: { id: string; name: string; slug: string } }>(
      `/super-admin/impersonate/${companyId}`,
      { method: 'POST' }
    ),

  exitImpersonation: () =>
    request<{ ok: boolean }>('/super-admin/exit-impersonation', { method: 'POST' }),
};
