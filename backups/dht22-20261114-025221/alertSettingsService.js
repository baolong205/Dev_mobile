const DEVICE_ID = 'smartstore-esp32';
const TYPES = ['temperatureHigh', 'temperatureLow', 'humidityHigh', 'humidityLow', 'sensorQuality'];
const RULES = TYPES.slice(0, 4);
const defaults = () => ({ deviceId: DEVICE_ID, sensorVerified: false, alertsEnabled: false,
  temperatureHigh: { enabled: true, trigger: 35, clear: 33 },
  temperatureLow: { enabled: false, trigger: 15, clear: 17 },
  humidityHigh: { enabled: true, trigger: 80, clear: 75 },
  humidityLow: { enabled: false, trigger: 30, clear: 35 },
  consecutiveReadings: 3, cooldownMinutes: 10 });
function bad(message) { return Object.assign(new Error(message), { status: 400, code: 'INVALID_ALERT_SETTINGS' }); }
function validateSettings(input, previous = defaults()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('Cấu hình phải là object.');
  const allowed = ['sensorVerified', 'alertsEnabled', ...RULES, 'consecutiveReadings', 'cooldownMinutes', 'verificationConfirmed'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw bad('Có trường cấu hình không được hỗ trợ.');
  const result = { ...previous, deviceId: DEVICE_ID };
  for (const key of ['sensorVerified', 'alertsEnabled']) {
    if (key in input) {
      if (typeof input[key] !== 'boolean') throw bad(`${key} phải là Boolean.`);
      result[key] = input[key];
    }
  }
  if ('verificationConfirmed' in input && typeof input.verificationConfirmed !== 'boolean') throw bad('Xác nhận kiểm định phải là Boolean.');
  if (result.sensorVerified && !previous.sensorVerified && input.verificationConfirmed !== true) throw bad('Cần xác nhận đã kiểm tra phần cứng và đối chiếu cảm biến.');
  if (result.alertsEnabled && !result.sensorVerified) throw bad('Chỉ bật giám sát sau khi kiểm định cảm biến.');
  for (const key of RULES) {
    if (key in input && input[key] === null) throw bad(`Cấu hình ${key} không được null.`);
    const rule = input[key] ?? previous[key];
    if (!rule || typeof rule !== 'object' || Array.isArray(rule) || Object.keys(rule).sort().join(',') !== 'clear,enabled,trigger' ||
      typeof rule.enabled !== 'boolean' || !['trigger', 'clear'].every(k => typeof rule[k] === 'number' && Number.isFinite(rule[k]))) throw bad(`Cấu hình ${key} không hợp lệ.`);
    const [min, max] = key.startsWith('temperature') ? [0, 50] : [0, 100];
    if ([rule.trigger, rule.clear].some(v => v < min || v > max)) throw bad(`${key}: giá trị phải từ ${min} đến ${max}.`);
    if (key.endsWith('High') ? rule.clear >= rule.trigger : rule.clear <= rule.trigger) throw bad(`${key}: chiều hysteresis không hợp lệ.`);
    result[key] = { ...rule };
  }
  for (const [key, min, max] of [['consecutiveReadings', 1, 30], ['cooldownMinutes', 0, 1440]]) {
    const value = key in input ? input[key] : previous[key];
    if (!Number.isInteger(value) || value < min || value > max) throw bad(`${key} phải là số nguyên từ ${min} đến ${max}.`);
    result[key] = value;
  }
  for (const prefix of ['temperature', 'humidity']) {
    const low = result[`${prefix}Low`], high = result[`${prefix}High`];
    if (low.enabled && high.enabled && low.clear >= high.clear) throw bad('Ngưỡng thấp/cao chồng lấn.');
  }
  return Object.fromEntries(Object.keys(defaults()).map(key => [key, result[key]]));
}
module.exports = { DEVICE_ID, TYPES, RULES, defaults, validateSettings };