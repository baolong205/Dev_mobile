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