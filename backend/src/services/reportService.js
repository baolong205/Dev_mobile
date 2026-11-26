const mongoose = require('mongoose');
const Reading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const { DEVICE_ID } = require('./alertSettingsService');
const { dateFilter } = require('./timeRangeService');
function databaseRequired() {
  if (mongoose.connection.readyState !== 1) throw Object.assign(new Error('MongoDB chưa sẵn sàng.'), { status: 503, code: 'DATABASE_UNAVAILABLE' });
}
// Look back 10 seconds before the requested boundary to identify a true rising edge.
// Unknown initial true, reconnect/session changes and gaps are NOT counted as events.
function motionPipeline(range) {
  return [
    { $match: { receivedAt: { $gte: new Date(+range.from - 10000), $lte: range.to } } },
    { $setWindowFields: { sortBy: { receivedAt: 1, _id: 1 }, output: {
      previous: { $shift: { output: { motion: '$motion', session: { $ifNull: ['$controlSession', null] }, time: '$receivedAt' }, by: -1, default: null } },
    } } },
    { $match: dateFilter(range) },
    { $set: { motionEvent: { $and: [
      { $eq: ['$motion', true] }, { $eq: ['$previous.motion', false] },
      { $ne: [{ $ifNull: ['$controlSession', null] }, null] },
      { $eq: [{ $ifNull: ['$controlSession', null] }, '$previous.session'] },
      { $lte: [{ $subtract: ['$receivedAt', '$previous.time'] }, 10000] },
    ] } } },
  ];
}
const groupMetrics = {
  total: { $sum: 1 }, temperatureCount: { $sum: { $cond: [{ $isNumber: '$temperature' }, 1, 0] } },
  humidityCount: { $sum: { $cond: [{ $isNumber: '$humidity' }, 1, 0] } },
  temperatureAvg: { $avg: '$temperature' }, temperatureMin: { $min: '$temperature' }, temperatureMax: { $max: '$temperature' },
  humidityAvg: { $avg: '$humidity' }, humidityMin: { $min: '$humidity' }, humidityMax: { $max: '$humidity' },
  motionEvents: { $sum: { $cond: ['$motionEvent', 1, 0] } }, motionSamples: { $sum: { $cond: ['$motion', 1, 0] } },
};
function metrics(row = {}) {
  return { total: row.total || 0, motionEvents: row.motionEvents || 0, motionSamples: row.motionSamples || 0,
    temperature: { count: row.temperatureCount || 0, average: row.temperatureAvg ?? null, min: row.temperatureMin ?? null, max: row.temperatureMax ?? null },
    humidity: { count: row.humidityCount || 0, average: row.humidityAvg ?? null, min: row.humidityMin ?? null, max: row.humidityMax ?? null } };
}
async function getReport(range) {
  databaseRequired();
  const bucketMs = range.to - range.from <= 86400000 ? 900000 : range.to - range.from <= 7 * 86400000 ? 3600000 : 21600000;
  const [readings, alerts] = await Promise.all([
    Reading.aggregate([...motionPipeline(range), { $facet: {
      totals: [{ $group: { _id: null, ...groupMetrics } }],
      series: [{ $group: { _id: { $subtract: [{ $toLong: '$receivedAt' }, { $mod: [{ $toLong: '$receivedAt' }, bucketMs] }] }, ...groupMetrics } }, { $sort: { _id: 1 } }],
    } }]).option({ maxTimeMS: 15000, allowDiskUse: true }),
    Alert.aggregate([{ $match: { deviceId: DEVICE_ID, deletedAt: null, ...dateFilter(range, 'startedAt') } },
      { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } }]).option({ maxTimeMS: 10000 }),
  ]);
  const counts = { total: 0, active: 0, resolved: 0, byType: {} };
  for (const row of alerts) { counts.total += row.count; counts[row._id.status === 'ACTIVE' ? 'active' : 'resolved'] += row.count; counts.byType[row._id.type] = (counts.byType[row._id.type] || 0) + row.count; }
  return { from: range.from.toISOString(), to: range.to.toISOString(), bucketMs, ...metrics(readings[0]?.totals[0]), alerts: counts,
    series: (readings[0]?.series || []).map(row => ({ _id: String(row._id), receivedAt: new Date(Math.max(row._id, +range.from)).toISOString(),
      temperature: row.temperatureAvg ?? null, humidity: row.humidityAvg ?? null, count: row.total })),
    note: 'Mẫu gốc, null không tính trung bình. Lượt PIR là cạnh false→true có định danh phiên giống nhau và cách nhau ≤10 giây; không đếm true ban đầu hoặc mẫu cũ thiếu phiên. Không chứng minh độ chính xác cảm biến. Cảnh báo tính theo thời điểm bắt đầu, bỏ bản ghi đã xóa.' };
}
async function getMotionHistory(range, { page, limit }) {
  databaseRequired();
  const [result] = await Reading.aggregate([...motionPipeline(range), { $match: { motionEvent: true } }, { $facet: {
    count: [{ $count: 'total' }], data: [{ $sort: { receivedAt: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { previous: 0, motionEvent: 0 } }],
  } }]).option({ maxTimeMS: 15000, allowDiskUse: true });
  const total = result?.count[0]?.total || 0;
  return { data: result?.data || [], total, page, limit, totalPages: Math.ceil(total / limit) };
}
module.exports = { getReport, getMotionHistory, motionPipeline, metrics };