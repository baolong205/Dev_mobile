import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.1:3001';
const { api } = await import('../src/services/apiService.js');
const reading = { temperature: null, humidity: 0, motion: false, ledGreen: false, ledRed: true, receivedAt: '2026-11-13T16:00:00Z', _id: 'a' };
function stub(t, body, status = 200) {
  return t.mock.method(globalThis, 'fetch', async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
}
test('latest maps data envelope and preserves null/zero', async t => {
  const mock = stub(t, { success: true, data: reading });
  assert.deepEqual(await api.latest(), reading);
  assert.equal(mock.mock.calls[0].arguments[0], 'http://192.0.2.1:3001/api/sensors/latest');
});
test('empty latest 404 is no data, not fabricated values', async t => {
  stub(t, { success: false, error: { code: 'NO_SENSOR_DATA' } }, 404);
  assert.equal(await api.latest(), null);
});
test('health 503 still supplies honest degraded dependency status', async t => {
  const value = { mqtt: { connected: true, subscribed: true }, mongodb: { connected: false }, status: 'degraded' };
  stub(t, { success: false, data: value }, 503);
  assert.deepEqual(await api.health(), value);
});
test('history uses top-level pagination envelope and bounded page size', async t => {
  const result = { success: true, data: [reading], page: 2, totalPages: 3, limit: 20, total: 50 };
  const mock = stub(t, result);
  assert.deepEqual(await api.history(2), result);
  assert.ok(mock.mock.calls[0].arguments[0].endsWith('page=2&limit=20'));
});
test('data APIs reject database outage and malformed result', async t => {
  const mock = stub(t, { success: false }, 503);
  await assert.rejects(api.history(), /tạm thời/);
  mock.mock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: [{}] }) }));
  await assert.rejects(api.history(), /cấu trúc/);
});
test('stats maps existing endpoint without inventing data', async t => {
  const value = { total: 0, temperature: { average: null }, humidity: { average: null } };
  stub(t, { success: true, data: value });
  assert.deepEqual(await api.stats(), value);
});