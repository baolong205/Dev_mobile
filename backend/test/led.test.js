const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLedService, validateCommand, trustedAddress, COMMAND_TOPIC, ACK_TOPIC } = require('../src/services/ledService');
const { validatePayload } = require('../src/services/sensorService');
const { startMqtt } = require('../src/mqtt/mqttClient');
const { EventEmitter } = require('node:events');
const fixture = { mode: 'auto', ledGreen: false, ledRed: true, controlSession: '0123456789abcdef', receivedAt: new Date().toISOString() };
function harness(options = {}) {
  const messages = []; const states = [];
  const service = createLedService({ publish: (...args) => { messages.push(args); args[2]?.(); },
    ready: () => true, onState: state => states.push(state), cooldownMs: 0, ...options });
  service.observe({ ...fixture, receivedAt: new Date().toISOString() });
  return { service, messages, states };
}
test('LED strict validation and development network scope', () => {
  for (const value of [null, [], {}, { mode: 'AUTO' }, { mode: 'auto', ledGreen: false },
    { mode: 'manual', ledRed: 'true' }, { mode: 'manual', requestId: 'client-id' }]) assert.throws(() => validateCommand(value));
  assert.deepEqual(validateCommand({ mode: 'manual' }), { mode: 'manual' });
  assert.deepEqual(validateCommand({ mode: 'manual', ledGreen: false }), { mode: 'manual', ledGreen: false });
  for (const ip of ['127.0.0.1', '::1', '::ffff:192.168.26.214', '10.0.0.1', '172.16.1.1']) assert.equal(trustedAddress(ip), true);
  for (const ip of ['8.8.8.8', '172.32.0.1', 'not-ip']) assert.equal(trustedAddress(ip), false);
});
test('publish is not applied; only matched successful ACK resolves and broadcasts state', async () => {
  const { service, messages, states } = harness();
  try {
    let resolved = false;
    const result = service.request('a', '127.0.0.1', { mode: 'manual', ledGreen: true }).then(value => { resolved = true; return value; });
    await Promise.resolve(); assert.equal(resolved, false);
    assert.equal(messages.length, 1); assert.equal(messages[0][0], COMMAND_TOPIC);
    const command = JSON.parse(messages[0][1]);
    const ack = { ...command, success: true, ledRed: true };
    assert.equal(service.acknowledge({ ...ack, requestId: 'unmatched' }), false);
    assert.equal(service.acknowledge({ ...ack, controlSession: 'stale-session' }), false);
    assert.equal(service.acknowledge(ack, true), false);
    assert.equal(resolved, false);
    assert.equal(service.acknowledge(ack), true);
    assert.equal((await result).status, 'applied');
    assert.equal(states.at(-1).ledGreen, true);
    assert.equal(service.acknowledge(ack), false, 'duplicate ACK ignored');
  } finally { service.close(); }
});
test('no ACK times out without inventing LED state', async () => {
  const { service } = harness({ timeoutMs: 25 });
  try {
    const result = await service.request('a', '127.0.0.1', { mode: 'manual' });
    assert.equal(result.status, 'timeout'); assert.equal(result.mode, null);
    assert.equal(service.state().mode, 'auto');
  } finally { service.close(); }
});
test('offline, public IP, stale telemetry and old firmware commands rejected without publish', async () => {
  const h = harness({ ready: () => false });
  assert.equal((await h.service.request('a', '127.0.0.1', { mode: 'auto' })).status, 'rejected');
  assert.equal(h.messages.length, 0); h.service.close();
  const empty = createLedService({ publish: () => assert.fail('must not publish'), ready: () => true });
  assert.equal((await empty.request('a', '127.0.0.1', { mode: 'manual' })).status, 'rejected'); empty.close();
  const stale = harness({ now: () => Date.now() + 30000 });
  assert.equal((await stale.service.request('a', '127.0.0.1', { mode: 'auto' })).status, 'rejected');
  assert.equal((await stale.service.request('a', '8.8.8.8', { mode: 'auto' })).status, 'rejected'); stale.service.close();
});
test('global in-flight bound, cooldown and disconnect resolve pending without retry', async () => {
  const h = harness({ cooldownMs: 750 });
  const result = h.service.request('a', '127.0.0.1', { mode: 'manual' });
  assert.equal((await h.service.request('b', '127.0.0.1', { mode: 'manual' })).status, 'rejected');
  assert.equal(h.messages.length, 1);
  h.service.disconnected(); assert.equal((await result).status, 'rejected');
  assert.equal(h.service.state(), null); h.service.close();
});
test('rejected/mismatching ACK cannot report success; publish error handled', async () => {
  for (const success of [false, true]) {
    const h = harness(); const result = h.service.request('a', '127.0.0.1', { mode: 'manual', ledRed: false });
    const command = JSON.parse(h.messages[0][1]);
    h.service.acknowledge({ ...command, success, ledGreen: false, ledRed: true });
    assert.equal((await result).status, 'rejected'); h.service.close();
  }
  const h = harness({ publish: () => { throw Error('network'); } });
  assert.equal((await h.service.request('a', '127.0.0.1', { mode: 'auto' })).status, 'rejected'); h.service.close();
});
test('mode/session optional for legacy telemetry but validated when provided', () => {
  const old = { temperature: null, humidity: 0, motion: false, ledGreen: false, ledRed: true };
  assert.deepEqual(validatePayload(old), old);
  assert.equal(validatePayload({ ...old, mode: 'manual', controlSession: fixture.controlSession }).mode, 'manual');
  assert.throws(() => validatePayload({ ...old, mode: 'invalid' }));
  assert.throws(() => validatePayload({ ...old, controlSession: 'bad' }));
});
test('single MQTT listener routes ACK separately and command publish is QoS0 non-retained', async () => {
  const client = new EventEmitter(); client.connected = true;
  client.subscribe = (topic, options, callback) => callback(null, [{ topic, qos: 0 }]);
  const published = [];
  client.publish = (...args) => { published.push(args); args[3]?.(); };
  client.end = (force, options, callback) => callback();
  const pipeline = startMqtt({ mqttUrl: 'mqtt://unused', topic: 'smartstore/sensors/data' }, { connect: () => client });
  try {
    client.emit('connect'); assert.equal(client.listenerCount('message'), 1);
    pipeline.leds.observe({ ...fixture, receivedAt: new Date().toISOString() });
    const result = pipeline.leds.request('a', '127.0.0.1', { mode: 'manual' });
    assert.deepEqual(published[0][2], { qos: 0, retain: false });
    const command = JSON.parse(published[0][1]);
    client.emit('message', ACK_TOPIC, Buffer.from(JSON.stringify({ ...command, success: true, ledGreen: false, ledRed: true })), { retain: false });
    assert.equal((await result).status, 'applied');
    assert.equal(pipeline.status().counters.received, 0, 'ACK not stored as sensor data');
  } finally { await pipeline.close(); }
});