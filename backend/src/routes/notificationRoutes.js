const express = require('express');

// Mọi người dùng đã đăng nhập (kể cả viewer) đều quản lý được push token của chính mình.
function createNotificationRoutes(notifier) {
  const router = express.Router();
  const handle = fn => (req, res, next) => Promise.resolve(fn(req)).then(data => res.json({ success: true, data }), next);
  router.put('/token', handle(req => notifier.register(req.user?.id ?? 'anonymous', req.body)));
  router.delete('/token', handle(req => notifier.unregister(req.user?.id ?? 'anonymous', req.body?.token)));
  router.post('/test', handle(req => notifier.test(req.user?.id ?? 'anonymous')));
  return router;
}
module.exports = { createNotificationRoutes };
