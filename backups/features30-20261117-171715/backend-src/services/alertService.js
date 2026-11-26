const { RULES, DEVICE_ID, defaults } = require('./alertSettingsService');
const { evaluateQuality } = require('./sensorQualityService');
const labels = { temperatureHigh: 'Nhiệt độ cao', temperatureLow: 'Nhiệt độ thấp', humidityHigh: 'Độ ẩm cao', humidityLow: 'Độ ẩm thấp', sensorQuality: 'Dữ liệu DHT chưa đáng tin cậy' };
// Repository is injected: tests never touch the production MQTT broker/database.
function createAlertEngine({ repository, emit = () => {}, now = Date.now }) {
  let settings = defaults(), ready = false, lastTime = 0, lastSampleTime = 0, lastSession = null;
  let qualitySignature = '', quality = null;
  const states = new Map(), seen = new Set(), lastNotifications = new Map();
  function resetCounters() { for (const state of states.values()) { state.triggerCount = 0; state.clearCount = 0; if (!state.alert) state.phase = 'NORMAL'; } }
  async function initialize(config, active = [], notifications = []) {
    settings = config; states.clear(); seen.clear(); lastTime = 0; lastSampleTime = 0; lastSession = null;
    for (const type of [...RULES, 'sensorQuality']) states.set(type, { phase: 'NORMAL', triggerCount: 0, clearCount: 0, alert: null });
    for (const alert of active) if (states.has(alert.type)) Object.assign(states.get(alert.type), { phase: 'ACTIVE', alert });
    lastNotifications.clear();
    for (const alert of notifications) if (alert.lastNotifiedAt) lastNotifications.set(alert.type, Date.parse(alert.lastNotifiedAt));
    qualitySignature = ''; ready = true;
  }
  async function transition(type, activate, value, threshold, reason) {
    const state = states.get(type), timestamp = new Date(now()).toISOString();
    if (activate) {
      const notify = now() - (lastNotifications.get(type) ?? -Infinity) >= settings.cooldownMinutes * 60000;
      const result = await repository.create({ deviceId: DEVICE_ID, type, severity: type === 'sensorQuality' ? 'warning' : 'critical',
        message: labels[type], value, threshold, status: 'ACTIVE', startedAt: timestamp,
        notificationCount: notify ? 1 : 0, lastNotifiedAt: notify ? timestamp : null, notificationSuppressed: !notify });
      // Commit in-memory state only after persistence succeeds; unique-index races return existing incident.
      state.alert = result.alert; state.phase = 'ACTIVE'; state.triggerCount = 0; state.clearCount = 0;
      if (result.created) {
        if (notify) lastNotifications.set(type, now());
        emit('alert:created', result.alert);
      }
    } else {
      const resolved = await repository.resolve(state.alert._id, timestamp, reason);
      if (!resolved) throw new Error('Alert resolution was not persisted');
      state.alert = null; state.phase = 'RESOLVED'; state.clearCount = 0; state.triggerCount = 0;
      emit('alert:resolved', resolved);
    }
  }
  async function sample(type, hit, clear, value, threshold, reason) {
    const state = states.get(type);
    if (state.alert) {
      state.clearCount = clear ? state.clearCount + 1 : 0;
      if (state.clearCount >= settings.consecutiveReadings) await transition(type, false, value, threshold, reason);
    } else {
      state.triggerCount = hit ? state.triggerCount + 1 : 0;
      state.phase = hit ? 'PENDING' : 'NORMAL';
      if (state.triggerCount >= settings.consecutiveReadings) await transition(type, true, value, threshold);
    }
  }
  async function process(reading, { retained = false } = {}) {
    if (!ready || retained) return;
    const time = Date.parse(reading.receivedAt);
    if (!Number.isFinite(time) || time <= lastTime || now() - time > 10000 || time > now() + 1000) return;
    lastTime = time;
    const session = reading.controlSession || 'legacy';
    if (lastSession !== session || (lastSampleTime && time - lastSampleTime > 10000)) resetCounters();
    lastSession = session;
    // LED ACK telemetry can repeat a DHT sample: count each acquisition at most once.
    if (reading.dhtSampleId !== undefined) {
      if (!Number.isSafeInteger(reading.dhtSampleId) || reading.dhtSampleId < 0 || !Number.isSafeInteger(reading.sampleAgeMs) || reading.sampleAgeMs < 0 || reading.sampleAgeMs > 5000) { resetCounters(); return; }
      const id = `${session}:${reading.dhtSampleId}`;
      if (seen.has(id)) return;
      seen.add(id); if (seen.size > 256) seen.delete(seen.values().next().value);
    } else if (lastSampleTime && time - lastSampleTime < 1900) return;
    lastSampleTime = time;
    quality = { ...evaluateQuality(reading, settings), deviceId: DEVICE_ID, receivedAt: reading.receivedAt,
      id: `${session}:${reading.dhtSampleId ?? reading.receivedAt}` };
    const signature = JSON.stringify([quality.status, quality.sensorVerified, quality.reasons]);
    if (signature !== qualitySignature) { qualitySignature = signature; emit('sensor:quality', quality); }
    await sample('sensorQuality', quality.status !== 'valid', quality.status === 'valid', null, null, 'quality_restored');
    if (!settings.sensorVerified || !settings.alertsEnabled || reading.dhtSampleId === undefined) {
      for (const type of RULES) { states.get(type).triggerCount = 0; states.get(type).clearCount = 0; if (!states.get(type).alert) states.get(type).phase = 'NORMAL'; }
      return;
    }
    for (const type of RULES) {
      const rule = settings[type], state = states.get(type);
      const field = type.startsWith('temperature') ? 'temperature' : 'humidity';
      if (!rule.enabled || !quality.fields[field].thresholdEligible) {
        state.triggerCount = 0; state.clearCount = 0;
        if (!state.alert) state.phase = 'NORMAL';
        continue;
      }
      const value = reading[field];
      const high = type.endsWith('High');
      await sample(type, high ? value >= rule.trigger : value <= rule.trigger,
        high ? value <= rule.clear : value >= rule.clear, value, rule.trigger, 'hysteresis_cleared');
    }
  }
  return { initialize, process, resetCounters,
    configure(config) { settings = config; resetCounters(); qualitySignature = ''; },
    unavailable() { ready = false; resetCounters(); },
    snapshot: () => ({ ready, quality, states: Object.fromEntries([...states].map(([key, value]) => [key, { ...value }])) }) };
}
module.exports = { createAlertEngine, labels };