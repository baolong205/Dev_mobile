export function normalizeReading(value) {
  if (!value || typeof value !== 'object') return null;
  if (!['temperature', 'humidity'].every(key => value[key] === null ||
    (typeof value[key] === 'number' && Number.isFinite(value[key])))) return null;
  if (!['motion', 'ledGreen', 'ledRed'].every(key => typeof value[key] === 'boolean')) return null;
  if (typeof value.receivedAt !== 'string' || !Number.isFinite(Date.parse(value.receivedAt))) return null;
  return { ...value };
}
export function mergeReading(current, incoming) {
  const next = normalizeReading(incoming);
  if (!next || (current && Date.parse(next.receivedAt) <= Date.parse(current.receivedAt))) return current;
  return next;
}
export function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '--';
}
export function formatTime(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : 'Chưa có dữ liệu';
}
export function isStale(reading, now, threshold) {
  return !reading || now - Date.parse(reading.receivedAt) > threshold;
}
export function mergeHistory(current, incoming) {
  return [...new Map([...current, ...incoming].map(row => [row._id, row])).values()]
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || b._id.localeCompare(a._id));
}
export function normalizeStatus(value) {
  if (!value || typeof value.mqtt?.connected !== 'boolean' ||
    typeof value.mqtt?.subscribed !== 'boolean' || typeof value.mongodb?.connected !== 'boolean') return null;
  return { backend: value.backend, mqtt: value.mqtt, mongodb: value.mongodb, status: value.status };
}