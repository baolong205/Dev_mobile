const mongoose = require('mongoose');
const nullableNumber = {
  type: Number,
  default: null,
  validate: { validator: value => value === null || Number.isFinite(value), message: 'Must be finite or null' }
};
const schema = new mongoose.Schema({
  temperature: { ...nullableNumber },
  humidity: { ...nullableNumber },
  motion: { type: Boolean, required: true },
  ledGreen: { type: Boolean, required: true },
  ledRed: { type: Boolean, required: true },
  receivedAt: { type: Date, default: Date.now, required: true }
}, { collection: 'sensorreadings', timestamps: true, bufferCommands: false });
schema.index({ receivedAt: -1, _id: -1 });
module.exports = mongoose.models.SensorReading || mongoose.model('SensorReading', schema);