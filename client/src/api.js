const rawBase = import.meta.env.VITE_API_BASE ? String(import.meta.env.VITE_API_BASE).trim() : '';

export const API_BASE = (() => {
  if (!rawBase || rawBase === '/api') return '/api';
  if (rawBase.endsWith('/api')) return rawBase;
  return `${rawBase.replace(/\/+$/, '')}/api`;
})();

export function getToken() {
  return localStorage.getItem('upi_auth_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('upi_auth_token', token);
  } else {
    localStorage.removeItem('upi_auth_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  // Public: Vendor registration request from landing page
  submitVendorRequest: (data) =>
    request('/requests/submit', { method: 'POST', body: JSON.stringify(data) }),
  checkRequestStatus: (phone) =>
    request(`/requests/status?phone=${encodeURIComponent(phone)}`),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  listVendors: (params = {}) => request(`/admin/vendors?${new URLSearchParams(params)}`),
  createVendor: (data) => request('/admin/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id, data) => request(`/admin/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleVendorStatus: (id) => request(`/admin/vendors/${id}/toggle`, { method: 'PATCH' }),
  resetVendorPassword: (id, newPassword) =>
    request(`/admin/vendors/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  deleteVendor: (id) => request(`/admin/vendors/${id}`, { method: 'DELETE' }),
  getAllSessions: (params = {}) => request(`/admin/sessions?${new URLSearchParams(params)}`),
  getAuditLogs: () => request('/admin/logs'),

  // Admin: Review vendor registration requests
  listVendorRequests: (params = {}) => request(`/admin/requests?${new URLSearchParams(params)}`),
  approveVendorRequest: (id, data) =>
    request(`/admin/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectVendorRequest: (id, data) =>
    request(`/admin/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),

  // Real-time Chat
  sendMessage: (text, vendorId) =>
    request('/chat/send', { method: 'POST', body: JSON.stringify({ text, vendorId }) }),
  getMessages: (vendorId) =>
    request(`/chat/messages${vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : ''}`),
  getChatThreads: () => request('/admin/chat/threads'),

  // Vendor
  getVendorDashboard: () => request('/vendor/dashboard'),
  updateVendorSettings: (data) => request('/vendor/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getVendorTransactions: (params = {}) => request(`/vendor/transactions?${new URLSearchParams(params)}`),
  getVendorCustomers: (params = {}) => request(`/vendor/customers?${new URLSearchParams(params)}`),

  // Payment sessions (vendor-only)
  createPaymentSession: (data) =>
    request('/vendor/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getPaymentSession: (sessionId) => request(`/vendor/sessions/${sessionId}`),
  verifySlicePayment: (payload) =>
    request('/vendor/verify', { method: 'POST', body: JSON.stringify(payload) }),

  // Simulate/trigger automatic payment confirmation (demo mode)
  simulatePayment: (sessionId, sliceId) =>
    request('/webhook/payment', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sliceId, status: 'SUCCESS' }),
    }),

  // Customer Scan-to-Pay (Option 2)
  getPaymentSessionPublic: (sessionId) => request(`/pay/session/${sessionId}`),
  confirmCustomerPayment: (data) =>
    request('/pay/confirm', { method: 'POST', body: JSON.stringify(data) }),

  // Customer Portal (PaySplit 2.0)
  customerLogin: (phone, name) =>
    request('/auth/customer-login', { method: 'POST', body: JSON.stringify({ phone, name }) }),
  getCustomerHistory: () => request('/customer/history'),
  getCustomerActiveBill: () => request('/customer/active-bill'),

  // Vendor: Share bill to customer mobile
  shareBillWithCustomer: (sessionId, customerPhone, customerName) =>
    request(`/vendor/sessions/${sessionId}/share`, {
      method: 'POST',
      body: JSON.stringify({ customerPhone, customerName }),
    }),
};

