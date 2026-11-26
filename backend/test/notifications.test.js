const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createNotifier, createDeviceWatchdog } = require('../src/services/notificationService');
const { describeAlert } = require('../src/services/notificationMessages');
const { createAuth, hashPassword } = require('../src/services/authService');
const { createApp } = require('../src/app');
const { createStoreWatch } = require('../src/services/storeWatch');

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

function memoryTokens() {
  const rows = new Map();
  return { rows,
    async upsert({ token, userId, platform, categories }) {
      const row = rows.get(token) || { token, categories: { alerts: true, motion: true, device: true } };
      Object.assign(row, { userId, platform, categories: { ...row.categories, ...categories } });
      rows.set(token, row); return row;
    },
    async remove(token, userId) { if (rows.get(token)?.userId === userId) rows.delete(token); },
    async removeMany(list) { list.forEach(token => rows.delete(token)); },
    async forUser(userId) { return [...rows.values()].filter(row => row.userId === userId); },
    async forCategory(category) { return [...rows.values()].filter(row => row.categories[category] !== false); },
    async markSuccess() {}
  };
}

test('notifier validates tokens, respects categories and drops unregistered devices', async () => {
  const tokens = memoryTokens(), sent = [];
  const sender = { async send(messages) { sent.push(...messages); return messages.map(m => m.to === TOKEN_B ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' }); } };
  const notifier = createNotifier({ tokens, sender });
  await assert.rejects(notifier.register('u1', { token: 'not-a-token' }), /không hợp lệ/);
  await assert.rejects(notifier.register('u1', { token: TOKEN_A, categories: { spam: true } }), /không hợp lệ/);
  await notifier.register('u1', { token: TOKEN_A, platform: 'android' });
  await notifier.register('u2', { token: TOKEN_B, platform: 'ios', categories: { motion: false } });

  const motion = await notifier.notify('motion', { title: 'M', body: 'b' });
  assert.deepEqual(sent.map(m => m.to), [TOKEN_A], 'u2 disabled motion');
  assert.equal(motion.sent, 1);

  sent.length = 0;
  const alert = await notifier.notify('alerts', { title: 'A', body: 'b', data: { screen: 'Alerts' } });
  assert.equal(sent.length, 2);
  assert.equal(sent[0].channelId, 'alerts');
  assert.equal(sent[0].priority, 'high');
  assert.deepEqual(sent[0].data, { screen: 'Alerts', category: 'alerts' });
  assert.equal(alert.removed, 1);
  assert.equal(tokens.rows.has(TOKEN_B), false, 'DeviceNotRegistered token removed');

  assert.deepEqual(await notifier.notify('unknown', {}), { sent: 0, removed: 0 });
});

test('notifier never throws when Expo Push is unavailable', async () => {
  const tokens = memoryTokens();
  const notifier = createNotifier({ tokens, sender: { send: async () => { throw new Error('network'); } }, log: { warn() {} } });
  await notifier.register('u1', { token: TOKEN_A });
  assert.deepEqual(await notifier.notify('alerts', { title: 't', body: 'b' }), { sent: 0, removed: 0 });
});

test('device watchdog reports offline once and online again', () => {
  let time = 0; const events = [];
  const dog = createDeviceWatchdog({ timeoutMs: 1000, now: () => time, intervalMs: 1e9,
    onOffline: () => events.push('offline'), onOnline: () => events.push('online') });
  dog.check(); assert.deepEqual(events, [], 'never seen: no alarm at startup');
  dog.seen(0); time = 900; dog.check(); assert.deepEqual(events, []);
  time = 1500; dog.check(); dog.check(); assert.deepEqual(events, ['offline']);
  dog.seen(1600); assert.deepEqual(events, ['offline', 'online']);
  dog.close();
});

test('alert push text includes value and threshold', () => {
  const message = describeAlert({ type: 'temperatureHigh', severity: 'critical', value: 36.25, threshold: 35, message: 'Nhiệt độ cao' });
  assert.match(message.title, /Nhiệt độ cao/);
  assert.match(message.body, /36,3°C/);
  assert.match(message.body, /ngưỡng 35°C/);
  assert.equal(describeAlert({ type: 'sensorQuality', message: 'DHT lỗi' }).body, 'DHT lỗi');
});

test('store watch signals only new motion incidents, not grouped repeats', async () => {
  const incidents = [];
  let created = 0;
  const repo = { mode: async () => ({ mode: 'closed', shift: 's1' }), record: async () => ++created === 1, list: async () => [] };
  const watch = createStoreWatch(repo, () => {}, event => incidents.push(event));
  const at = offset => new Date(Date.UTC(2026, 0, 1, 0, 0, offset)).toISOString();
  const s = '0123456789abcdef';
  watch.ingest({ motion: false, receivedAt: at(0), controlSession: s });
  await watch.ingest({ motion: true, receivedAt: at(2), controlSession: s });
  watch.ingest({ motion: false, receivedAt: at(4), controlSession: s });
  await watch.ingest({ motion: true, receivedAt: at(6), controlSession: s }); // grouped into the first incident
  assert.equal(incidents.length, 1);
});

test('REST: viewer can manage own push token; admin role not required', async () => {
  const user = { _id: 'c'.repeat(24), username: 'viewer', role: 'viewer', tokenVersion: 0, passwordHash: await hashPassword('viewer-pass-1') };
  const auth = createAuth({ secret: 'x'.repeat(40), users: {
    findByUsername: async n => (n === 'viewer' ? user : null), findById: async id => (id === user._id ? user : null),
    count: async () => 1, create: async () => {} } });
  const tokens = memoryTokens(), sent = [];
  const notifier = createNotifier({ tokens, sender: { send: async m => { sent.push(...m); return m.map(() => ({ status: 'ok' })); } } });
  const server = http.createServer(createApp(undefined, undefined, undefined, undefined, { auth, notifier }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const call = (path, method, body, token) => fetch(url + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await call('/api/notifications/token', 'PUT', { token: TOKEN_A })).status, 401);
    const { token } = (await (await call('/api/auth/login', 'POST', { username: 'viewer', password: 'viewer-pass-1' })).json()).data;
    assert.equal((await call('/api/notifications/test', 'POST', null, token)).status, 404, 'no token registered yet');
    const saved = await call('/api/notifications/token', 'PUT', { token: TOKEN_A, platform: 'android', categories: { motion: false } }, token);
    assert.equal(saved.status, 200);
    assert.equal(tokens.rows.get(TOKEN_A).userId, user._id);
    assert.equal((await call('/api/notifications/test', 'POST', null, token)).status, 200);
    assert.equal(sent.length, 1);
    assert.equal((await call('/api/notifications/token', 'DELETE', { token: TOKEN_A }, token)).status, 200);
    assert.equal(tokens.rows.size, 0);
    // Viewer still cannot change store settings.
    assert.equal((await call('/api/store-watch/mode', 'PUT', { mode: 'closed' }, token)).status, 403);
  } finally { server.close(); }
});
