import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLedState, canControlLed } from '../src/utils/ledState.js';
const state = { mode: 'manual', ledGreen: false, ledRed: true,
  controlSession: '0123456789abcdef', receivedAt: '2026-11-13T16:00:00Z' };
test('LED control requires firmware-confirmed mode/session, not old telemetry', () => {
  assert.equal(normalizeLedState({ ...state, mode: undefined }), null);
  assert.equal(normalizeLedState({ ...state, controlSession: undefined }), null);
  assert.equal(normalizeLedState({ ...state, ledRed: 'true' }), null);
  assert.deepEqual(normalizeLedState(state), state);
});
test('controls disabled for stale device, socket disconnect, MQTT disconnect', () => {
  const context = { connection: 'connected', system: { mqtt: { connected: true, subscribed: true } }, state, now: Date.parse(state.receivedAt) + 2000 };
  assert.equal(canControlLed(context), true);
  assert.equal(canControlLed({ ...context, connection: 'reconnecting' }), false);
  assert.equal(canControlLed({ ...context, now: context.now + 10000 }), false);
  assert.equal(canControlLed({ ...context, state: null }), false);
  assert.equal(canControlLed({ ...context, system: { mqtt: { connected: false, subscribed: false } } }), false);
});