const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter, once } = require('node:events');
const { io } = require('socket.io-client');
const { createLedService } = require('../src/services/ledService');
const { createSocketServer } = require('../src/sockets/socketServer');
// Isolated protocol test. No physical MQTT publication, GPIO or DB writes.
test('two real Socket.IO clients share confirmed LED state; only requester receives result', async () => {
  const server = http.createServer();
  let sent;
  let sockets;
  const leds = createLedService({ ready: () => true, publish: (topic, payload, callback) => {
    sent = JSON.parse(payload); callback();
  }, onState: state => sockets.publishLedState(state) });
  sockets = createSocketServer(server, { cors: { origin: true }, database: new EventEmitter(),
    getLatest: async () => null, getStatus: () => ({ mqtt: { connected: true, subscribed: true } }), leds });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const first = io(url, { autoConnect: false, reconnection: false });
  const second = io(url, { autoConnect: false, reconnection: false });
  try {
    const firstConnected = once(first, 'connect'); const secondConnected = once(second, 'connect');
    first.connect(); second.connect(); await Promise.all([firstConnected, secondConnected]);
    leds.observe({ mode: 'auto', ledGreen: false, ledRed: true, controlSession: '0123456789abcdef', receivedAt: new Date().toISOString() });
    const results = []; second.on('led:result', value => results.push(value));
    const requesterResult = once(first, 'led:result');
    const firstState = once(first, 'led:state'); const secondState = once(second, 'led:state');
    const accepted = await new Promise(resolve => first.emit('led:command', { mode: 'manual', ledGreen: true }, resolve));
    assert.equal(accepted.requestId, sent.requestId);
    // Drain initial AUTO broadcast before accepting manual ACK.
    assert.equal((await firstState)[0].mode, 'auto'); assert.equal((await secondState)[0].mode, 'auto');
    const nextFirst = once(first, 'led:state'); const nextSecond = once(second, 'led:state');
    assert.equal(leds.acknowledge({ ...sent, success: true, ledGreen: true, ledRed: true }), true);
    assert.equal((await requesterResult)[0].status, 'applied');
    assert.equal((await nextFirst)[0].ledGreen, true); assert.equal((await nextSecond)[0].ledGreen, true);
    assert.equal(results.length, 0);
  } finally { first.disconnect(); second.disconnect(); leds.close(); await sockets.close(); }
});