const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { requireDatabase, httpError } = require('./sensorService');
const Mode = mongoose.model('StoreMode', new mongoose.Schema({ _id: String, mode: String, shift: String, changedAt: Date }));
const schema = new mongoose.Schema({ shift: String, firstAt: Date, lastAt: Date, count: Number, reviewedAt: { type: Date, default: null }, note: { type: String, default: '' } });
schema.index({ shift: 1, lastAt: -1 });
const Incident = mongoose.model('StoreMotionIncident', schema);
const GROUP_MS = 60000;
const repository = {
  async mode() { requireDatabase(); return await Mode.findById('store').lean() || { mode: 'open', shift: null }; },
  async set(mode) { return Mode.findByIdAndUpdate('store', { mode, shift: randomUUID(), changedAt: new Date() }, { upsert: true, new: true }).lean(); },
  async record(shift, at) {
    const row = await Incident.findOneAndUpdate({ shift, reviewedAt: null, lastAt: { $gte: new Date(+at - GROUP_MS), $lte: at } }, { $inc: { count: 1 }, $set: { lastAt: at } }, { sort: { lastAt: -1 }, new: true });
    if (row) return false;
    await Incident.create({ shift, firstAt: at, lastAt: at, count: 1 });
    return true; // sự kiện mới (không gộp vào sự kiện trong 60 giây trước)
  },
  async list() {
    const pending = await Incident.find({ reviewedAt: null }).sort({ lastAt: -1 }).limit(20).lean();
    if (pending.length === 20) return pending;
    return pending.concat(await Incident.find({ reviewedAt: { $ne: null } }).sort({ reviewedAt: -1 }).limit(20 - pending.length).lean());
  },
  async review(id, note) {
    requireDatabase();
    const row = await Incident.findOneAndUpdate({ _id: id, reviewedAt: null }, { reviewedAt: new Date(), note }, { new: true });
    if (!row) throw httpError(409, 'NOT_PENDING', 'Sự kiện không tồn tại hoặc đã được kiểm tra.');
  }
};

function createStoreWatch(repo = repository, notify = () => {}, onIncident = () => {}) {
  // One backend/MQTT consumer. Serialize mode changes, rising edges and reviews in arrival order.
  let tail = Promise.resolve(), previous = null;
  const run = fn => { const next = tail.then(fn); tail = next.catch(() => {}); return next; };
  return {
    reset() { previous = null; },
    ingest(row, metadata = {}) {
      if (metadata.retained) return;
      const at = Date.parse(row.receivedAt);
      const rising = previous && previous.motion === false && row.motion === true && previous.session === row.controlSession && at > previous.at && at - previous.at <= 10000;
      previous = { motion: row.motion, at, session: row.controlSession };
      if (!rising) return;
      return run(async () => { const mode = await repo.mode(); if (mode.mode === 'closed') {
        const created = await repo.record(mode.shift, new Date(at)); notify();
        if (created) { try { onIncident({ at: new Date(at).toISOString() }); } catch { /* kênh phụ */ } }
      } });
    },
    snapshot: () => run(async () => ({ mode: (await repo.mode()).mode, incidents: await repo.list() })),
    change(mode) {
      if (!['open', 'closed'].includes(mode)) throw httpError(400, 'INVALID_MODE', 'Chế độ cửa hàng không hợp lệ.');
      return run(async () => { if ((await repo.mode()).mode !== mode) { await repo.set(mode); notify(); } });
    },
    review(id, note = '') {
      if (!/^[a-f\d]{24}$/i.test(id) || typeof note !== 'string' || note.length > 300) throw httpError(400, 'INVALID_REVIEW', 'Mã sự kiện hoặc ghi chú không hợp lệ (tối đa 300 ký tự).');
      return run(async () => { await repo.review(id, note.trim()); notify(); });
    }
  };
}
module.exports = { createStoreWatch, GROUP_MS };