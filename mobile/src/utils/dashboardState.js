import { alertLabels } from './alertData.js';
import { formatNumber } from './formatSensor.js';
export function connectionSummary(state) {
  if (state.connection !== 'connected') return { label: state.connection === 'connecting' || state.connection === 'reconnecting' ? 'Đang kết nối' : 'Mất kết nối', tone: 'amber', ready: false };
  if (!state.system?.mqtt?.connected || !state.system?.mqtt?.subscribed) return { label: 'Chưa kết nối thiết bị', tone: 'amber', ready: false };
  if (!state.reading || state.stale) return { label: 'Đang chờ dữ liệu mới', tone: 'amber', ready: false };
  return { label: 'Đã kết nối', tone: 'green', ready: true };
}
export function environmentSummary(state) {
  const { alerts, stale, connection } = state;
  if (alerts.active.length) return { label: 'Có cảnh báo cần chú ý', tone: 'red' };
  if (alerts.loading || alerts.error || !alerts.settings) return { label: 'Chưa đồng bộ cảnh báo', tone: 'amber' };
  if (!alerts.settings.sensorVerified) return { label: 'Chưa xác minh cảm biến', tone: 'amber' };
  if (!alerts.settings.alertsEnabled) return { label: 'Giám sát chưa bật', tone: 'amber' };
  if (connection !== 'connected' || stale || !state.reading || !connectionSummary(state).ready) return { label: 'Chưa có dữ liệu mới', tone: 'amber' };
  if (alerts.quality?.status !== 'valid') return { label: 'Cần kiểm tra chất lượng dữ liệu', tone: 'amber' };
  if (!['temperatureHigh', 'temperatureLow', 'humidityHigh', 'humidityLow'].some(key => alerts.settings[key]?.enabled)) return { label: 'Chưa bật quy tắc ngưỡng', tone: 'amber' };
  return { label: 'Không có cảnh báo', tone: 'green' };
}
/** Trả lời một câu: "Cửa hàng có ổn không?" — câu kết luận + dãy đèn báo như mặt tủ điện. */
export function verdict(state) {
  const link = connectionSummary(state);
  const active = state.alerts.active;
  if (state.connection !== 'connected') return { tone: 'amber', title: 'Mất kết nối với cửa hàng', detail: 'Ứng dụng đang thử kết nối lại với máy chủ.' };
  if (active.length) {
    // Ưu tiên cảnh báo nghiêm trọng; cảnh báo chất lượng dữ liệu chỉ là "cần chú ý".
    const first = active.find(row => row.severity === 'critical') || active[0];
    const unit = first.type?.startsWith('humidity') ? '%' : '°C';
    const value = Number.isFinite(first.value) ? ` ${formatNumber(first.value)}${unit}` : '';
    const title = first.type === 'sensorQuality' ? first.message || 'Dữ liệu cảm biến chưa đáng tin' : `${alertLabels[first.type] || 'Có cảnh báo'}${value}`;
    return { tone: first.severity === 'critical' ? 'red' : 'amber', title,
      detail: active.length > 1 ? `Và ${active.length - 1} cảnh báo khác đang hoạt động.` : 'Mở Cảnh báo để xem và xác nhận.' };
  }
  if (!link.ready) return { tone: 'amber', title: link.label, detail: 'Chưa nhận được số đo mới từ ESP32.' };
  const env = environmentSummary(state);
  if (env.tone === 'green') return { tone: 'green', title: 'Cửa hàng ổn định', detail: 'Nhiệt độ và độ ẩm trong ngưỡng, thiết bị đang gửi dữ liệu.' };
  return { tone: 'amber', title: env.label, detail: 'Dữ liệu vẫn được ghi, nhưng cảnh báo ngưỡng có thể chưa hoạt động.' };
}
