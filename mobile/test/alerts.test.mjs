import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAlerts, settingsPayload, dismissAlertNotice, createNoticePreview } from '../src/utils/alertData.js';
test('notice preview is explicitly labelled and contains no fabricated sensor measurement or incident status', () => {
  const first = createNoticePreview(1), next = createNoticePreview(2);
  assert.equal(first.preview, true);
  assert.notEqual(first._id, next._id);
  assert.equal('value' in first, false);
  assert.equal('status' in first, false);
  assert.match(first.message, /không phải cảnh báo/);
  const real = { _id: 'real-alert' };
  assert.equal(dismissAlertNotice(real, first._id), real);
  assert.equal(dismissAlertNotice(next, first._id), next);
});
test('dropdown dismissal cannot clear a newer notice and supports existing button handlers', () => {
  const current = { _id: 'new-alert' };
  assert.equal(dismissAlertNotice(current, 'old-alert'), current);
  assert.equal(dismissAlertNotice(current, 'new-alert'), null);
  assert.equal(dismissAlertNotice(current), null);
  assert.equal(dismissAlertNotice(current, { nativeEvent: {} }), null);
  assert.equal(dismissAlertNotice(null, 'old-alert'), null);
});
test('REST reconnect and repeated realtime updates deduplicate alert IDs and reject stale revisions', () => {
  const active = { _id: 'a', status: 'ACTIVE', startedAt: '2026-11-13T12:00:00Z', updatedAt: '2026-11-13T12:00:00Z' };
  const resolved = { ...active, status: 'RESOLVED', updatedAt: '2026-11-13T12:02:00Z' };
  assert.equal(mergeAlerts([active], [active, active]).length, 1);
  assert.equal(mergeAlerts([resolved], [active])[0].status, 'RESOLVED');
});
test('settings form preserves Boolean fields, parses numbers, rejects empty or NaN', () => {
  const form = { sensorVerified: false, alertsEnabled: false, consecutiveReadings: '3', cooldownMinutes: '10' };
  for (const key of ['temperatureHigh', 'temperatureLow', 'humidityHigh', 'humidityLow']) form[key] = { enabled: false, trigger: '35', clear: '33' };
  assert.equal(settingsPayload(form).consecutiveReadings, 3);
  assert.equal(settingsPayload(form).sensorVerified, false);
  assert.throws(() => settingsPayload({ ...form, cooldownMinutes: '' }));
  assert.throws(() => settingsPayload({ ...form, temperatureHigh: { ...form.temperatureHigh, trigger: 'NaN' } }));
});