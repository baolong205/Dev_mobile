// Uses real incoming ESP32 readings only. --broker-recovery briefly stops the named broker.
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const { loadConfig } = require('../src/config/environment');
const root = path.resolve(__dirname, '..');
const config = loadConfig();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, seconds = 35) {
  for (let i = 0; i < seconds * 5; i++) {
    if (await check()) return;
    await pause(200);
  }
  throw new Error(`Timeout: ${label}`);
}
async function request(base, route) {
  const response = await fetch(`${base}/api/${route}`, { signal: AbortSignal.timeout(8000) });
  return { status: response.status, body: await response.json() };
}
function startServer(env = {}) {
  const child = spawn(process.execPath, ['src/server.js'], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => process.stdout.write(`[backend ${child.pid}] ${data}`));
  child.stderr.on('data', data => process.stdout.write(`[backend ${child.pid}] ${data}`));
  return child;
}
async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill();
  await exited;
}
function connect(base) {
  const socket = io(base, { forceNew: true, reconnection: true });
  const events = [];
  socket.onAny((event, payload) => {
    events.push({ event, payload });
    console.log(`[client ${socket.id}] ${event} ${JSON.stringify(payload)}`);
  });
  socket.on('connect_error', error => console.log(`[client] connect_error ${error.message}`));
  return { socket, events, updates: () => events.filter(item => item.event === 'sensor:update') };
}
async function unusedPort() {
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function main() {
  const base = `http://127.0.0.1:${config.port}`;
  let backend; let isolated; let brokerStopped = false;
  const clients = [];
  try {
    // Refuse to use/stop an unknown existing backend instance.
    const probe = http.createServer();
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(config.port, '0.0.0.0', resolve); });
    await new Promise(resolve => probe.close(resolve));
    backend = startServer();
    await until(async () => {
      assert.equal(backend.exitCode, null, 'backend exited');
      try { return (await request(base, 'health')).status === 200; } catch { return false; }
    }, 'baseline ready');
    const a = connect(base); const b = connect(base); clients.push(a, b);
    await until(() => a.socket.connected && b.socket.connected, 'two clients connected');
    await until(() => a.updates().length >= 3 && b.updates().length >= 3, 'three real updates per client', 45);
    await pause(200);
    assert.deepEqual(a.updates(), b.updates(), 'clients differ');
    const baseline = await request(base, 'health');
    const before = a.updates().length;
    await until(() => a.updates().length >= before + 3, 'observation window', 45);
    await pause(200);
    const after = await request(base, 'health');
    assert.equal(a.updates().length - before,
      after.body.data.mqtt.counters.received - baseline.body.data.mqtt.counters.received,
      'one update per received valid MQTT message');
    assert.deepEqual(a.updates(), b.updates());
    console.log('PASS real MQTT messages mapped 1:1 to updates for two clients');
    const expected = a.updates().at(-1).payload;
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    let stored;
    await until(async () => {
      stored = await mongoose.connection.db.collection('sensorreadings').findOne({ receivedAt: new Date(expected.receivedAt) });
      return !!stored;
    }, 'persisted matching receivedAt');
    for (const key of ['temperature', 'humidity', 'motion', 'ledGreen', 'ledRed']) assert.equal(stored[key], expected[key]);
    console.log(`PASS MongoDB matches realtime fields and receivedAt; _id=${stored._id}`);
    await mongoose.disconnect();
    const c = connect(base); clients.push(c);
    await until(() => c.events.some(item => item.event === 'sensor:latest'), 'new client memory latest');
    assert.ok(a.updates().some(item => item.payload.receivedAt === c.events.find(item => item.event === 'sensor:latest').payload.receivedAt));
    console.log('PASS new client receives in-memory latest');
    for (const route of ['health', 'sensors/latest', 'sensors/history?page=1&limit=2', 'sensors/stats']) {
      assert.equal((await request(base, route)).status, 200);
      console.log(`PASS REST ${route} HTTP 200`);
    }
    if (process.argv.includes('--broker-recovery')) {
      execFileSync('docker', ['stop', '--time', '5', 'smartstore-mosquitto']); brokerStopped = true;
      await until(() => a.events.some(item => item.event === 'system:status' && !item.payload.mqtt.connected), 'socket MQTT disconnected status');
      assert.equal((await request(base, 'health')).status, 503);
      const downCount = a.updates().length;
      await pause(3500);
      assert.equal(a.updates().length, downCount, 'no replay as fresh data during outage');
      execFileSync('docker', ['start', 'smartstore-mosquitto']); brokerStopped = false;
      await until(() => a.updates().length > downCount, 'fresh ESP32 update after broker recovery', 50);
      assert.equal((await request(base, 'health')).status, 200);
      assert.ok(a.events.filter(item => item.event === 'system:status').at(-1).payload.mqtt.subscribed);
      console.log('PASS broker outage status, no fake updates, reconnect and fresh updates');
    }
    // Separate backend: real broker, unreachable DB. Never stop the shared MongoDB service.
    const port = await unusedPort();
    const unavailablePort = await unusedPort();
    isolated = startServer({ PORT: String(port), MONGO_URI: `mongodb://127.0.0.1:${unavailablePort}/smartstore_unavailable_test` });
    const isolatedBase = `http://127.0.0.1:${port}`;
    await until(async () => { try { return (await request(isolatedBase, 'health')).status === 503; } catch { return false; } }, 'isolated backend HTTP');
    const d = connect(isolatedBase); clients.push(d);
    await until(() => d.updates().length >= 2, 'realtime with unavailable DB', 45);
    const degraded = await request(isolatedBase, 'health');
    assert.equal(degraded.body.data.mongodb.connected, false);
    assert.equal(degraded.body.data.mqtt.connected, true);
    assert.equal(degraded.body.data.mqtt.counters.saved, 0);
    assert.ok(degraded.body.data.mqtt.counters.saveFailed > 0);
    for (const route of ['sensors/latest', 'sensors/history', 'sensors/stats']) assert.equal((await request(isolatedBase, route)).status, 503);
    assert.ok(d.events.some(item => item.event === 'system:status' && !item.payload.mongodb.connected));
    console.log('PASS real MQTT realtime continues with unavailable DB; saved=0, saveFailed>0, REST=503');
    console.log('Actual MongoDB service recovery is a separate elevated test: scripts/runMongoRecovery.ps1');
    console.log('MODULE06 LIVE CHECKS PASSED');
  } finally {
    if (brokerStopped) execFileSync('docker', ['start', 'smartstore-mosquitto']);
    clients.forEach(client => client.socket.close());
    await mongoose.disconnect();
    await stopServer(isolated);
    await stopServer(backend);
    console.log('Cleanup: own clients/backends closed; existing MongoDB kept; broker restored');
  }
}
main().catch(error => { console.error('LIVE CHECK FAILED:', error); process.exitCode = 1; });