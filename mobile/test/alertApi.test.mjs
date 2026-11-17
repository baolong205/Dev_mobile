import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.1:3001';
const { alertsApi } = await import('../src/services/alertService.js');
test('delete alert uses encoded ID, DELETE and no fabricated body', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ success: true, data: { _id: 'abc' } }) }));
  assert.deepEqual(await alertsApi.remove('abc/def'), { _id: 'abc' });
  const [url, options] = mock.mock.calls[0].arguments;
  assert.equal(url, 'http://192.0.2.1:3001/api/alerts/abc%2Fdef');
  assert.equal(options.method, 'DELETE');
  assert.equal('body' in options, false);
});
test('active deletion conflict is surfaced instead of claiming success', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 409, json: async () => ({ success: false, error: { message: 'Không thể xóa cảnh báo đang hoạt động.' } }) }));
  await assert.rejects(alertsApi.remove('abc'), /Không thể xóa/);
});