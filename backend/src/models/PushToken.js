const mongoose = require('mongoose');

const CATEGORIES = ['alerts', 'motion', 'device'];
const schema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String, enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' },
  categories: {
    alerts: { type: Boolean, default: true },
    motion: { type: Boolean, default: true },
    device: { type: Boolean, default: true }
  },
  lastSuccessAt: { type: Date, default: null }
}, { timestamps: true, bufferCommands: false });

module.exports = mongoose.models.PushToken || mongoose.model('PushToken', schema);
module.exports.CATEGORIES = CATEGORIES;
