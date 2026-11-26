const { labels } = require('./alertService');

const units = { temperature: '°C', humidity: '%' };
const format = value => (Number.isFinite(value) ? (Math.round(value * 10) / 10).toLocaleString('vi-VN') : null);

/** Nội dung push cho một cảnh báo mới (tiêu đề ngắn, thân nêu số đo và ngưỡng). */
function describeAlert(alert) {
  const title = `${alert.severity === 'critical' ? '⚠️ ' : ''}${labels[alert.type] || 'Cảnh báo SmartStore'}`;
  const field = alert.type?.startsWith('temperature') ? 'temperature' : alert.type?.startsWith('humidity') ? 'humidity' : null;
  const value = format(alert.value), threshold = format(alert.threshold);
  if (!field || value === null) return { title, body: alert.message || 'Có cảnh báo mới cần kiểm tra.' };
  const name = field === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm';
  return { title, body: `${name} hiện ${value}${units[field]}${threshold !== null ? ` (ngưỡng ${threshold}${units[field]})` : ''}. Chạm để xem chi tiết.` };
}
module.exports = { describeAlert };
