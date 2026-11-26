import { API_URL, CONFIG_ERROR } from '../constants/config.js';
import { normalizeReading, normalizeStatus } from '../utils/formatSensor.js';
import { rangeQuery } from '../utils/timeRange.js';

async function request(route, options = {}) {
  if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(`${API_URL}/api/${route}`, { signal: controller.signal });
    const body = await response.json();
    if (options.empty404 && response.status === 404 && body.error?.code === 'NO_SENSOR_DATA') return null;
    if (options.health && (response.status === 200 || response.status === 503) && normalizeStatus(body.data)) return body.data;
    if (!response.ok || body.success !== true) {
      const error = new Error(response.status === 503 ? 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.' : `Không tải được dữ liệu (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Yêu cầu đã hủy hoặc quá thời gian chờ.');
    if (error instanceof TypeError) throw new Error('Không kết nối được Backend. Kiểm tra Wi-Fi, IP và cổng.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export const api = {
  async latest(signal) {
    const body = await request('sensors/latest', { empty404: true, signal });
    if (!body) return null;
    const reading = normalizeReading(body.data);
    if (!reading) throw new Error('Bản ghi cảm biến không đúng cấu trúc.');
    return reading;
  },
  health: signal => request('health', { health: true, signal }),
  async history(page = 1, signal, range) {
    const body = await request(`sensors/history?page=${page}&limit=20${rangeQuery(range)}`, { signal });
    if (!Array.isArray(body.data) || !Number.isInteger(body.page) || !Number.isInteger(body.totalPages) ||
      !Number.isInteger(body.total) || body.data.some(row => !normalizeReading(row) || typeof row._id !== 'string')) {
      throw new Error('Phản hồi lịch sử không đúng cấu trúc.');
    }
    return body;
  },
  async motion(page = 1, signal, range) {
    const body = await request(`sensors/motion?page=${page}&limit=20${rangeQuery(range)}`, { signal });
    if (!Array.isArray(body.data) || !Number.isInteger(body.page) || !Number.isInteger(body.totalPages) || !Number.isInteger(body.total) || body.data.some(row => !normalizeReading(row) || typeof row._id !== 'string')) throw new Error('Lịch sử chuyển động không đúng cấu trúc.');
    return body;
  },
  async report(range, signal) {
    const body = await request(`sensors/report?${rangeQuery(range).slice(1)}`, { signal });
    const value = body.data;
    if (!value || !Array.isArray(value.series) || !Number.isInteger(value.total) || !value.temperature || !value.humidity || !value.alerts || !Number.isFinite(Date.parse(value.from)) || !Number.isFinite(Date.parse(value.to))) throw new Error('Báo cáo không đúng cấu trúc.');
    return value;
  },
  async stats(signal) {
    const value = (await request('sensors/stats', { signal })).data;
    if (!value || !Number.isInteger(value.total) || !value.temperature || !value.humidity) {
      throw new Error('Phản hồi thống kê không đúng cấu trúc.');
    }
    return value;
  },
};