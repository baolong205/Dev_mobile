const mongoose = require('mongoose');
const { TYPES } = require('../services/alertSettingsService');
const schema = new mongoose.Schema({ deviceId: { type: String, required: true },
  type: { type: String, enum: TYPES, required: true }, severity: { type: String, enum: ['warning', 'critical'], default: 'warning' },
  message: { type: String, required: true }, value: { type: Number, default: null }, threshold: { type: Number, default: null },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], required: true },
  startedAt: { type: Date, required: true }, resolvedAt: { type: Date, default: null },
  acknowledgedAt: { type: Date, default: null }, resolutionReason: String,
  notificationCount: { type: Number, default: 0 }, lastNotifiedAt: { type: Date, default: null },
  notificationSuppressed: { type: Boolean, default: false }
}, { timestamps: true, bufferCommands: false });
schema.index({ deviceId: 1, type: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });
schema.index({ deviceId: 1, startedAt: -1, _id: -1 });
schema.index({ deviceId: 1, status: 1, startedAt: -1 });
schema.index({ deviceId: 1, type: 1, startedAt: -1 });
module.exports = mongoose.models.Alert || mongoose.model('Alert', schema);