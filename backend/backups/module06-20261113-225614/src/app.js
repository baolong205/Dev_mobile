const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const sensorRoutes = require('./routes/sensorRoutes');

function createApp(mqttStatus = () => ({ connected: false, subscribed: false })) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => {
    const mongodb = { connected: mongoose.connection.readyState === 1, readyState: mongoose.connection.readyState };
    const mqtt = mqttStatus();
    const ready = mongodb.connected && mqtt.connected && mqtt.subscribed;
    res.status(ready ? 200 : 503).json({ success: ready, data: {
      backend: { status: 'running', uptimeSeconds: Math.floor(process.uptime()) },
      status: ready ? 'ready' : 'degraded', mongodb, mqtt
    } });
  });
  app.use('/api/sensors', sensorRoutes);
  app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use((error, _req, res, _next) => {
    const databaseError = /Mongo|Mongoose/.test(error.name || '');
    const status = error.type === 'entity.parse.failed' ? 400 : error.status || (databaseError ? 503 : 500);
    const code = error.type === 'entity.parse.failed' ? 'INVALID_JSON' : error.code && typeof error.code === 'string' ? error.code : databaseError ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR';
    const message = status >= 500 ? (status === 503 ? 'MongoDB/service temporarily unavailable' : 'Internal server error') : error.type === 'entity.parse.failed' ? 'Invalid JSON body' : error.message;
    if (status >= 500) console.error('[HTTP] request failed', code);
    res.status(status).json({ success: false, error: { code, message } });
  });
  return app;
}
module.exports = { createApp };