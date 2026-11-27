import { API_URL, CONFIG_ERROR } from '../constants/config.js';
import { rangeQuery } from '../utils/timeRange.js';
import { authHeaders, session } from './session.js';
async function request(path, method = 'GET', data, signal) {
  if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort); if (signal?.aborted) abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(`${API_URL}/api/${path}`, { method, signal: controller.signal,
      headers: authHeaders({ 'Content-Type': 'application/json' }), ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json();
    if (response.status === 401) session.expire();
    if (!response.ok || body.success !== true) throw new Error(body.error?.message || `Lỗi dịch vụ cảnh báo (${response.status}).`);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Yêu cầu đã hủy hoặc quá thời gian chờ.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export const alertsApi = {
  active: async signal => (await request('alerts/active', 'GET', undefined, signal)).data,
  settings: async signal => (await request('alert-settings', 'GET', undefined, signal)).data,
  stats: async signal => (await request('alerts/stats', 'GET', undefined, signal)).data,
  history: (page = 1, type = '', signal, range) => request(`alerts?page=${page}&limit=20${type ? `&type=${encodeURIComponent(type)}` : ''}${rangeQuery(range)}`, 'GET', undefined, signal),
  updateSettings: async data => (await request('alert-settings', 'PUT', data)).data,
  acknowledge: async id => (await request(`alerts/${encodeURIComponent(id)}/acknowledge`, 'PATCH', {})).data,
  remove: async id => (await request(`alerts/${encodeURIComponent(id)}`, 'DELETE')).data,
};
export const storeApi = {
  snapshot: async signal => (await request('store-watch', 'GET', undefined, signal)).data,
  change: mode => request('store-watch/mode', 'PUT', { mode }),
  review: (id, note) => request(`store-watch/incidents/${encodeURIComponent(id)}`, 'PATCH', { note }),
};