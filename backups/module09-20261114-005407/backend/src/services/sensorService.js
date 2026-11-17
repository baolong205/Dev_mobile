const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');

function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
function validatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'INVALID_PAYLOAD', 'Payload must be an object');
  for (const field of ['temperature', 'humidity']) {
    if (value[field] !== null && !(typeof value[field] === 'number' && Number.isFinite(value[field]))) {
      throw httpError(400, 'INVALID_PAYLOAD', `${field} must be finite number or null`);
    }
  }
  for (const field of ['motion', 'ledGreen', 'ledRed']) {
    if (typeof value[field] !== 'boolean') throw httpError(400, 'INVALID_PAYLOAD', `${field} must be boolean`);
  }
  // Whitelist: ignore client timestamps/extra keys, never coerce readings.
  const reading = Object.fromEntries(['temperature', 'humidity', 'motion', 'ledGreen', 'ledRed'].map(key => [key, value[key]]));
  if (value.mode !== undefined) {
    if (!['auto', 'manual'].includes(value.mode)) throw httpError(400, 'INVALID_PAYLOAD', 'Invalid mode');
    reading.mode = value.mode;
  }
  if (value.controlSession !== undefined) {
    if (typeof value.controlSession !== 'string' || !/^[a-f0-9]{16}$/.test(value.controlSession)) throw httpError(400, 'INVALID_PAYLOAD', 'Invalid controlSession');
    reading.controlSession = value.controlSession;
  }
  return reading;
}
function requireDatabase() {
  if (mongoose.connection.readyState !== 1) throw httpError(503, 'DATABASE_UNAVAILABLE', 'MongoDB is not ready');
}
function parsePagination(query) {
  function positiveInteger(value, fallback, name) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw httpError(400, 'INVALID_PAGINATION', `${name} must be a positive integer`);
    }
    return Number(value);
  }
  const page = positiveInteger(query.page, 1, 'page');
  const limit = Math.min(positiveInteger(query.limit, 20, 'limit'), 100);
  if (!Number.isSafeInteger((page - 1) * limit)) throw httpError(400, 'INVALID_PAGINATION', 'page is too large');
  return { page, limit };
}
async function saveReading(payload, receivedAt = new Date()) {
  const reading = validatePayload(payload);
  requireDatabase();
  return SensorReading.create({ ...reading, receivedAt });
}
async function getLatest() {
  requireDatabase();
  return SensorReading.findOne().sort({ receivedAt: -1, _id: -1 }).maxTimeMS(5000).lean();
}
async function getHistory({ page, limit }) {
  requireDatabase();
  const [total, data] = await Promise.all([
    SensorReading.countDocuments().maxTimeMS(5000),
    SensorReading.find().sort({ receivedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).maxTimeMS(5000).lean()
  ]);
  return { total, page, limit, totalPages: Math.ceil(total / limit), data };
}
async function getStats() {
  requireDatabase();
  const [result] = await SensorReading.aggregate([
    { $group: {
      _id: null, total: { $sum: 1 },
      temperatureCount: { $sum: { $cond: [{ $isNumber: '$temperature' }, 1, 0] } },
      humidityCount: { $sum: { $cond: [{ $isNumber: '$humidity' }, 1, 0] } },
      temperatureAvg: { $avg: '$temperature' }, temperatureMin: { $min: '$temperature' }, temperatureMax: { $max: '$temperature' },
      humidityAvg: { $avg: '$humidity' }, humidityMin: { $min: '$humidity' }, humidityMax: { $max: '$humidity' }
    } }
  ]).option({ maxTimeMS: 5000 });
  const r = result || {};
  return {
    total: r.total || 0,
    temperature: { count: r.temperatureCount || 0, average: r.temperatureAvg ?? null, min: r.temperatureMin ?? null, max: r.temperatureMax ?? null },
    humidity: { count: r.humidityCount || 0, average: r.humidityAvg ?? null, min: r.humidityMin ?? null, max: r.humidityMax ?? null },
    note: 'Raw received readings; null excluded. Sensor accuracy/calibration is not verified.'
  };
}
module.exports = { httpError, validatePayload, parsePagination, saveReading, getLatest, getHistory, getStats };