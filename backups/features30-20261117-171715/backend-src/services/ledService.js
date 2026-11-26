const { randomUUID } = require('node:crypto');
const net = require('node:net');
const COMMAND_TOPIC = 'smartstore/led/command';
const ACK_TOPIC = 'smartstore/led/ack';
function validateCommand(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !['auto', 'manual'].includes(value.mode) ||
      Object.keys(value).some(key => !['mode', 'ledGreen', 'ledRed'].includes(key))) throw new Error('Lệnh không hợp lệ.');
  for (const key of ['ledGreen', 'ledRed']) {
    if (key in value && typeof value[key] !== 'boolean') throw new Error('Trạng thái LED phải là Boolean.');
    if (value.mode === 'auto' && key in value) throw new Error('AUTO chỉ điều khiển LED theo PIR.');
  }
  return { ...value };
}
function trustedAddress(address = '') {
  const ip = address.replace(/^::ffff:/, '');
  if (ip === '::1') return true;
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  }
  return net.isIP(ip) === 6 && /^(fc|fd|fe[89ab])/i.test(ip);
}
function createLedService({ publish, ready, onState = () => {}, timeoutMs = 7000,
  now = Date.now, cooldownMs = 750 }) {
  let state = null;
  let pending = null;
  let lastCommandAt = -Infinity;
  const lastByClient = new Map();
  function finish(status, message, actual) {
    if (!pending) return;
    const current = pending; pending = null; clearTimeout(current.timer);
    current.resolve({ requestId: current.requestId, status, message,
      mode: actual?.mode ?? null, ledGreen: actual?.ledGreen ?? null, ledRed: actual?.ledRed ?? null });
  }
  function observe(reading) {
    if (!['auto', 'manual'].includes(reading.mode) || typeof reading.controlSession !== 'string') return;
    if (pending && state && state.controlSession !== reading.controlSession) finish('rejected', 'ESP32 đã đổi phiên kết nối.', null);
    state = { mode: reading.mode, ledGreen: reading.ledGreen, ledRed: reading.ledRed,
      receivedAt: reading.receivedAt, controlSession: reading.controlSession };
    try { onState({ ...state }); } catch { console.error('[LED] state observer failed'); }
  }
  function request(clientId, address, value, onAccepted = () => {}) {
    const requestId = randomUUID();
    // Socket.IO transport acknowledgement identifies the request, NOT GPIO success.
    onAccepted(requestId);
    const reject = message => Promise.resolve({ requestId, status: 'rejected', message,
      mode: state?.mode ?? null, ledGreen: state?.ledGreen ?? null, ledRed: state?.ledRed ?? null });
    if (!trustedAddress(address)) return reject('Chỉ cho phép mạng LAN phát triển tin cậy.');
    let command;
    try { command = validateCommand(value); } catch (error) { return reject(error.message); }
    if (!ready()) return reject('MQTT chưa sẵn sàng.');
    if (!state || now() - Date.parse(state.receivedAt) > 10000) return reject('Chưa có trạng thái ESP32 MODULE 08 mới; kiểm tra firmware/kết nối.');
    const time = now();
    if (time - (lastByClient.get(clientId) ?? -Infinity) < cooldownMs || time - lastCommandAt < cooldownMs) return reject('Gửi quá nhanh. Vui lòng chờ.');
    lastByClient.set(clientId, time); lastCommandAt = time;
    if (pending) return reject('Một lệnh khác đang chờ ESP32 xác nhận.');
    return new Promise(resolve => {
      pending = { requestId, resolve, command, session: state.controlSession,
        timer: setTimeout(() => finish('timeout', 'Không nhận được ACK từ ESP32; trạng thái chưa xác định.', null), timeoutMs) };
      try {
        publish(COMMAND_TOPIC, JSON.stringify({ ...command, requestId, controlSession: state.controlSession }), error => {
          if (error && pending?.requestId === requestId) finish('rejected', 'Không gửi được tới MQTT Broker.', null);
        });
      } catch { finish('rejected', 'Không gửi được tới MQTT Broker.', null); }
    });
  }
  function acknowledge(value, retained = false) {
    if (retained || !pending || !value || value.requestId !== pending.requestId ||
      value.controlSession !== pending.session || typeof value.success !== 'boolean' ||
      !['auto', 'manual'].includes(value.mode) ||
      typeof value.ledGreen !== 'boolean' || typeof value.ledRed !== 'boolean') return false;
    if (!value.success) { finish('rejected', 'ESP32 từ chối lệnh: ' + String(value.reason || 'không hợp lệ').slice(0, 120), value); return true; }
    const command = pending.command;
    if (value.mode !== command.mode || ['ledGreen', 'ledRed'].some(key => key in command && value[key] !== command[key])) {
      finish('rejected', 'ACK không khớp lệnh yêu cầu.', value); return false;
    }
    observe({ ...value, receivedAt: new Date(now()).toISOString() });
    finish('applied', 'ESP32 đã áp dụng lệnh.', value);
    return true;
  }
  return { request, observe, acknowledge, state: () => state && { ...state },
    forgetClient: id => lastByClient.delete(id),
    disconnected() { state = null; finish('rejected', 'Mất MQTT khi đang chờ ACK; trạng thái chưa xác định.', null); },
    close() { state = null; finish('rejected', 'Backend đang dừng.', null); lastByClient.clear(); } };
}
module.exports = { createLedService, validateCommand, trustedAddress, COMMAND_TOPIC, ACK_TOPIC };