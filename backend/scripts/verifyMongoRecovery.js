// Run from Administrator PowerShell. Interrupts the existing MongoDB service briefly.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const { loadConfig } = require('../src/config/environment');
const config = loadConfig();
const base = `http://127.0.0.1:${config.port}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, seconds = 60) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(300);
  }
  throw new Error(`Timeout: ${label}`);
}
async function request(route) {
  const response = await fetch(`${base}/api/${route}`, { signal: AbortSignal.timeout(8000) });
  return { status: response.status, body: await response.json() };
}
function powershell(command) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference='Stop'; ${command}`], { encoding: 'utf8', timeout: 45000 });
}
async function main() {
  let backend; let socket; let restoreRequired = false;
  const updates = []; const statuses = [];
  try {
    assert.equal(powershell("$p=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()); $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)").trim(), 'True', 'Administrator required');
    assert.equal(powershell('(Get-Service MongoDB).Status').trim(), 'Running');
    const probe = http.createServer();
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(config.port, '0.0.0.0', resolve); });
    await new Promise(resolve => probe.close(resolve));
    backend = spawn(process.execPath, ['src/server.js'], { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
    backend.stdout.on('data', data => process.stdout.write(data));
    backend.stderr.on('data', data => process.stdout.write(data));
    await until(async () => { try { return (await request('health')).status === 200; } catch { return false; } }, 'baseline health');
    socket = io(base, { reconnection: true });
    socket.on('sensor:update', value => { updates.push(value); console.log('sensor:update', JSON.stringify(value)); });
    socket.on('system:status', value => { statuses.push(value); console.log('system:status', JSON.stringify(value)); });
    await until(() => updates.length >= 2, 'baseline ESP32 telemetry');
    const originalPid = backend.pid;
    const baseline = await request('health');
    console.log('PASS baseline real ESP32 and ready, PID', originalPid);
    restoreRequired = true;
    powershell("Stop-Service MongoDB -ErrorAction Stop; (Get-Service MongoDB).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30))");
    console.log('MongoDB service STOPPED');
    await until(async () => {
      const health = await request('health');
      return health.status === 503 && !health.body.data.mongodb.connected;
    }, 'MongoDB disconnect detection');
    const down = await request('health');
    assert.equal(down.body.data.mqtt.connected, true);
    assert.equal(down.body.data.mqtt.subscribed, true);
    const count = updates.length;
    const saved = down.body.data.mqtt.counters.saved;
    await until(() => updates.length >= count + 3, 'three realtime readings during actual DB outage', 25);
    const during = await request('health');
    assert.equal(during.body.data.mqtt.counters.saved, saved);
    assert.ok(during.body.data.mqtt.counters.saveFailed > baseline.body.data.mqtt.counters.saveFailed);
    assert.ok(statuses.some(status => !status.mongodb.connected && status.mqtt.connected));
    for (const route of ['sensors/latest', 'sensors/history', 'sensors/stats']) {
      assert.equal((await request(route)).status, 503);
      console.log('PASS outage REST 503', route);
    }
    console.log('PASS actual MongoDB outage: realtime continues; no false saves; status degraded');
    powershell("Start-Service MongoDB -ErrorAction Stop; (Get-Service MongoDB).WaitForStatus('Running',[TimeSpan]::FromSeconds(30))");
    restoreRequired = false;
    console.log('MongoDB service RUNNING');
    await until(async () => (await request('health')).status === 200, 'driver recovery', 90);
    await until(async () => (await request('health')).body.data.mqtt.counters.saved > saved, 'new persisted telemetry after recovery');
    assert.equal(backend.exitCode, null);
    assert.equal(backend.pid, originalPid);
    for (const route of ['health', 'sensors/latest', 'sensors/history?page=1&limit=2', 'sensors/stats']) {
      assert.equal((await request(route)).status, 200);
      console.log('PASS recovered REST 200', route);
    }
    const latest = (await request('sensors/latest')).body.data;
    assert.ok(updates.some(value => value.receivedAt === latest.receivedAt));
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    const stored = await mongoose.connection.db.collection('sensorreadings').findOne({ _id: new mongoose.Types.ObjectId(latest._id) });
    assert.ok(stored);
    assert.equal(stored.receivedAt.toISOString(), latest.receivedAt);
    assert.ok(statuses.some(status => status.mongodb.connected && status.status === 'ready'));
    console.log('PASS same backend PID recovered and real telemetry persisted:', latest._id);
    console.log('MODULE06 ACTUAL MONGODB SERVICE RECOVERY PASSED');
  } finally {
    if (restoreRequired) {
      powershell("Start-Service MongoDB -ErrorAction Stop; (Get-Service MongoDB).WaitForStatus('Running',[TimeSpan]::FromSeconds(30))");
      console.log('FINALLY restored MongoDB service');
    }
    socket?.close();
    await mongoose.disconnect();
    if (backend && backend.exitCode === null) {
      const exited = new Promise(resolve => backend.once('exit', resolve));
      backend.kill(); await exited;
    }
    console.log('Cleanup: own backend/client stopped; MongoDB kept running');
  }
}
main().catch(error => { console.error('MONGODB RECOVERY FAILED', error); process.exitCode = 1; });