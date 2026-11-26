import { API_URL, CONFIG_ERROR } from '../constants/config.js';
import { authHeaders, session } from './session.js';

async function request(path, method, data) {
  if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_URL}/api/notifications/${path}`, { method, signal: controller.signal,
      headers: authHeaders({ 'Content-Type': 'application/json' }), ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) session.expire();
    if (!response.ok || body.success !== true) throw new Error(body.error?.message || `Lỗi thông báo (HTTP ${response.status}).`);
    return body.data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Quá thời gian chờ Backend.');
    throw error;
  } finally { clearTimeout(timer); }
}

export const notificationsApi = {
  register: data => request('token', 'PUT', data),
  unregister: token => request('token', 'DELETE', { token }),
  test: () => request('test', 'POST', {}),
};
