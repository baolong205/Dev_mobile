export const alertLabels = { temperatureHigh: 'Nhiệt độ cao', temperatureLow: 'Nhiệt độ thấp', humidityHigh: 'Độ ẩm cao', humidityLow: 'Độ ẩm thấp', sensorQuality: 'Chất lượng cảm biến' };
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