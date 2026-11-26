const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const sensorRoutes = require('./routes/sensorRoutes');
const { createAuthRoutes } = require('./routes/authRoutes');
const { trustedAddress } = require('./services/ledService');
const { httpError } = require('./services/sensorService');

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    // Giới hạn theo người dùng nếu đã đăng nhập, nếu không thì theo IP.
    keyGenerator: req => req.user?.id || req.ip,
    handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMIT', message } })
  });
}

/**
 * options.auth: kết quả createAuth(). Khi có, mọi /api (trừ health, login) cần JWT
 * và mọi thao tác ghi cần vai trò admin. Bỏ trống chỉ dùng cho test đơn vị.
 */
function createApp(mqttStatus = () => ({ connected: false, subscribed: false }), corsOptions = { origin: true }, alerts, watch, options = {}) {
  const { auth, lanOnlyWrites = true } = options;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? false);
  app.use(cors(corsOptions));
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

  if (auth) {
    const loginLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 10, message: 'Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.' });
    app.use('/api/auth', createAuthRoutes(auth, loginLimiter));
    app.use('/api', auth.authenticate);
  }
  const writeLimiter = limiter({ windowMs: 60 * 1000, limit: 60, message: 'Thao tác quá nhanh. Vui lòng chờ.' });
  app.use('/api', (req, res, next) => {
    if (READ_METHODS.has(req.method)) return next();
    if (lanOnlyWrites && !trustedAddress(req.socket.remoteAddress)) return next(httpError(403, 'LAN_ONLY', 'Chỉ thay đổi từ mạng LAN tin cậy.'));
    const guard = auth ? auth.requireRole('admin') : (_q, _s, done) => done();
    guard(req, res, error => (error ? next(error) : writeLimiter(req, res, next)));
  });

  app.use('/api/sensors', sensorRoutes);
  if (watch) app.use('/api/store-watch', require('./routes/storeWatchRoutes').createStoreWatchRoutes(watch));
  app.use('/api', require('./routes/alertRoutes').createAlertRoutes(alerts));
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
