import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveAlertReading } from '../src/utils/alertData.js';
const alert = { type: 'humidityLow', status: 'ACTIVE', value: 23.7, threshold: 25 };
function state(value = 23.1) {
  return { connection: 'connected', stale: false, system: { mqtt: { connected: true, subscribed: true } }, reading: { humidity: value },
    alerts: { settings: { sensorVerified: true, humidityLow: { trigger: 20, clear: 30 } }, quality: { status: 'suspect', fields: { humidity: { status: 'valid', thresholdEligible: true } } } } };
}
test('live measurement and current rule do not overwrite the original incident snapshot', () => {
  const live = liveAlertReading(alert, state());
  assert.equal(live.value, 23.1); assert.equal(live.rule.trigger, 20); assert.equal(live.rule.clear, 30);
  assert.equal(live.eligible, true, 'suspect temperature does not conceal valid humidity');
  assert.equal(alert.value, 23.7); assert.equal(alert.threshold, 25);
  assert.equal(liveAlertReading({ ...alert, status: 'RESOLVED' }, state()), null);
  assert.equal(liveAlertReading({ ...alert, type: 'sensorQuality' }, state()), null);
});
test('live value preserves zero, rejects null and labels offline/unverified/suspect readings', () => {
  assert.equal(liveAlertReading(alert, state(0)).value, 0);
  assert.equal(liveAlertReading(alert, state(null)).value, null);
  for (const changed of [{ stale: true }, { connection: 'disconnected' }, { system: null }]) {
    const live = liveAlertReading(alert, { ...state(), ...changed });
    assert.equal(live.eligible, false); assert.match(live.status, /dữ liệu cũ/);
  }
  const unverified = state(); unverified.alerts.settings.sensorVerified = false;
  assert.equal(liveAlertReading(alert, unverified).eligible, false);
  const suspect = state(); suspect.alerts.quality.fields.humidity = { status: 'suspect', thresholdEligible: false };
  assert.match(liveAlertReading(alert, suspect).status, /kiểm tra/);
});