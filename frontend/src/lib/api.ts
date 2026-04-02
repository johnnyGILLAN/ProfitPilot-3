import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; businessName?: string }) =>
    api.post('/api/auth/register', data),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data: { name?: string; businessName?: string; currency?: string }) =>
    api.put('/api/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/api/auth/change-password', data),
};

// Transactions
export const transactionsAPI = {
  getAll: (params?: { type?: string; category?: string; startDate?: string; endDate?: string }) =>
    api.get('/api/transactions', { params }),
  getOne: (id: string) => api.get(`/api/transactions/${id}`),
  create: (data: any) => api.post('/api/transactions', data),
  update: (id: string, data: any) => api.put(`/api/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/api/transactions/${id}`),
  getStats: () => api.get('/api/transactions/stats'),
};

// Invoices
export const invoicesAPI = {
  getAll: (params?: { status?: string }) => api.get('/api/invoices', { params }),
  getOne: (id: string) => api.get(`/api/invoices/${id}`),
  create: (data: any) => api.post('/api/invoices', data),
  update: (id: string, data: any) => api.put(`/api/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/api/invoices/${id}`),
  markAsPaid: (id: string) => api.put(`/api/invoices/${id}/paid`),
  getPDF: (id: string) => api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Clients
export const clientsAPI = {
  getAll: () => api.get('/api/clients'),
  getOne: (id: string) => api.get(`/api/clients/${id}`),
  create: (data: any) => api.post('/api/clients', data),
  update: (id: string, data: any) => api.put(`/api/clients/${id}`, data),
  delete: (id: string) => api.delete(`/api/clients/${id}`),
};

// Suppliers
export const suppliersAPI = {
  getAll: () => api.get('/api/suppliers'),
  getOne: (id: string) => api.get(`/api/suppliers/${id}`),
  create: (data: any) => api.post('/api/suppliers', data),
  update: (id: string, data: any) => api.put(`/api/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/api/suppliers/${id}`),
};

// Budgets
export const budgetsAPI = {
  getAll: () => api.get('/api/budgets'),
  getOne: (id: string) => api.get(`/api/budgets/${id}`),
  create: (data: any) => api.post('/api/budgets', data),
  update: (id: string, data: any) => api.put(`/api/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/api/budgets/${id}`),
  getProgress: (id: string) => api.get(`/api/budgets/${id}/progress`),
};

// Categories
export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  create: (data: any) => api.post('/api/categories', data),
  update: (id: string, data: any) => api.put(`/api/categories/${id}`, data),
  delete: (id: string) => api.delete(`/api/categories/${id}`),
  createDefaults: () => api.post('/api/categories/create-defaults'),
};

// Recurring
export const recurringAPI = {
  getAll: () => api.get('/api/recurring'),
  create: (data: any) => api.post('/api/recurring', data),
  update: (id: string, data: any) => api.put(`/api/recurring/${id}`, data),
  delete: (id: string) => api.delete(`/api/recurring/${id}`),
  toggle: (id: string) => api.put(`/api/recurring/${id}/toggle`),
  process: () => api.post('/api/recurring/process'),
};

// Export
export const exportAPI = {
  transactions: (params?: { format?: string; startDate?: string; endDate?: string }) =>
    api.get('/api/export/transactions', { params, responseType: 'blob' }),
  invoices: (params?: { format?: string }) =>
    api.get('/api/export/invoices', { params, responseType: 'blob' }),
  clients: (params?: { format?: string }) =>
    api.get('/api/export/clients', { params, responseType: 'blob' }),
  report: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/api/export/report', { params, responseType: 'blob' }),
};

// AI Insights
export const aiAPI = {
  generateInsights: () => api.post('/api/ai/insights'),
  getCachedInsights: () => api.get('/api/ai/insights/cached'),
  generateGoals: (data: { insights: any[]; summary: any }) =>
    api.post('/api/ai/generate-goals', data),
  saveGoals: (goals: any[]) => api.post('/api/ai/save-goals', { goals }),
  saveBudgets: (budgets: any[]) => api.post('/api/ai/save-budgets', { budgets }),
};

// Import
export const importAPI = {
  uploadFile: (file: File, module: string = 'transactions') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    return api.post('/api/import/sheet', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  preview: (file: File, module: string = 'transactions') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    formData.append('dryRun', 'true');
    return api.post('/api/import/sheet', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getTemplate: (module: string = 'transactions') =>
    api.get(`/api/import/templates?module=${module}`, { responseType: 'blob' }),
};

// Payments
export const paymentsAPI = {
  getPackages: () => api.get('/api/payments/packages'),
  createCheckout: (data: { package_id: string; origin_url: string; user_email?: string }) =>
    api.post('/api/payments/checkout', data),
  getStatus: (sessionId: string) => api.get(`/api/payments/status/${sessionId}`),
  getHistory: (email?: string) => api.get('/api/payments/history', { params: { email } }),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (userId: string, role: string) =>
    api.put(`/api/admin/users/${userId}/role`, { role }),
};

// Notifications
export const notificationsAPI = {
  getPreferences: () => api.get('/api/notifications/preferences'),
  updatePreferences: (preferences: any) =>
    api.put('/api/notifications/preferences', { preferences }),
  sendTest: () => api.post('/api/notifications/send-test'),
};

// Exchange Rates
export const exchangeAPI = {
  getRates: () => api.get('/api/exchange-rates'),
  convert: (amount: number, from: string, to: string) =>
    api.get('/api/exchange-rates/convert', { params: { amount, from_currency: from, to_currency: to } }),
};

export default api;
