import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSignals, describeCommand } from '../src/utils/liveStore.js';
const state = { connection: 'connected', system: { mqtt: { connected: true, subscribed: true } }, reading: { receivedAt: '2026-01-01T12:00:00Z', motion: false, ledRed: true, ledGreen: false }, stale: false, controlReady: false };
test('disconnected and stale samples do not light up the map', () => {
  const unknown = { motion: null, ledGreen: null, ledRed: null };
  for (const change of [{ stale: true }, { connection: 'disconnected' }, { system: null }]) assert.deepEqual(mapSignals({ ...state, ...change }), unknown);
});
test('use latest observed LEDs independently of PIR', () => {
  const ledState = { receivedAt: '2026-01-01T12:00:01Z', ledRed: false, ledGreen: true };
  assert.deepEqual(mapSignals(state), { motion: false, ledRed: true, ledGreen: false });
  assert.deepEqual(mapSignals({ ...state, ledState, controlReady: true }), { motion: false, ledRed: false, ledGreen: true });
  assert.equal(mapSignals({ ...state, stale: true, ledState, controlReady: true }).motion, null);
});
test('log describes command target, including off', () => {
  assert.equal(describeCommand({ mode: 'manual', ledRed: false }), 'tắt LED đỏ');
  assert.equal(describeCommand({ mode: 'auto' }), 'chuyển sang tự động');
});