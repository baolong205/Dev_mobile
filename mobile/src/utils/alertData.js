export const alertLabels = { temperatureHigh: 'Nhiệt độ cao', temperatureLow: 'Nhiệt độ thấp', humidityHigh: 'Độ ẩm cao', humidityLow: 'Độ ẩm thấp', sensorQuality: 'Chất lượng cảm biến' };
export function liveAlertReading(alert, state) {
  if (alert.status !== 'ACTIVE') return null;
  const field = alert.type.startsWith('humidity') ? 'humidity' : alert.type.startsWith('temperature') ? 'temperature' : null;
  if (!field) return null;
  const value = state.reading?.[field];
  const finite = typeof value === 'number' && Number.isFinite(value);
  const quality = state.alerts.quality?.fields?.[field];
  const fresh = state.connection === 'connected' && !state.stale && state.system?.mqtt?.connected === true && state.system?.mqtt?.subscribed === true;
  const eligible = finite && fresh && state.alerts.settings?.sensorVerified === true && quality?.thresholdEligible === true;
  const status = !finite ? 'Chưa có số đo hợp lệ' : !fresh ? 'Số đo gần nhất · Kết nối gián đoạn hoặc dữ liệu cũ' :
    !state.alerts.settings?.sensorVerified ? 'Chưa xác minh cảm biến' : quality?.status === 'suspect' || quality?.status === 'invalid' ? 'Số đo cần kiểm tra chất lượng' :
      eligible ? 'Mẫu hiện tại đủ điều kiện chất lượng' : 'Chờ đánh giá chất lượng mẫu';
  return { field, value: finite ? value : null, unit: field === 'humidity' ? '%' : '°C', eligible, status, rule: state.alerts.settings?.[alert.type] };
}
export function createNoticePreview(sequence) {
  // Presentation-only object: no measured value, incident status or persistence.
  return { _id: `notice-preview-${sequence}`, preview: true, type: 'sensorQuality', severity: 'warning',
    message: 'Đây là bản xem trước hiệu ứng thông báo, không phải cảnh báo từ cảm biến.' };
}
export function dismissAlertNotice(current, id) {
  // A stale auto-dismiss callback must never close a newer alert. Pressable events
  // are not IDs; existing buttons can still dismiss the current notice directly.
  return typeof id !== 'string' || current?._id === id ? null : current;
}
export function mergeAlerts(current, incoming) {
  const records = new Map(current.map(record => [record._id, record]));
  for (const record of incoming) {
    if (!record || typeof record._id !== 'string') continue;
    const previous = records.get(record._id);
    if (!previous || Date.parse(record.updatedAt || record.startedAt) >= Date.parse(previous.updatedAt || previous.startedAt)) records.set(record._id, record);
  }
  return [...records.values()].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}
export function settingsPayload(form, confirmed = false) {
  const result = { sensorVerified: form.sensorVerified, alertsEnabled: form.alertsEnabled,
    notificationsEnabled: form.notificationsEnabled !== false,
    consecutiveReadings: Number(form.consecutiveReadings), cooldownMinutes: Number(form.cooldownMinutes), verificationConfirmed: confirmed };
  if (String(form.consecutiveReadings).trim() === '' || String(form.cooldownMinutes).trim() === '') throw new Error('Không để trống số mẫu hoặc cooldown.');
  for (const key of Object.keys(alertLabels).filter(key => key !== 'sensorQuality')) {
    if (String(form[key].trigger).trim() === '' || String(form[key].clear).trim() === '') throw new Error('Không để trống ngưỡng.');
    result[key] = { enabled: form[key].enabled, trigger: Number(form[key].trigger), clear: Number(form[key].clear) };
    if (![result[key].trigger, result[key].clear].every(Number.isFinite)) throw new Error('Ngưỡng phải là số hợp lệ; dùng dấu chấm thập phân.');
  }
  if (![result.consecutiveReadings, result.cooldownMinutes].every(Number.isInteger)) throw new Error('Số mẫu và cooldown phải là số nguyên.');
  return result;
}