export function mapSignals({ connection, system, stale, reading, controlReady, ledState }) {
  const live = Boolean(connection === 'connected' && system?.mqtt?.connected && system.mqtt.subscribed && reading && !stale);
  const led = controlReady && ledState && (!live || Date.parse(ledState.receivedAt) >= Date.parse(reading.receivedAt)) ? ledState : live ? reading : null;
  return { motion: live ? reading.motion : null, ledGreen: led?.ledGreen ?? null, ledRed: led?.ledRed ?? null };
}

export function describeCommand(payload) {
  for (const [key, name] of [['ledGreen', 'LED xanh'], ['ledRed', 'LED đỏ']]) {
    if (typeof payload[key] === 'boolean') return `${payload[key] ? 'bật' : 'tắt'} ${name}`;
  }
  return `chuyển sang ${payload.mode === 'auto' ? 'tự động' : 'thủ công'}`;
}