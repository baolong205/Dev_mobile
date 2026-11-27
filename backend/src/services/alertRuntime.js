const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const AlertSettings = require('../models/AlertSettings');
const { defaults, validateSettings, DEVICE_ID, TYPES } = require('./alertSettingsService');
const { createAlertEngine } = require('./alertService');
const { httpError, parsePagination } = require('./sensorService');
function createAlertRuntime({ emit = () => {} } = {}) {
  let settings = defaults(), initialized = false, busy = false, closed = false, lastWarning = -Infinity;
  let latestQuality = null, epoch = 0;
  const safeEmit = (event, data) => { try { emit(event, data); } catch { warn(); } };
  function warn() { if (Date.now() - lastWarning >= 30000) { console.error('[ALERT] persistence/evaluation unavailable; no successful save claimed'); lastWarning = Date.now(); } }
  const engine = createAlertEngine({ emit: (event, data) => {
    if (event === 'sensor:quality') latestQuality = data;
    safeEmit(event, data);
  }, repository: {
    async create(data) {
      try { return { alert: (await Alert.create(data)).toObject(), created: true }; }
      catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await Alert.findOne({ deviceId: DEVICE_ID, type: data.type, status: 'ACTIVE' }).lean();
        if (!existing) throw error;
        return { alert: existing, created: false };
      }
    },
    resolve: (id, timestamp, reason) => Alert.findOneAndUpdate({ _id: id, status: 'ACTIVE' },
      { $set: { status: 'RESOLVED', resolvedAt: timestamp, resolutionReason: reason } }, { new: true }).lean()
  } });
  function databaseRequired() { if (mongoose.connection.readyState !== 1) throw httpError(503, 'DATABASE_UNAVAILABLE', 'MongoDB chưa sẵn sàng.'); }
  function readyRequired() { databaseRequired(); if (!initialized) throw httpError(503, 'ALERTS_INITIALIZING', 'Đang tải cấu hình và trạng thái cảnh báo.'); }
  async function restore() {
    const version = epoch;
    databaseRequired();
    await Promise.all([Alert.createIndexes(), AlertSettings.createIndexes()]);
    const stored = await AlertSettings.findOne({ deviceId: DEVICE_ID }).lean();
    if (stored) {
      const fields = Object.fromEntries(Object.keys(defaults()).filter(key => key !== 'deviceId' && stored[key] !== undefined).map(key => [key, stored[key]]));
      settings = validateSettings(fields, { ...defaults(), sensorVerified: stored.sensorVerified === true });
    } else settings = defaults(); // No seed writes to production DB merely on startup.
    const active = await Alert.find({ deviceId: DEVICE_ID, status: 'ACTIVE' }).lean();
    const notifications = await Promise.all(TYPES.map(type => Alert.findOne({ deviceId: DEVICE_ID, type, lastNotifiedAt: { $ne: null } }).sort({ lastNotifiedAt: -1 }).lean()));
    if (closed || epoch !== version || mongoose.connection.readyState !== 1) return;
    await engine.initialize(settings, active, notifications.filter(Boolean)); initialized = true;
  }
  async function maintain() {
    if (closed || busy || initialized || mongoose.connection.readyState !== 1) return;
    busy = true;
    try { await restore(); } catch { initialized = false; warn(); }
    finally { busy = false; }
  }
  const disconnected = () => { epoch++; initialized = false; engine.unavailable(); };
  mongoose.connection.on('disconnected', disconnected);
  const timer = setInterval(() => { void maintain(); }, 3000); timer.unref();
  void maintain();
  function ingest(reading, metadata) {
    if (closed || busy || !initialized) { engine.resetCounters(); return; }
    busy = true;
    // Detached from MQTT/LED processing. No unbounded backlog or replay after DB outage.
    void engine.process(reading, metadata).catch(() => { initialized = false; engine.unavailable(); warn(); }).finally(() => { busy = false; });
  }
  async function updateSettings(input) {
    readyRequired();
    if (busy) throw httpError(409, 'ALERT_BUSY', 'Đang xử lý cảnh báo; vui lòng thử lại.');
    busy = true;
    try {
      const next = validateSettings(input, settings);
      const record = await AlertSettings.findOneAndUpdate({ deviceId: DEVICE_ID }, { $set: next }, { upsert: true, new: true, runValidators: true }).lean();
      settings = next; engine.configure(next);
      const result = { ...next, updatedAt: record.updatedAt };
      safeEmit('alert:settings:updated', { ...result, id: String(record._id), timestamp: new Date().toISOString() });
      return result;
    } finally { busy = false; }
  }
  function filters(query) {
    const filter = { deviceId: DEVICE_ID, deletedAt: null };
    if (query.type !== undefined) { if (!TYPES.includes(query.type)) throw httpError(400, 'INVALID_FILTER', 'Loại cảnh báo không hợp lệ.'); filter.type = query.type; }
    if (query.status !== undefined) { if (!['ACTIVE', 'RESOLVED'].includes(query.status)) throw httpError(400, 'INVALID_FILTER', 'Trạng thái không hợp lệ.'); filter.status = query.status; }
    for (const key of ['from', 'to']) {
      if (query[key] !== undefined) {
        if (typeof query[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(query[key]) || !Number.isFinite(Date.parse(query[key]))) throw httpError(400, 'INVALID_FILTER', 'Thời gian phải là ISO date.');
        filter.startedAt ??= {}; filter.startedAt[key === 'from' ? '$gte' : '$lte'] = new Date(query[key]);
      }
    }
    if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to)) throw httpError(400, 'INVALID_FILTER', 'from phải trước to.');
    return filter;
  }
  return { ingest, engine,
    getSettings() { readyRequired(); return { ...settings }; },
    quality: () => latestQuality,
    notificationsEnabled: () => settings.notificationsEnabled !== false,
    updateSettings,
    async list(query = {}) {
      databaseRequired(); const filter = filters(query), { page, limit } = parsePagination(query);
      const [data, total] = await Promise.all([Alert.find(filter).sort({ startedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).maxTimeMS(5000).lean(), Alert.countDocuments(filter).maxTimeMS(5000)]);
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async active() { databaseRequired(); return Alert.find({ deviceId: DEVICE_ID, status: 'ACTIVE' }).sort({ startedAt: -1 }).maxTimeMS(5000).lean(); },
    async stats(query = {}) {
      databaseRequired(); const rows = await Alert.aggregate([{ $match: filters(query) }, { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } }]).option({ maxTimeMS: 5000 });
      const result = { total: 0, active: 0, resolved: 0, temperature: 0, humidity: 0, sensorQuality: 0 };
      for (const row of rows) { result.total += row.count; result[row._id.status === 'ACTIVE' ? 'active' : 'resolved'] += row.count;
        result[row._id.type.startsWith('temperature') ? 'temperature' : row._id.type.startsWith('humidity') ? 'humidity' : 'sensorQuality'] += row.count; }
      return result;
    },
    async remove(id) {
      databaseRequired();
      if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) throw httpError(400, 'INVALID_ID', 'ID cảnh báo không hợp lệ.');
      // Keep notification timestamps for cooldown recovery after a restart.
      // Atomic status condition prevents deletion of an active incident.
      const changed = await Alert.findOneAndUpdate({ _id: id, deviceId: DEVICE_ID, status: 'RESOLVED', deletedAt: null },
        { $set: { deletedAt: new Date() } }, { new: true }).lean();
      if (!changed) {
        const existing = await Alert.findOne({ _id: id, deviceId: DEVICE_ID }).lean();
        if (!existing) throw httpError(404, 'ALERT_NOT_FOUND', 'Không tìm thấy cảnh báo.');
        if (existing.status === 'ACTIVE') throw httpError(409, 'ALERT_ACTIVE', 'Không thể xóa cảnh báo đang hoạt động. Hãy xác nhận đã xem và xử lý nguyên nhân.');
      }
      const result = { _id: id };
      if (changed) safeEmit('alert:deleted', result);
      return result;
    },
    async acknowledge(id) {
      databaseRequired(); if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) throw httpError(400, 'INVALID_ID', 'ID cảnh báo không hợp lệ.');
      const changed = await Alert.findOneAndUpdate({ _id: id, deviceId: DEVICE_ID, deletedAt: null, acknowledgedAt: null }, { $set: { acknowledgedAt: new Date() } }, { new: true }).lean();
      const record = changed || await Alert.findOne({ _id: id, deviceId: DEVICE_ID, deletedAt: null }).lean();
      if (!record) throw httpError(404, 'ALERT_NOT_FOUND', 'Không tìm thấy cảnh báo.');
      if (changed) safeEmit('alert:updated', changed);
      return record;
    },
    close() { closed = true; clearInterval(timer); mongoose.connection.off('disconnected', disconnected); engine.unavailable(); }
  };
}
module.exports = { createAlertRuntime };