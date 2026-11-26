import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeRange, rangeQuery } from '../src/utils/timeRange.js';
import { reportCsv, reportHtml } from '../src/utils/reportExport.js';
import { createAvailabilityTracker } from '../src/utils/deviceAvailability.js';
import { chartGeometry } from '../src/utils/chartData.js';
test('day/week/month use exact frozen rolling boundaries with encoded ISO queries', () => {
  const now = Date.parse('2026-11-17T12:00:00Z');
  for (const [period, days] of [['day', 1], ['week', 7], ['month', 30]]) {
    const range = timeRange(period, now);
    assert.equal(Date.parse(range.to) - Date.parse(range.from), days * 86400000);
    assert.equal(new URLSearchParams(rangeQuery(range).slice(1)).get('from'), range.from);
  }
  assert.throws(() => timeRange('year')); assert.equal(rangeQuery(null), '');
});
test('CSV includes BOM, null remains empty; PDF escapes HTML and includes stats', () => {
  const report = { from: 'start', to: 'end', total: 2, temperature: { average: 20, min: null, max: 25 }, humidity: { average: 50, min: 40, max: 60 },
    motionEvents: 1, motionSamples: 2, alerts: { total: 1, active: 1, resolved: 0 }, note: '<script>"a,b"</script>',
    series: [{ receivedAt: 'time', temperature: null, humidity: 60, count: 1 }] };
  const csv = reportCsv(report), html = reportHtml(report);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"time","","60","1"'));
  assert.ok(csv.includes('""a,b""')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Lượt chuyển động'));
});
test('availability warns once only after fresh telemetry; recovery/reset/reconnect rebaseline', () => {
  const tracker = createAvailabilityTracker(10000), start = Date.parse('2026-11-17T12:00:00Z');
  const check = (time, readingTime = start, connection = 'connected') => tracker.check({ now: start + time, connection, reading: { receivedAt: new Date(readingTime).toISOString() } });
  assert.equal(check(11000), null); assert.equal(check(0), null);
  assert.equal(check(10001).type, 'deviceOffline'); assert.equal(check(12000), null);
  check(15000, start + 15000); assert.equal(check(26000, start + 15000).type, 'deviceOffline');
  tracker.reset(); assert.equal(check(27000), null);
  check(30000, start + 30000); check(31000, start + 30000, 'reconnecting'); assert.equal(check(42000, start + 30000), null);
});
test('aggregated chart uses explicit bucket interval while raw chart still breaks at 10 seconds', () => {
  const rows = [0, 900000, 2700000].map((time, i) => ({ receivedAt: new Date(time).toISOString(), temperature: 20 + i }));
  assert.equal(chartGeometry(rows, 'temperature', 300).segments.length, 0);
  assert.equal(chartGeometry(rows, 'temperature', 300, 160, 900000).segments.length, 1);
});