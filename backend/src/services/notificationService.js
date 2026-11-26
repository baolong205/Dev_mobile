const { Expo } = require('expo-server-sdk');
const { httpError } = require('./sensorService');

const CATEGORIES = ['alerts', 'motion', 'device'];
const PLATFORMS = ['ios', 'android', 'web', 'unknown'];

/**
 * Gửi push qua Expo Push Service.
 * tokens: { upsert, remove, removeMany, forUser, forCategory, markSuccess } — mặc định Mongo; test truyền repository giả.
 * sender: { send(messages) => tickets[] } — mặc định expo-server-sdk (tự chia lô 100 tin).
 */
function createNotifier({ tokens = mongoTokens(), sender = expoSender(), log = console } = {}) {
  let lastWarning = -Infinity;
  const warn = text => { if (Date.now() - lastWarning > 30000) { log.warn(text); lastWarning = Date.now(); } };

  async function deliver(rows, { title, body, data = {}, category }) {
    if (!rows.length) return { sent: 0, removed: 0 };
    const messages = rows.map(row => ({ to: row.token, title, body, data: { ...data, category }, sound: 'default',
      priority: category === 'alerts' || category === 'device' ? 'high' : 'default',
      channelId: category === 'alerts' ? 'alerts' : category === 'device' ? 'device' : 'activity' }));
    const tickets = await sender.send(messages);
    const invalid = [], ok = [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status === 'ok') ok.push(rows[index].token);
      else if (ticket?.details?.error === 'DeviceNotRegistered') invalid.push(rows[index].token);
    });
    if (invalid.length) await tokens.removeMany(invalid);
    if (ok.length) await tokens.markSuccess(ok);
    return { sent: ok.length, removed: invalid.length };
  }

  /** Không bao giờ ném lỗi ra ngoài: push là kênh phụ, không được làm hỏng MQTT/cảnh báo. */
  async function notify(category, message) {
    if (!CATEGORIES.includes(category)) return { sent: 0, removed: 0 };
    try { return await deliver(await tokens.forCategory(category), { ...message, category }); }
    catch { warn('[PUSH] gửi thông báo thất bại (Expo Push/MongoDB không sẵn sàng)'); return { sent: 0, removed: 0 }; }
  }

  return {
    notify,
    async register(userId, input = {}) {
      const { token, platform = 'unknown', categories = {} } = input;
      if (typeof token !== 'string' || !Expo.isExpoPushToken(token)) throw httpError(400, 'INVALID_PUSH_TOKEN', 'Push token không hợp lệ.');
      if (!PLATFORMS.includes(platform)) throw httpError(400, 'INVALID_PLATFORM', 'Nền tảng không hợp lệ.');
      if (typeof categories !== 'object' || Array.isArray(categories) ||
        Object.entries(categories).some(([key, value]) => !CATEGORIES.includes(key) || typeof value !== 'boolean')) {
        throw httpError(400, 'INVALID_CATEGORIES', 'Loại thông báo không hợp lệ.');
      }
      return tokens.upsert({ token, userId, platform, categories });
    },
    async unregister(userId, token) {
      if (typeof token !== 'string') throw httpError(400, 'INVALID_PUSH_TOKEN', 'Push token không hợp lệ.');
      await tokens.remove(token, userId);
      return { removed: true };
    },
    async test(userId) {
      const rows = await tokens.forUser(userId);
      if (!rows.length) throw httpError(404, 'NO_PUSH_TOKEN', 'Thiết bị này chưa đăng ký nhận thông báo.');
      return deliver(rows, { title: 'SmartStore', body: 'Thông báo thử: điện thoại đã nhận được thông báo.', data: { screen: 'Settings' }, category: 'device' });
    }
  };
}

/** Theo dõi ESP32: báo khi không nhận telemetry quá timeoutMs, và khi có lại. */
function createDeviceWatchdog({ timeoutMs = 60000, onOffline = () => {}, onOnline = () => {}, now = Date.now, intervalMs = 5000 } = {}) {
  let lastSeen = null, offline = false;
  const timer = setInterval(check, intervalMs); timer.unref?.();
  function check() {
    if (lastSeen === null || offline || now() - lastSeen <= timeoutMs) return;
    offline = true; onOffline({ lastSeen: new Date(lastSeen).toISOString() });
  }
  return {
    seen(at = now()) {
      const wasOffline = offline;
      lastSeen = at; offline = false;
      if (wasOffline) onOnline({ at: new Date(at).toISOString() });
    },
    check,
    close() { clearInterval(timer); }
  };
}

function expoSender() {
  const expo = new Expo();
  return {
    async send(messages) {
      const tickets = [];
      for (const chunk of expo.chunkPushNotifications(messages)) tickets.push(...await expo.sendPushNotificationsAsync(chunk));
      return tickets;
    }
  };
}
function mongoTokens() {
  const Model = () => require('../models/PushToken');
  const { requireDatabase } = require('./sensorService');
  return {
    async upsert({ token, userId, platform, categories }) {
      requireDatabase();
      const set = { userId, platform, ...Object.fromEntries(Object.entries(categories).map(([key, value]) => [`categories.${key}`, value])) };
      const row = await Model().findOneAndUpdate({ token }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
      return { token: row.token, platform: row.platform, categories: row.categories };
    },
    remove: (token, userId) => { requireDatabase(); return Model().deleteOne({ token, userId }); },
    removeMany: list => Model().deleteMany({ token: { $in: list } }),
    forUser: userId => { requireDatabase(); return Model().find({ userId }).lean(); },
    forCategory: category => { requireDatabase(); return Model().find({ [`categories.${category}`]: { $ne: false } }).lean(); },
    markSuccess: list => Model().updateMany({ token: { $in: list } }, { $set: { lastSuccessAt: new Date() } })
  };
}

module.exports = { createNotifier, createDeviceWatchdog, CATEGORIES };
