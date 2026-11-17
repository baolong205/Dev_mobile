const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const http = require('node:http');
const { io } = require('socket.io-client');
const { createAlertRuntime } = require('../src/services/alertRuntime');
const { createApp } = require('../src/app');
const { createSocketServer } = require('../src/sockets/socketServer');
const Alert = require('../src/models/Alert');
const Settings = require('../src/models/AlertSettings');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
test('isolated MongoDB persistence, restart recovery, HTTP validation/ack and real Socket.IO fan-out', { skip: !process.env.SMARTSTORE_TEST_MONGO_URI, timeout: 30000 }, async () => {
  const uri = process.env.SMARTSTORE_TEST_MONGO_URI;
  // Destructive cleanup is limited to an explicitly named throwaway database. Never smartstore.
  if (!/^mongodb:\/\/127\.0\.0\.1:27017\/smartstore_module09_test_[a-f0-9]+$/.test(uri)) throw Error('Refusing non-isolated test database');
  let runtime, sockets, client, server;
  let sampleId = 0;
  const events = [];
  const build = () => createAlertRuntime({ emit: (event, data) => { events.push({ event, data }); sockets?.publishAlert(event, data); } });
  async function ready() { for (let i = 0; i < 100; i++) { try { runtime.getSettings(); return; } catch { await pause(50); } } throw Error('Runtime restore timeout'); }
  async function feed(temp, count = 3) {
    for (let i = 0; i < count; i++) {
      runtime.ingest({ temperature: temp, humidity: 50, controlSession: '0123456789abcdef', dhtSampleId: ++sampleId, sampleAgeMs: 0, receivedAt: new Date().toISOString() });
      await pause(100);
    }
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    runtime = build(); await ready(); assert.equal(await Settings.countDocuments(), 0, 'startup does not seed settings');
    await feed(35); assert.equal(await Alert.countDocuments({ type: 'temperatureHigh' }), 0);
    assert.equal(await Alert.countDocuments({ type: 'sensorQuality', status: 'ACTIVE' }), 1);
    await runtime.updateSettings({ sensorVerified: true, verificationConfirmed: true, alertsEnabled: true });
    server = http.createServer(createApp(() => ({ connected: true, subscribed: true }), { origin: true }, runtime));
    sockets = createSocketServer(server, { cors: { origin: true }, database: mongoose.connection, getLatest: async () => null, getStatus: () => ({}), getQuality: runtime.quality });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    client = io(url, { reconnection: false });
    const clientEvents = []; client.onAny((event, data) => clientEvents.push({ event, data }));
    await pause(100); await feed(35);
    const active = await Alert.findOne({ type: 'temperatureHigh', status: 'ACTIVE' }).lean(); assert.ok(active);
    assert.equal(clientEvents.filter(e => e.event === 'alert:created' && e.data.type === 'temperatureHigh').length, 1);
    runtime.close(); runtime = build(); await ready(); await feed(36);
    assert.equal(await Alert.countDocuments({ type: 'temperatureHigh' }), 1, 'no duplicate after restart');
    // The server closures refer to the previous runtime; persistence APIs remain safe/read-only here.
    const response = await fetch(`${url}/api/alerts/${active._id}/acknowledge`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 200); assert.equal((await response.json()).data.status, 'ACTIVE');
    assert.equal((await fetch(`${url}/api/alerts?limit=0`)).status, 400);
    assert.equal((await fetch(`${url}/api/alerts?type=bogus`)).status, 400);
    assert.equal((await fetch(`${url}/api/alerts?from=bad`)).status, 400);
    await pause(550);
    const invalid = await fetch(`${url}/api/alert-settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consecutiveReadings: 0 }) });
    assert.equal(invalid.status, 400); assert.equal((await Settings.findOne().lean()).consecutiveReadings, 3);
    await feed(33); const resolved = await Alert.findById(active._id).lean(); assert.equal(resolved.status, 'RESOLVED'); assert.ok(resolved.resolvedAt); assert.ok(resolved.acknowledgedAt);
    await feed(35); assert.equal(await Alert.countDocuments({ type: 'temperatureHigh' }), 2);
    assert.equal((await Alert.findOne({ type: 'temperatureHigh', status: 'ACTIVE' }).lean()).notificationSuppressed, true);
    // Delete only resolved history; retain internal timestamps for restart cooldown.
    await pause(550);
    const activeNow = await Alert.findOne({ type: 'temperatureHigh', status: 'ACTIVE' }).lean();
    assert.equal((await fetch(`${url}/api/alerts/${activeNow._id}`, { method: 'DELETE' })).status, 409);
    await pause(550);
    assert.equal((await fetch(`${url}/api/alerts/bad-id`, { method: 'DELETE' })).status, 400);
    await pause(550);
    assert.equal((await fetch(`${url}/api/alerts/000000000000000000000000`, { method: 'DELETE' })).status, 404);
    await pause(550);
    const deletion = await fetch(`${url}/api/alerts/${active._id}`, { method: 'DELETE' });
    assert.equal(deletion.status, 200);
    assert.equal((await deletion.json()).data._id, String(active._id));
    const storedDeleted = await Alert.findById(active._id).lean();
    assert.ok(storedDeleted.deletedAt); assert.ok(storedDeleted.lastNotifiedAt);
    const history = await (await fetch(`${url}/api/alerts`)).json();
    assert.equal(history.data.some(row => row._id === String(active._id)), false);
    const stats = await (await fetch(`${url}/api/alerts/stats`)).json();
    assert.equal(stats.data.total, await Alert.countDocuments({ deletedAt: null }));
    await pause(100);
    assert.equal(clientEvents.filter(e => e.event === 'alert:deleted' && e.data._id === String(active._id)).length, 1);
    await pause(550);
    assert.equal((await fetch(`${url}/api/alerts/${active._id}`, { method: 'DELETE' })).status, 200, 'repeat deletion is idempotent');
  } finally {
    client?.disconnect(); runtime?.close(); if (sockets) await sockets.close(); else if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === uri.split('/').at(-1)) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});