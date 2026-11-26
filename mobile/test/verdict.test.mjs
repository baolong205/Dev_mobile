import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from '../src/utils/dashboardState.js';

function ready() {
  return { connection: 'connected', stale: false, reading: { temperature: 28, humidity: 60 }, system: { mqtt: { connected: true, subscribed: true } },
    alerts: { active: [], loading: false, error: null, settings: { sensorVerified: true, alertsEnabled: true, temperatureHigh: { enabled: true } }, quality: { status: 'valid' } } };
}

test('store is reported stable only when connected, fresh and monitoring is active', () => {
  assert.deepEqual([verdict(ready()).tone, verdict(ready()).title], ['green', 'Cửa hàng ổn định']);
  assert.equal(verdict({ ...ready(), stale: true }).tone, 'amber');
  assert.equal(verdict({ ...ready(), connection: 'reconnecting' }).title, 'Mất kết nối với cửa hàng');
  const unverified = ready(); unverified.alerts.settings.sensorVerified = false;
  assert.equal(verdict(unverified).tone, 'amber');
});

test('critical alert wins over data-quality warning and shows the measured value', () => {
  const state = ready();
  state.alerts.active = [
    { _id: 'q', type: 'sensorQuality', severity: 'warning', message: 'Dữ liệu DHT chưa đáng tin cậy' },
    { _id: 't', type: 'temperatureHigh', severity: 'critical', value: 36.4 },
  ];
  const result = verdict(state);
  assert.equal(result.tone, 'red');
  assert.match(result.title, /^Nhiệt độ cao 36[.,]4°C$/);
  assert.match(result.detail, /1 cảnh báo khác/);
});

test('data-quality warning alone is amber and uses its own message', () => {
  const state = ready();
  state.alerts.active = [{ _id: 'q', type: 'sensorQuality', severity: 'warning', message: 'Dữ liệu DHT chưa đáng tin cậy' }];
  assert.deepEqual([verdict(state).tone, verdict(state).title], ['amber', 'Dữ liệu DHT chưa đáng tin cậy']);
});
