// Passive integration check: never publishes fake data or changes backend/services.
import assert from 'node:assert/strict';
import { API_URL, CONFIG_ERROR } from '../src/constants/config.js';
import { api } from '../src/services/apiService.js';
import { getSocket } from '../src/services/socketService.js';
if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);
const socket = getSocket();
assert.equal(socket, getSocket(), 'Socket service must reuse one instance');
const updates = [];
socket.on('sensor:update', data => { updates.push(data); console.log('sensor:update', JSON.stringify(data)); });
socket.on('sensor:latest', data => console.log('sensor:latest', JSON.stringify(data)));
socket.on('system:status', data => console.log('system:status', JSON.stringify(data)));
socket.on('connect_error', error => console.log('connect_error', error.message));
console.log('Checking configured LAN URL:', API_URL);
try {
  const health = await api.health(); console.log('health', JSON.stringify(health));
  const latest = await api.latest(); console.log('latest REST', JSON.stringify(latest));
  const history = await api.history(1); console.log('history', JSON.stringify({ total: history.total, page: history.page, count: history.data.length }));
  const stats = await api.stats(); console.log('stats', JSON.stringify(stats));
  socket.connect();
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && updates.length < 3) await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(socket.connected, true);
  assert.ok(updates.length >= 3, 'Need at least three real sensor updates; ESP32 may be off');
  console.log('PASS mobile API services + singleton socket received real backend data');
} finally { socket.removeAllListeners(); socket.disconnect(); }