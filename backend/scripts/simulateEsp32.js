// Giả lập ESP32 để test khi không có mạch thật. Dùng đúng giao thức của firmware:
// telemetry mỗi 2 giây, nhận lệnh LED và trả ACK theo requestId/controlSession.
//   npm run dev:esp32            (đăng nhập user "esp32", mật khẩu MQTT_ESP32_PASSWORD trong .env gốc)
// Tùy chọn: SIM_MQTT_URL, SIM_INTERVAL_MS, SIM_HOT=1 (nhiệt độ cao để thử cảnh báo).
const path = require('node:path');
const crypto = require('node:crypto');
const mqtt = require('mqtt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DATA_TOPIC = 'smartstore/sensors/data';
const COMMAND_TOPIC = 'smartstore/led/command';
const ACK_TOPIC = 'smartstore/led/ack';
const interval = Number(process.env.SIM_INTERVAL_MS || 2000);
const url = process.env.SIM_MQTT_URL || 'mqtt://127.0.0.1:1883';
const password = process.env.MQTT_ESP32_PASSWORD;
if (!password) { console.error('Thiếu MQTT_ESP32_PASSWORD trong .env ở thư mục gốc.'); process.exit(1); }

const state = { manual: false, ledGreen: false, ledRed: true, motion: false, sampleId: 0, motionUntil: 0 };
let session = '';
const handled = new Set();

const client = mqtt.connect(url, { clientId: `smartstore-sim-${crypto.randomBytes(3).toString('hex')}`,
  username: 'esp32', password, reconnectPeriod: 3000, clean: true });

function sample() {
  const t = Date.now() / 60000;
  const base = process.env.SIM_HOT === '1' ? 37 : 28;
  // PIR: thỉnh thoảng có người đi qua trong ~6 giây.
  if (Date.now() > state.motionUntil && Math.random() < 0.06) state.motionUntil = Date.now() + 6000;
  state.motion = Date.now() < state.motionUntil;
  if (!state.manual) { state.ledGreen = state.motion; state.ledRed = !state.motion; }
  state.sampleId++;
  return {
    temperature: Math.round((base + 1.5 * Math.sin(t) + (Math.random() - 0.5) * 0.4) * 10) / 10,
    humidity: Math.round((62 + 6 * Math.cos(t / 2) + (Math.random() - 0.5)) * 10) / 10,
    motion: state.motion, ledGreen: state.ledGreen, ledRed: state.ledRed,
    mode: state.manual ? 'manual' : 'auto', controlSession: session,
    dhtSampleId: state.sampleId, sampleAgeMs: Math.floor(Math.random() * 500)
  };
}
const publish = () => client.connected && client.publish(DATA_TOPIC, JSON.stringify(sample()), { qos: 0, retain: false });

client.on('connect', () => {
  session = crypto.randomBytes(8).toString('hex'); // phiên mới mỗi lần kết nối, như firmware
  client.subscribe(COMMAND_TOPIC, { qos: 0 }, error => console.log(error ? '[SIM] subscribe lỗi' : `[SIM] đã kết nối ${url}, phiên ${session}`));
});
client.on('error', error => console.error('[SIM] lỗi MQTT:', error.message));
client.on('message', (_topic, buffer) => {
  let command;
  try { command = JSON.parse(buffer.toString('utf8')); } catch { return; }
  const ack = (success, reason) => {
    const body = { requestId: command.requestId, controlSession: command.controlSession, success,
      mode: state.manual ? 'manual' : 'auto', ledGreen: state.ledGreen, ledRed: state.ledRed, ...(reason ? { reason } : {}) };
    client.publish(ACK_TOPIC, JSON.stringify(body));
    console.log(`[SIM] ACK ${success ? 'OK' : 'từ chối (' + reason + ')'} ${command.requestId}`);
  };
  if (typeof command.requestId !== 'string' || command.controlSession !== session) return ack(false, 'session_mismatch');
  if (handled.has(command.requestId)) return ack(false, 'duplicate_request');
  handled.add(command.requestId);
  if (command.mode === 'auto') state.manual = false;
  else if (command.mode === 'manual') {
    state.manual = true;
    if (typeof command.ledGreen === 'boolean') state.ledGreen = command.ledGreen;
    if (typeof command.ledRed === 'boolean') state.ledRed = command.ledRed;
  } else return ack(false, 'invalid_mode');
  ack(true);
  publish();
});

setInterval(publish, interval);
process.on('SIGINT', () => client.end(true, {}, () => process.exit(0)));
console.log(`[SIM] gửi telemetry mỗi ${interval} ms. Ctrl+C để dừng.`);
