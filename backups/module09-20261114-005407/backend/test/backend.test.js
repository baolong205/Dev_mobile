const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePayload, parsePagination } = require('../src/services/sensorService');
const { createApp } = require('../src/app');
const SensorReading = require('../src/models/SensorReading');
const fixture = { temperature: 2.5, humidity: 25.9, motion: false, ledGreen: false, ledRed: true };
// Fixtures are unit tests only: never published to MQTT or inserted into MongoDB.
test('preserves suspicious values and nulls without coercion', () => {
  assert.deepEqual(validatePayload(fixture), fixture);
  assert.deepEqual(validatePayload({ ...fixture, temperature: null, humidity: null }), { ...fixture, temperature: null, humidity: null });
});
test('rejects missing, string, nonfinite, array and nonboolean fields', () => {
  for (const value of [null, [], {}, { ...fixture, temperature: '2.5' }, { ...fixture, humidity: Infinity }, { ...fixture, temperature: NaN }, { ...fixture, motion: 1 }]) {
    assert.throws(() => validatePayload(value));
  }
});
test('whitelists input and enforces pagination', () => {
  assert.deepEqual(validatePayload({ ...fixture, receivedAt: 'fake' }), fixture);
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20 });
  assert.deepEqual(parsePagination({ page: '2', limit: '999' }), { page: 2, limit: 100 });
  for (const page of ['0', '-1', '1.2', 'abc', ['1'], '9007199254740991']) assert.throws(() => parsePagination({ page }));
});
test('model specifies collection/index without TTL', () => {
  assert.equal(SensorReading.collection.collectionName, 'sensorreadings');
  assert.ok(SensorReading.schema.indexes().some(([index]) => index.receivedAt === -1));
  assert.ok(SensorReading.schema.indexes().every(([, options]) => options.expireAfterSeconds === undefined));
});
test('HTTP degraded health, unavailable DB, invalid pagination/JSON, and 404', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).data.backend.status, 'running');
    for (const route of ['latest', 'history', 'stats']) {
      response = await fetch(`${base}/api/sensors/${route}`);
      assert.equal(response.status, 503);
    }
    response = await fetch(`${base}/api/sensors/history?page=0`);
    assert.equal(response.status, 400);
    response = await fetch(`${base}/api/sensors/latest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(response.status, 400);
    response = await fetch(`${base}/missing`);
    assert.equal(response.status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});