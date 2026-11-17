export function normalizeLedState(value) {
  if (!value || !['auto', 'manual'].includes(value.mode) ||
    typeof value.ledGreen !== 'boolean' || typeof value.ledRed !== 'boolean' ||
    typeof value.controlSession !== 'string' || !/^[a-f0-9]{16}$/.test(value.controlSession) ||
    !Number.isFinite(Date.parse(value.receivedAt))) return null;
  return { mode: value.mode, ledGreen: value.ledGreen, ledRed: value.ledRed,
    receivedAt: value.receivedAt, controlSession: value.controlSession };
}
export function canControlLed({ connection, system, state, now }) {
  return connection === 'connected' && system?.mqtt?.connected === true &&
    system?.mqtt?.subscribed === true && !!state && now - Date.parse(state.receivedAt) <= 10000;
}