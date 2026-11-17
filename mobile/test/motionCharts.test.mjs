import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMotionDetector } from '../src/utils/motionNotice.js';
import { chartRows, fieldSummary, chartGeometry } from '../src/utils/chartData.js';
const start = Date.parse('2026-11-13T12:00:00Z');
function row(index, motion = false, extra = {}) {
  return { _id: String(index), temperature: 29.7, humidity: 98.3, motion, ledGreen: false, ledRed: true,
    receivedAt: new Date(start + index * 2000).toISOString(), controlSession: '0123456789abcdef', ...extra };
}
test('motion banner requires a fresh rising edge; startup and repeats never notify', () => {
  const detector = createMotionDetector();
  const sample = (index, motion) => detector.sample(row(index, motion), start + index * 2000);
  assert.equal(sample(0, true), null);
  assert.equal(sample(1, true), null);
  assert.equal(sample(2, false), null);
  assert.equal(sample(3, true).type, 'motion');
  assert.equal(sample(4, true), null);
  assert.equal(sample(5, false), null);
  assert.equal(sample(6, true), null, 'cooldown');
  assert.equal(sample(8, false), null);
  assert.equal(sample(9, true).type, 'motion');
  detector.reset(); assert.equal(sample(10, true), null, 'reconnect baseline');
});
test('motion ignores stale, out-of-order, invalid, session change and data gaps', () => {
  const detector = createMotionDetector();
  detector.sample(row(0), start);
  assert.equal(detector.sample(row(1, true), start + 20000), null);
  assert.equal(detector.sample(row(0, true), start), null);
  assert.equal(detector.sample(row(1, true, { motion: 'true' }), start + 2000), null);
  assert.equal(detector.sample(row(1, true, { controlSession: 'new' }), start + 2000), null);
  detector.sample(row(2), start + 4000);
  assert.equal(detector.sample(row(10, true), start + 20000), null);
});
test('chart orders and bounds actual data, deduplicating socket and REST timestamps', () => {
  const rows = chartRows([row(3), row(1), row(2), row(3, false, { _id: 'live' })], 2);
  assert.equal(rows.length, 2); assert.equal(rows[0]._id, '2'); assert.equal(rows[1]._id, 'live');
  assert.deepEqual(fieldSummary([row(0, false, { humidity: 0 }), row(1, false, { humidity: null })], 'humidity'), { count: 1, average: 0, min: 0, max: 0 });
  assert.equal(fieldSummary([], 'temperature').average, null);
});
test('chart gaps and null samples are not interpolated, constant series has finite coordinates', () => {
  const rows = [row(0), row(1), row(2, false, { humidity: null }), row(3), row(20)];
  const graph = chartGeometry(rows, 'humidity', 250);
  assert.equal(graph.points.length, 4); assert.equal(graph.segments.length, 1);
  assert.ok(graph.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.equal(chartGeometry([], 'temperature', 250).points.length, 0);
});