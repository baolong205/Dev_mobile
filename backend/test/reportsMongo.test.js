const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Reading = require('../src/models/SensorReading');
const Alert = require('../src/models/Alert');
const { getReport, getMotionHistory } = require('../src/services/reportService');
const { getHistory } = require('../src/services/sensorService');
const { dateFilter } = require('../src/services/timeRangeService');
test('isolated real Mongo report boundaries, nulls, PIR edges/session/gaps, alert counts and filtered history', { skip: !process.env.SMARTSTORE_TEST_MONGO_URI, timeout: 30000 }, async () => {
  const uri = process.env.SMARTSTORE_TEST_MONGO_URI;
  if (!/^mongodb:\/\/127\.0\.0\.1:27017\/smartstore_module09_test_[a-f0-9]+$/.test(uri)) throw Error('Refusing non-isolated test database');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    const start = Date.parse('2026-11-17T12:00:00Z');
    const range = { from: new Date(start), to: new Date(start + 60000) };
    await Reading.insertMany([
      [-2000, false, 'a', 99], [0, true, 'a', 20], [2000, true, 'a', null], [4000, false, 'a', 30],
      [6000, true, 'b', 40], [8000, false, 'b', 50], [10000, true, 'b', 60],
      [12000, false, 'b', 70], [30000, true, 'b', 80], [62000, false, 'b', 99],
    ].map(([offset, motion, controlSession, temperature]) => ({ receivedAt: new Date(start + offset), motion, controlSession, temperature, humidity: 50, ledGreen: false, ledRed: false })));
    await Alert.create({ deviceId: 'smartstore-esp32', type: 'temperatureHigh', status: 'RESOLVED', message: 'test', startedAt: new Date(start), resolvedAt: new Date(start + 10000) });
    const report = await getReport(range);
    assert.equal(report.total, 8); assert.equal(report.temperature.count, 7); assert.equal(report.temperature.min, 20); assert.equal(report.temperature.max, 80);
    assert.equal(report.temperature.average, 50); assert.equal(report.motionEvents, 2); assert.equal(report.motionSamples, 5);
    assert.equal(report.alerts.total, 1); assert.equal(report.alerts.resolved, 1); assert.equal(report.series.length, 1);
    const motion = await getMotionHistory(range, { page: 1, limit: 20 }); assert.equal(motion.total, 2);
    assert.equal(+new Date(motion.data[0].receivedAt), start + 10000);
    const history = await getHistory({ page: 1, limit: 20, filter: dateFilter(range) }); assert.equal(history.total, 8);
  } finally {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});