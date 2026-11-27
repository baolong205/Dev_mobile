import { API_URL, CONFIG_ERROR } from '../constants/config.js';
import { authHeaders } from './session.js';

async function post(path, data, token) {
  if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_URL}/api/${path}`, {
      method: data === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : authHeaders({ 'Content-Type': 'application/json' }),
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success !== true) {
      throw Object.assign(new Error(body.error?.message || `Không đăng nhập được (HTTP ${response.status}).`), { status: response.status });
    }
    return body.data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Quá thời gian chờ Backend.');
    if (error instanceof TypeError) throw new Error('Không kết nối được Backend. Kiểm tra Wi-Fi, IP và cổng.');
    throw error;
  } finally { clearTimeout(timer); }
}

export const authApi = {
  /** => { token, user } */
  login: (username, password) => post('auth/login', { username, password }),
  /** Kiểm tra token đã lưu còn hiệu lực. => user */
  me: token => post('auth/me', undefined, token),
};
