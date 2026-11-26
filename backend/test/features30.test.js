const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseRange, dateFilter } = require('../src/services/timeRangeService');
const { defaults, validateSettings } = require('../src/services/alertSettingsService');
const { metrics, motionPipeline } = require('../src/services/reportService');
test('range validation rejects arbitrary objects/prototype keys, reversed and oversized dates', () => {
  assert.equal(parseRange({}), null);
  const now = Date.parse('2026-11-17T12:00:00Z');
  for (const [period, days] of [['day', 1], ['week', 7], ['month', 30]]) {
    const range = parseRange({ period }, { now }); assert.equal(range.to - range.from, days * 86400000);
    assert.equal(dateFilter(range).receivedAt.$gte, range.from);
  }
  for (const query of [{ period: 'toString' }, { period: {} }, { from: '2026-11-01' },
    { from: '2026-11-02T00:00:00Z', to: '2026-11-01T00:00:00Z' },
    { from: '2026-01-01T00:00:00Z', to: '2026-11-01T00:00:00Z' }]) assert.throws(() => parseRange(query), { status: 400 });
});
test('notifications preference is independent from monitoring and sensor verification', () => {
  const result = validateSettings({ notificationsEnabled: false });
  assert.equal(result.notificationsEnabled, false); assert.equal(result.alertsEnabled, false);
  assert.equal(defaults().notificationsEnabled, true);
  assert.throws(() => validateSettings({ notificationsEnabled: 'false' }));
});
test('report metrics preserve empty/null values and motion uses one preceding telemetry sample', () => {
  assert.deepEqual(metrics().temperature, { count: 0, average: null, min: null, max: null });
  const range = parseRange({ period: 'day' }); const pipeline = motionPipeline(range);
  assert.equal(+pipeline[0].$match.receivedAt.$gte, +range.from - 10000);
  assert.equal(pipeline[1].$setWindowFields.output.previous.$shift.by, -1);
});