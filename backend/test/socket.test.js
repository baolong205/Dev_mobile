const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { io } = require('socket.io-client');
const service = require('../src/services/sensorService');
const { startMqtt } = require('../src/mqtt/mqttClient');
const { createSocketServer } = require('../src/sockets/socketServer');
const { loadConfig } = require('../src/config/environment');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(20); }
  throw new Error('Test event timeout');
}
// Isolated fixtures only: no broker publication or database writes.
const reading = { temperature: null, humidity: 24.8, motion: false, ledGreen: false,
  ledRed: true, receivedAt: '2026-11-13T15:48:53.734Z' };

test('production CORS requires explicit origins; development supports opt-in allowlist', () => {
  const env = { MQTT_URL: 'mqtt://localhost:1883', MONGO_URI: 'mongodb://localhost/test', JWT_SECRET: 'x'.repeat(32) };
  assert.throws(() => loadConfig({ ...env, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.equal(loadConfig(env).cors.origin, true);
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production' }));
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production', CORS_ORIGIN: '*' }));
  assert.deepEqual(loadConfig({ ...env, NODE_ENV: 'production', CORS_ORIGIN: 'https://example.com' }).cors.origin, ['https://example.com']);
});

test('one MQTT listener rejects invalid input; emits before pending/failed persistence', async t => {
  const client = new EventEmitter();
  client.connected = true;
  client.subscribe = (topic, options, callback) => callback(null, [{ topic, qos: 0 }]);
  client.end = (force, options, callback) => callback();
  let rejectSave;
  const save = t.mock.method(service, 'saveReading', () => new Promise((resolve, reject) => { rejectSave = reject; }));
  const updates = [];
  const statuses = [];
  const pipeline = startMqtt({ mqttUrl: 'mqtt://unused', topic: 'smartstore/sensors/data' }, {
    connect: () => client, onReading: value => updates.push(value), onStatusChange: () => statuses.push(true)
  });
  try {
    assert.equal(client.listenerCount('message'), 1);
    client.emit('connect'); client.emit('connect');
    assert.equal(client.listenerCount('message'), 1);
    client.emit('message', 'another/topic', Buffer.from(JSON.stringify(reading)));
    client.emit('message', 'smartstore/sensors/data', Buffer.from('{invalid'));
    client.emit('message', 'smartstore/sensors/data', Buffer.from(JSON.stringify({ ...reading, motion: 'false' })));
    assert.equal(updates.length, 0);
    client.emit('message', 'smartstore/sensors/data', Buffer.from(JSON.stringify(reading)));
    assert.equal(updates.length, 1);
    assert.equal(save.mock.callCount(), 1);
    assert.equal(pipeline.status().counters.saved, 0);
    assert.equal(updates[0].temperature, null);
    assert.equal(updates[0].receivedAt, save.mock.calls[0].arguments[1].toISOString());
    rejectSave(new Error('isolated DB unavailable'));
    await pause(0);
    assert.equal(pipeline.status().counters.saveFailed, 1);
    assert.equal(updates.length, 1);
    assert.ok(statuses.length >= 4);
  } finally { await pipeline.close(); }
});

async function harness(t, getLatest = async () => null, cors = { origin: true }) {
  const server = http.createServer();
  const database = new EventEmitter();
  let connected = false;
  const sockets = createSocketServer(server, { cors, database, getLatest,
    getStatus: () => ({ mongodb: { connected }, mqtt: { connected: true, subscribed: true } }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const clients = [];
  function connect(options = {}) {
    const socket = io(`http://127.0.0.1:${server.address().port}`, { forceNew: true, reconnection: false, ...options });
    const events = [];
    socket.onAny((event, payload) => events.push({ event, payload }));
    clients.push(socket);
    return { socket, events };
  }
  t.after(async () => { clients.forEach(socket => socket.close()); await sockets.close(); });
  return { sockets, database, connect, server, setConnected: value => { connected = value; } };
}

test('multiple clients receive exactly one update; memory latest and real status changes', async t => {
  let queries = 0;
  const h = await harness(t, async () => { queries++; return null; });
  const a = h.connect(); const b = h.connect({ transports: ['websocket'] });
  await until(() => a.socket.connected && b.socket.connected);
  await pause(30);
  assert.equal(a.events.filter(x => x.event === 'sensor:latest').length, 0);
  h.sockets.publishReading(reading);
  await until(() => a.events.some(x => x.event === 'sensor:update') && b.events.some(x => x.event === 'sensor:update'));
  assert.equal(a.events.filter(x => x.event === 'sensor:update').length, 1);
  assert.deepEqual(a.events.find(x => x.event === 'sensor:update').payload, reading);
  const before = queries;
  const c = h.connect();
  await until(() => c.events.some(x => x.event === 'sensor:latest'));
  assert.equal(queries, before);
  assert.deepEqual(c.events.find(x => x.event === 'sensor:latest').payload, reading);
  h.setConnected(true); h.database.emit('connected');
  await until(() => a.events.some(x => x.event === 'system:status' && x.payload.mongodb.connected));
  h.setConnected(false); h.database.emit('disconnected');
  h.sockets.publishReading({ ...reading, receivedAt: '2026-11-13T15:48:55.734Z' });
  await until(() => a.events.filter(x => x.event === 'sensor:update').length === 2);
  assert.equal(a.events.filter(x => x.event === 'system:status').at(-1).payload.mongodb.connected, false);
  assert.throws(() => createSocketServer(h.server, {}), /already attached/);
});

test('DB latest fallback works and stale DB result never follows newer MQTT update', async t => {
  let resolveQuery;
  const h = await harness(t, () => new Promise(resolve => { resolveQuery = resolve; }));
  const a = h.connect();
  await until(() => resolveQuery);
  resolveQuery(reading);
  await until(() => a.events.some(x => x.event === 'sensor:latest'));
  const b = h.connect();
  const firstResolver = resolveQuery;
  await until(() => resolveQuery !== firstResolver);
  h.sockets.publishReading(reading);
  resolveQuery({ ...reading, receivedAt: '2020-01-01T00:00:00Z' });
  await until(() => b.events.some(x => x.event === 'sensor:update'));
  await pause(30);
  assert.equal(b.events.filter(x => x.event === 'sensor:latest').length, 0);
});

test('origin allowlist rejects disallowed WebSocket handshake', async t => {
  const h = await harness(t, async () => null, { origin: ['https://allowed.example'] });
  const a = h.connect({ transports: ['websocket'], extraHeaders: { Origin: 'https://blocked.example' } });
  await new Promise(resolve => a.socket.once('connect_error', resolve));
  assert.equal(a.socket.connected, false);
  const b = h.connect({ transports: ['websocket'], extraHeaders: { Origin: 'https://allowed.example' } });
  await until(() => b.socket.connected);
});