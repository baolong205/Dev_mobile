const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAlertEngine } = require('../src/services/alertService');
const { evaluateQuality } = require('../src/services/sensorQualityService');
const { defaults, validateSettings } = require('../src/services/alertSettingsService');
const { createAlertRoutes } = require('../src/routes/alertRoutes');
const AlertModel = require('../src/models/Alert');
function harness(overrides = {}) {
  let clock = Date.parse('2026-11-13T12:00:00Z'), id = 0;
  const rows = [], events = [];
  const config = { ...defaults(), sensorVerified: true, alertsEnabled: true, ...overrides };
  let fail = false;
  const repository = {
    async create(data) { if (fail) throw Error('DB offline'); const existing = rows.find(row => row.type === data.type && row.status === 'ACTIVE');
      if (existing) return { alert: existing, created: false };
      const alert = { ...data, _id: String(rows.length + 1), updatedAt: new Date(clock).toISOString() }; rows.push(alert); return { alert, created: true }; },
    async resolve(key, timestamp, reason) { if (fail) throw Error('DB offline'); const row = rows.find(value => value._id === key); Object.assign(row, { status: 'RESOLVED', resolvedAt: timestamp, resolutionReason: reason, updatedAt: timestamp }); return { ...row }; }
  };
  const engine = createAlertEngine({ repository, now: () => clock, emit: (event, data) => events.push({ event, data: { ...data } }) });
  const init = (active = [], notifications = []) => engine.initialize(config, active, notifications);
  function reading(t = 25, h = 50) { clock += 2000; return { temperature: t, humidity: h, receivedAt: new Date(clock).toISOString(), dhtSampleId: ++id, sampleAgeMs: 0, controlSession: '0123456789abcdef' }; }
  return { engine, init, rows, events, config, reading, repository, fail: value => { fail = value; },
    async feed(t = 25, h = 50, n = 1) { for (let i = 0; i < n; i++) await engine.process(reading(t, h)); },
    advance: ms => { clock += ms; } };
}
test('quality distinguishes invalid, suspect, unverified and valid without coercion', () => {
  for (const t of [null, NaN, Infinity, '25', -41, 81]) assert.equal(evaluateQuality({ temperature: t, humidity: 50 }).status, 'invalid');
  const data = { temperature: 2.5, humidity: 25.9 };
  assert.equal(evaluateQuality(data).status, 'suspect'); assert.equal(data.temperature, 2.5);
  assert.equal(evaluateQuality({ temperature: 25, humidity: 50 }).status, 'unverified');
  assert.equal(evaluateQuality({ temperature: 25, humidity: 50 }, { sensorVerified: true }).status, 'valid');
});
test('DHT22 decimal temperature and high RH are eligible only with verification', async () => {
  const reading = { temperature: 29.7, humidity: 96.1 };
  assert.equal(evaluateQuality(reading).status, 'unverified');
  const quality = evaluateQuality(reading, { sensorVerified: true });
  assert.equal(quality.status, 'valid');
  assert.equal(quality.fields.humidity.thresholdEligible, true);
  assert.equal(quality.fields.temperature.thresholdEligible, true);
  assert.deepEqual(reading, { temperature: 29.7, humidity: 96.1 });
  for (const humidity of [-0.1, 100.1, null, '96.1', Infinity]) assert.equal(evaluateQuality({ ...reading, humidity }, { sensorVerified: true }).fields.humidity.thresholdEligible, false);
  const h = harness(); await h.init(); await h.feed(29.7, 96.1, 3);
  assert.equal(h.rows.find(row => row.type === 'humidityHigh').status, 'ACTIVE');
  assert.equal(h.rows.some(row => row.type === 'sensorQuality'), false);
  await h.feed(29.7, 75, 3);
  assert.equal(h.rows.find(row => row.type === 'humidityHigh').status, 'RESOLVED');
});
test('DHT22 temperature setting range accepts -40..80 without changing defaults', () => {
  assert.equal(validateSettings({ temperatureHigh: { enabled: true, trigger: 79.5, clear: 78 } }).temperatureHigh.trigger, 79.5);
  assert.equal(validateSettings({ temperatureLow: { enabled: true, trigger: -39, clear: -38 } }).temperatureLow.trigger, -39);
  for (const trigger of [-40.1, 80.1]) assert.throws(() => validateSettings({ temperatureHigh: { enabled: true, trigger, clear: trigger - 1 } }));
});
test('normal, pending and three consecutive trigger samples; no duplicate ACTIVE', async () => {
  const h = harness(); await h.init(); await h.feed(); assert.equal(h.rows.length, 0);
  await h.feed(35); assert.equal(h.engine.snapshot().states.temperatureHigh.phase, 'PENDING'); assert.equal(h.rows.length, 0);
  await h.feed(35, 50, 2); assert.equal(h.rows.length, 1); assert.equal(h.rows[0].status, 'ACTIVE');
  await h.feed(36, 50, 20); assert.equal(h.rows.length, 1);
  assert.equal(h.events.filter(e => e.event === 'alert:created').length, 1);
});
test('verified humidity 23.6 triggers independently of suspect temperature, preserving quality warning', async () => {
  const h = harness({ humidityLow: { enabled: true, trigger: 25, clear: 30 } }); await h.init();
  await h.feed(1.4, 23.6, 3);
  const incident = h.rows.find(row => row.type === 'humidityLow');
  assert.equal(incident.status, 'ACTIVE'); assert.equal(incident.value, 23.6);
  assert.equal(h.rows.find(row => row.type === 'sensorQuality').status, 'ACTIVE');
  assert.equal(h.rows.some(row => row.type === 'temperatureLow'), false);
  await h.feed(1.4, null, 3); assert.equal(incident.status, 'ACTIVE');
  await h.feed(1.4, 30, 3); assert.equal(incident.status, 'RESOLVED');
  assert.equal(h.rows.find(row => row.type === 'sensorQuality').status, 'ACTIVE');
  const unverified = harness({ sensorVerified: false, humidityLow: { enabled: true, trigger: 25, clear: 30 } });
  await unverified.init(); await unverified.feed(1.4, 23.6, 3);
  assert.equal(unverified.rows.some(row => row.type === 'humidityLow'), false);
});
test('non-trigger resets pending and hysteresis requires three consecutive clear samples', async () => {
  const h = harness(); await h.init(); await h.feed(35, 50, 2); await h.feed(34); await h.feed(35, 50, 2); assert.equal(h.rows.length, 0);
  await h.feed(35); await h.feed(34, 50, 4); assert.equal(h.rows[0].status, 'ACTIVE');
  await h.feed(33, 50, 2); await h.feed(34); await h.feed(33, 50, 2); assert.equal(h.rows[0].status, 'ACTIVE');
  await h.feed(33); assert.equal(h.rows[0].status, 'RESOLVED'); assert.ok(h.rows[0].resolvedAt);
});
test('null resets counters and cannot trigger or resolve environmental incidents', async () => {
  const h = harness(); await h.init(); await h.feed(35, 50, 3); await h.feed(null, 50, 3);
  assert.equal(h.rows.find(r => r.type === 'temperatureHigh').status, 'ACTIVE');
  assert.equal(h.rows.find(r => r.type === 'sensorQuality').status, 'ACTIVE');
  await h.feed(33, 50, 3); assert.equal(h.rows.find(r => r.type === 'temperatureHigh').status, 'RESOLVED');
});
test('unverified and disabled monitoring never create environmental alerts', async () => {
  for (const options of [{ sensorVerified: false }, { alertsEnabled: false }]) {
    const h = harness(options); await h.init(); await h.feed(40, 50, 10);
    assert.equal(h.rows.some(row => row.type === 'temperatureHigh'), false);
  }
});
test('legacy telemetry without DHT acquisition identity cannot arm environmental alerts', async () => {
  const h = harness(); await h.init();
  for (let i = 0; i < 6; i++) { const reading = h.reading(40); delete reading.dhtSampleId; delete reading.sampleAgeMs; await h.engine.process(reading); }
  assert.equal(h.rows.some(row => row.type === 'temperatureHigh'), false);
});
test('duplicate acquisition IDs, retained, stale and out-of-order readings are not new samples', async () => {
  const h = harness(); await h.init(); const row = h.reading(35);
  await h.engine.process(row); for (let i = 0; i < 10; i++) await h.engine.process({ ...row, receivedAt: h.reading().receivedAt });
  assert.equal(h.rows.length, 0);
  await h.engine.process(h.reading(35), { retained: true });
  const stale = h.reading(35); h.advance(20000); await h.engine.process(stale);
  await h.engine.process(row); assert.equal(h.rows.length, 0);
});
test('reconnect/gap resets PENDING; ACTIVE restored on restart without duplicate creation', async () => {
  const h = harness(); await h.init(); await h.feed(35, 50, 2); h.advance(20000); await h.feed(35); assert.equal(h.rows.length, 0);
  await h.feed(35, 50, 2); const active = { ...h.rows[0] }; await h.init([active]); await h.feed(36, 50, 6);
  assert.equal(h.rows.length, 1); assert.equal(h.events.filter(e => e.event === 'alert:created').length, 1);
});
test('cooldown suppresses notification only, never hides a new ACTIVE incident', async () => {
  const h = harness(); await h.init(); await h.feed(35, 50, 3); await h.feed(33, 50, 3); await h.feed(35, 50, 3);
  assert.equal(h.rows.length, 2); assert.equal(h.rows[1].status, 'ACTIVE'); assert.equal(h.rows[1].notificationSuppressed, true);
  assert.equal(h.rows[1].notificationCount, 0); assert.equal(h.events.filter(e => e.event === 'alert:created').length, 2);
});
test('database failures never commit state or emit saved-success events', async () => {
  const h = harness(); await h.init(); await h.feed(35, 50, 2); h.fail(true);
  await assert.rejects(h.feed(35)); assert.equal(h.rows.length, 0); assert.equal(h.events.filter(e => e.event === 'alert:created').length, 0);
  h.fail(false); await h.feed(35); h.fail(true); await h.feed(33, 50, 2);
  await assert.rejects(h.feed(33)); assert.equal(h.rows[0].status, 'ACTIVE');
});
test('low temperature and high/low humidity use symmetric hysteresis', async () => {
  for (const [type, trigger, clear] of [['temperatureLow', [15, 50], [17, 50]], ['humidityHigh', [25, 80], [25, 75]], ['humidityLow', [25, 30], [25, 35]]]) {
    const h = harness({ [type]: { ...defaults()[type], enabled: true } }); await h.init();
    await h.feed(...trigger, 3); assert.equal(h.rows.find(row => row.type === type).status, 'ACTIVE');
    await h.feed(...clear, 3); assert.equal(h.rows.find(row => row.type === type).status, 'RESOLVED');
  }
});
test('settings strict full validation, verification confirmation and unchanged defaults', () => {
  const before = defaults();
  for (const input of [null, [], { alertsEnabled: true }, { sensorVerified: true }, { cooldownMinutes: -1 }, { consecutiveReadings: 0 },
    { temperatureHigh: { enabled: true, trigger: 35, clear: 36 } }, { humidityHigh: { enabled: true, trigger: 101, clear: 75 } }, { sensorVerified: 'true' }, { unknown: 1 }]) assert.throws(() => validateSettings(input));
  assert.deepEqual(before, defaults());
  assert.equal(validateSettings({ sensorVerified: true, verificationConfirmed: true, alertsEnabled: true }).alertsEnabled, true);
});
test('unique index limits one ACTIVE per device/type and HTTP routes preserve errors/ack semantics', async () => {
  assert.ok(AlertModel.schema.indexes().some(([, options]) => options.unique && options.partialFilterExpression?.status === 'ACTIVE'));
  const express = require('express'), http = require('node:http');
  const app = express(); app.use(express.json());
  const state = { _id: '0123456789abcdef01234567', status: 'ACTIVE' };
  app.use('/api', createAlertRoutes({ getSettings: defaults, active: async () => [state], stats: async () => ({ total: 1 }),
    list: async () => ({ data: [state], page: 1 }), updateSettings: async input => validateSettings(input),
    acknowledge: async () => ({ ...state, acknowledgedAt: new Date().toISOString() }) }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ success: false, error: { message: error.message } }));
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of ['alerts', 'alerts/active', 'alerts/stats', 'alert-settings']) assert.equal((await fetch(`${url}/${path}`)).status, 200);
    const ack = await (await fetch(`${url}/alerts/${state._id}/acknowledge`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    assert.equal(ack.data.status, 'ACTIVE'); assert.ok(ack.data.acknowledgedAt);
  } finally { await new Promise(resolve => server.close(resolve)); }
});