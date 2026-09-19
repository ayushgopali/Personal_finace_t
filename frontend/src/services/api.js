// Centralized API/service layer for the React frontend.
// Consumes the EXISTING backend — endpoint paths, methods, field names,
// and auth semantics are LOCKED to what server.js already provides.
// Do not invent endpoints here; adapt only inside this layer if needed.

const API_BASE = '/api';

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await readJson(response);
  return { response, data };
}

export const api = {
  // ---- expenses (same contracts as app.js) ----
  async listExpenses(filters = {}) {
    const params = new URLSearchParams(filters);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/expenses${suffix}`, { credentials: 'same-origin' });
    const data = await readJson(res);
    return Array.isArray(data) ? data : [];
  },
  async getExpense(id) {
    const { data } = await request(`/expenses/${id}`);
    return data;
  },
  async createExpense(expenseData) {
    const { data } = await request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
    return data;
  },
  async updateExpense(id, expenseData) {
    const { data } = await request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    });
    return data;
  },
  async deleteExpense(id) {
    const { data } = await request(`/expenses/${id}`, { method: 'DELETE' });
    return data;
  },

  // ---- analytics (existing backend endpoints) ----
  async monthlySummary(month) {
    const { data } = await request(`/analytics/summary?month=${encodeURIComponent(month)}`);
    return data;
  },
  async dailyTrend(month) {
    const { data } = await request(`/analytics/daily-trend?month=${encodeURIComponent(month)}`);
    return data;
  },
  async listCategories() {
    const { data } = await request('/categories');
    return data;
  },

  // ---- auth (same contracts as app.js / login.js) ----
  async me() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'same-origin' });
      return await readJson(res);
    } catch (error) {
      return { authenticated: false };
    }
  },
  async oauthStatus() {
    const res = await fetch(`${API_BASE}/auth/oauth-status`, { credentials: 'same-origin' });
    return readJson(res);
  },
  async passwordLogin(payload) {
    const res = await fetch(`${API_BASE}/auth/password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, data: await readJson(res) };
  },
  async signupChallenge(payload) {
    const res = await fetch(`${API_BASE}/auth/signup-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, data: await readJson(res) };
  },
  async signup(payload) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, data: await readJson(res) };
  },
  async forgotPassword(payload) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, data: await readJson(res) };
  },
  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'same-origin'
    });
    return readJson(res);
  },

  // ---- wallet photo (persistent backend storage — never localStorage) ----
  async getWalletPhoto() {
    const res = await fetch(`${API_BASE}/wallet/photo`, { credentials: 'same-origin' });
    return readJson(res);
  },
  async saveWalletPhoto(photo) {
    const res = await fetch(`${API_BASE}/wallet/photo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ photo })
    });
    const data = await readJson(res);
    if (res.status === 404) throw new Error('Restart the Node server once to enable wallet photo storage.');
    if (!res.ok || data.success === false) throw new Error(data.error || 'Could not save wallet photo.');
    return data;
  },
  async deleteWalletPhoto() {
    const res = await fetch(`${API_BASE}/wallet/photo`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const data = await readJson(res);
    if (res.status === 404) throw new Error('Restart the Node server once to enable wallet photo storage.');
    if (!res.ok || data.success === false) throw new Error(data.error || 'Could not remove wallet photo.');
    return data;
  }
};

export default api;
