import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectionSummary, environmentSummary } from '../src/utils/dashboardState.js';
function ready() {
  return { connection: 'connected', stale: false, reading: { temperature: 0, humidity: 0 }, system: { mqtt: { connected: true, subscribed: true } },
    alerts: { active: [], loading: false, error: null, settings: { sensorVerified: true, alertsEnabled: true, humidityLow: { enabled: true } }, quality: { status: 'valid' } } };
}
test('connection label requires socket, MQTT subscription and fresh actual reading', () => {
  const state = ready(); assert.equal(connectionSummary(state).ready, true);
  for (const changed of [{ connection: 'disconnected' }, { stale: true }, { reading: null }, { system: null }, { system: { mqtt: { connected: true, subscribed: false } } }]) {
    assert.equal(connectionSummary({ ...state, ...changed }).ready, false);
  }
});
test('no alerts is never asserted while unverified, disabled, stale, offline or missing quality', () => {
  const state = ready(); assert.equal(environmentSummary(state).label, 'Không có cảnh báo');
  for (const settings of [null, { sensorVerified: false }, { sensorVerified: true, alertsEnabled: false }, { sensorVerified: true, alertsEnabled: true }]) {
    assert.notEqual(environmentSummary({ ...state, alerts: { ...state.alerts, settings } }).tone, 'green');
  }
  for (const changed of [{ stale: true }, { connection: 'disconnected' }, { reading: null }, { system: null }, { system: { mqtt: { connected: false } } }]) assert.notEqual(environmentSummary({ ...state, ...changed }).tone, 'green');
  for (const changed of [{ quality: null }, { quality: { status: 'suspect' } }, { loading: true }, { error: 'unavailable' }]) assert.notEqual(environmentSummary({ ...state, alerts: { ...state.alerts, ...changed } }).tone, 'green');
});
test('active incident remains visible even if monitoring is disabled or disconnected', () => {
  const state = ready(); state.alerts.active = [{ _id: 'real-incident' }]; state.alerts.settings.alertsEnabled = false; state.connection = 'disconnected';
  assert.equal(environmentSummary(state).tone, 'red');
});