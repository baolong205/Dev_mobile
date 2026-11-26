const mongoose = require('mongoose');
const { defaults } = require('../services/alertSettingsService');
const rule = new mongoose.Schema({ enabled: Boolean, trigger: Number, clear: Number }, { _id: false });
const schema = new mongoose.Schema({ deviceId: { type: String, required: true, unique: true },
  sensorVerified: { type: Boolean, default: false }, alertsEnabled: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  temperatureHigh: rule, temperatureLow: rule, humidityHigh: rule, humidityLow: rule,
  consecutiveReadings: { type: Number, default: defaults().consecutiveReadings },
  cooldownMinutes: { type: Number, default: 10 }
}, { timestamps: true, bufferCommands: false });
module.exports = mongoose.models.AlertSettings || mongoose.model('AlertSettings', schema);