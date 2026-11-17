import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatTime, normalizeReading, mergeReading, mergeHistory, isStale, normalizeStatus } from '../src/utils/formatSensor.js';
// Isolated fixtures only. No fixture is sent to a broker, backend or database.
const sample = { temperature: 0, humidity: null, motion: false, ledGreen: false,
  ledRed: true, receivedAt: '2026-11-13T16:00:00.000Z', _id: 'a' };
test('0 is preserved, null and invalid values show placeholders', () => {
  assert.equal(formatNumber(0), '0.0');
  assert.equal(formatNumber(1.25), '1.3');
  for (const value of [null, undefined, NaN, Infinity, '2']) assert.equal(formatNumber(value), '--');
  assert.equal(normalizeReading(sample).temperature, 0);
});
test('invalid sensor payloads never become app readings', () => {
  for (const value of [null, {}, [], { ...sample, temperature: '1' }, { ...sample, humidity: Infinity },
    { ...sample, motion: 'false' }, { ...sample, receivedAt: 'bad' }, { ...sample, ledGreen: undefined }]) {
    assert.equal(normalizeReading(value), null);
  }
});
test('late REST/latest does not overwrite newer socket update or equal timestamp', () => {
  const live = { ...sample, receivedAt: '2026-11-13T16:00:02Z' };
  assert.equal(mergeReading(live, sample), live);
  assert.equal(mergeReading(live, { ...live, temperature: 99 }), live);
  assert.deepEqual(mergeReading(sample, live), live);
  assert.equal(mergeReading(null, null), null);
});
test('stale reading is based on backend receivedAt, not REST fetch time', () => {
  const received = Date.parse(sample.receivedAt);
  assert.equal(isStale(sample, received + 10000, 10000), false);
  assert.equal(isStale(sample, received + 10001, 10000), true);
  assert.equal(isStale(null, received, 10000), true);
  assert.notEqual(formatTime(sample.receivedAt), 'Chưa có dữ liệu');
  assert.equal(formatTime('bad'), 'Chưa có dữ liệu');
});
test('history deduplicates overlapping pages and sorts new readings first', () => {
  const next = { ...sample, _id: 'b', receivedAt: '2026-11-13T16:00:02Z' };
  assert.deepEqual(mergeHistory([sample, next], [sample]), [next, sample]);
  assert.deepEqual(mergeHistory([], []), []);
});
test('system status keeps actual disconnected values and rejects malformed status', () => {
  const value = { mqtt: { connected: false, subscribed: false }, mongodb: { connected: false } };
  assert.equal(normalizeStatus(value).mqtt.connected, false);
  assert.equal(normalizeStatus(value).mongodb.connected, false);
  assert.equal(normalizeStatus({ mqtt: { connected: true } }), null);
});