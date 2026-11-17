const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
let retryTimer;
let connecting = false;
let stopping = false;
let listenersInstalled = false;

async function connectDatabase(uri) {
  if (!listenersInstalled) {
    listenersInstalled = true;
    mongoose.connection.on('connected', () => console.log('[MongoDB] connected'));
    mongoose.connection.on('disconnected', () => console.warn('[MongoDB] disconnected'));
    mongoose.connection.on('error', () => console.error('[MongoDB] connection error (URI hidden)'));
  }
  if (connecting || stopping || mongoose.connection.readyState === 1) return;
  connecting = true;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, socketTimeoutMS: 5000 });
    // Tạo index đã khai báo, không syncIndexes/drop index hoặc xóa dữ liệu.
    try {
      await require('../models/SensorReading').createIndexes();
      console.log('[MongoDB] sensorreadings indexes ready');
    } catch {
      console.error('[MongoDB] index creation failed; check disk space/permissions; existing data kept');
    }
  } catch {
    console.error('[MongoDB] initial connection failed; retry in 5s (URI hidden)');
    if (!stopping) retryTimer = setTimeout(() => { void connectDatabase(uri); }, 5000);
  } finally {
    connecting = false;
  }
}
async function closeDatabase() {
  stopping = true;
  clearTimeout(retryTimer);
  await mongoose.disconnect();
}
module.exports = { connectDatabase, closeDatabase };