// Môi trường dev KHÔNG cần Docker: MQTT broker (aedes) + MongoDB (mongodb-memory-server).
//   npm run dev:stack
// - Tài khoản MQTT: biến MQTT_<USER>_PASSWORD trong .env ở thư mục gốc (giống Docker).
// - Quyền topic: đọc trực tiếp từ mosquitto/config/acl để chỉ có một nguồn cấu hình.
// - Dữ liệu MongoDB lưu ở .dev-data/mongo (đã gitignore), không mất khi tắt.
// Chỉ dùng để phát triển/kiểm thử trong LAN, không dùng cho production.
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MQTT_PORT = Number(process.env.DEV_MQTT_PORT || 1883);
const MONGO_PORT = Number(process.env.DEV_MONGO_PORT || 27017);
const MONGO_VERSION = process.env.DEV_MONGO_VERSION || '7.0.14';

/** Parse cú pháp ACL của Mosquitto: user / topic / pattern (%u = username). */
function loadAcl(file) {
  const rules = new Map(); // username -> [{ access, topic }]
  const patterns = [];
  let user = null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [keyword, ...rest] = line.split(/\s+/);
    if (keyword === 'user') { user = rest.join(' '); rules.set(user, rules.get(user) || []); continue; }
    if (keyword !== 'topic' && keyword !== 'pattern') continue;
    const access = ['read', 'write', 'readwrite'].includes(rest[0]) ? rest.shift() : 'readwrite';
    const rule = { access, topic: rest.join(' ') };
    if (keyword === 'pattern') patterns.push(rule);
    else if (user) rules.get(user).push(rule);
  }
  return { rules, patterns };
}
function topicMatches(filter, topic) {
  const f = filter.split('/'), t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length || (f[i] !== '+' && f[i] !== t[i])) return false;
  }
  return f.length === t.length;
}
function allowed(acl, username, topic, wanted) {
  const list = [...(acl.rules.get(username) || []),
    ...acl.patterns.map(rule => ({ ...rule, topic: rule.topic.replaceAll('%u', username) }))];
  return list.some(rule => (rule.access === 'readwrite' || rule.access === wanted) && topicMatches(rule.topic, topic));
}
function passwords() {
  const result = new Map();
  for (const [key, value] of Object.entries(process.env)) {
    const match = /^MQTT_([A-Z0-9_]+)_PASSWORD$/.exec(key);
    if (match && value) result.set(match[1].toLowerCase().replaceAll('_', '-'), value);
  }
  return result;
}
const sameSecret = (a, b) => {
  const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
};

async function startBroker() {
  const Aedes = require('aedes');
  const acl = loadAcl(path.join(ROOT, 'mosquitto/config/acl'));
  const users = passwords();
  if (!users.size) throw new Error('Chưa có MQTT_<USER>_PASSWORD nào trong .env ở thư mục gốc.');
  const broker = new Aedes({
    authenticate(client, username, password, done) {
      const expected = users.get(String(username || ''));
      const ok = Boolean(expected && password && sameSecret(password.toString(), expected));
      if (!ok) console.warn(`[MQTT] từ chối đăng nhập "${username || '(ẩn danh)'}"`);
      if (ok) client.user = String(username);
      done(ok ? null : Object.assign(new Error('Bad username or password'), { returnCode: 4 }), ok);
    },
    authorizePublish(client, packet, done) {
      if (!client) return done(null); // gói nội bộ của broker
      done(allowed(acl, client.user, packet.topic, 'write') ? null : new Error(`ACL: ${client.user} không được ghi ${packet.topic}`));
    },
    authorizeSubscribe(client, subscription, done) {
      // Cho phép subscribe filter nếu khớp đúng một quy tắc đọc (giống Mosquitto với filter cụ thể).
      const ok = allowed(acl, client.user, subscription.topic, 'read');
      if (!ok) console.warn(`[MQTT] ACL: ${client.user} không được đọc ${subscription.topic}`);
      done(null, ok ? subscription : null);
    }
  });
  broker.on('client', client => console.log(`[MQTT] + ${client.user || '?'} (${client.id})`));
  broker.on('clientDisconnect', client => console.log(`[MQTT] - ${client.user || '?'} (${client.id})`));
  const server = net.createServer(broker.handle);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(MQTT_PORT, '0.0.0.0', resolve); });
  console.log(`[MQTT] broker aedes nghe 0.0.0.0:${MQTT_PORT}; tài khoản: ${[...users.keys()].join(', ')}`);
  return { close: () => new Promise(resolve => broker.close(() => server.close(() => resolve()))) };
}

async function startMongo() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.join(ROOT, '.dev-data', 'mongo');
  fs.mkdirSync(dbPath, { recursive: true });
  console.log(`[MongoDB] khởi động ${MONGO_VERSION} (lần đầu tải binary ~600MB, lưu ở ~/.cache/mongodb-binaries)…`);
  const mongo = await MongoMemoryServer.create({
    binary: { version: MONGO_VERSION },
    instance: { port: MONGO_PORT, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' }
  });
  console.log(`[MongoDB] sẵn sàng: mongodb://127.0.0.1:${MONGO_PORT}/smartstore (dữ liệu: ${dbPath})`);
  return { close: () => mongo.stop({ doCleanup: false }) };
}

async function main() {
  const stack = [];
  const stop = async () => {
    console.log('\nĐang dừng…');
    for (const part of stack.reverse()) await part.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  stack.push(await startMongo());
  stack.push(await startBroker());
  console.log('Dev stack sẵn sàng. Ctrl+C để dừng.');
}
if (require.main === module) {
  main().catch(error => { console.error('[DEV] không khởi động được:', error.message); process.exit(1); });
}
module.exports = { loadAcl, allowed, topicMatches };
