const express = require('express');
const { trustedAddress } = require('../services/ledService');
const { httpError } = require('../services/sensorService');
function createAlertRoutes(alerts) {
  const router = express.Router();
  const wrap = fn => (req, res, next) => Promise.resolve().then(() => {
    if (!alerts) throw httpError(503, 'ALERTS_UNAVAILABLE', 'Dịch vụ cảnh báo chưa sẵn sàng.');
    return fn(req, res);
  }).catch(next);
  let lastWrite = 0;
  const lanWrite = (req, _res, next) => {
    if (!trustedAddress(req.socket.remoteAddress)) return next(httpError(403, 'LAN_ONLY', 'Chỉ cấu hình từ mạng LAN tin cậy.'));
    if (Date.now() - lastWrite < 500) return next(httpError(429, 'RATE_LIMIT', 'Thao tác quá nhanh.'));
    lastWrite = Date.now(); next();
  };
  router.get('/alerts', wrap(async (req, res) => res.json({ success: true, ...await alerts.list(req.query) })));
  router.get('/alerts/active', wrap(async (_req, res) => res.json({ success: true, data: await alerts.active() })));
  router.get('/alerts/stats', wrap(async (req, res) => res.json({ success: true, data: await alerts.stats(req.query) })));
  router.patch('/alerts/:id/acknowledge', lanWrite, wrap(async (req, res) => {
    if (req.body && Object.keys(req.body).length) throw httpError(400, 'INVALID_BODY', 'Không nhận dữ liệu định danh giả lập.');
    res.json({ success: true, data: await alerts.acknowledge(req.params.id) });
  }));
  router.delete('/alerts/:id', lanWrite, wrap(async (req, res) => {
    if (req.body && Object.keys(req.body).length) throw httpError(400, 'INVALID_BODY', 'Không nhận dữ liệu khi xóa cảnh báo.');
    res.json({ success: true, data: await alerts.remove(req.params.id) });
  }));
  router.get('/alert-settings', wrap(async (_req, res) => res.json({ success: true, data: alerts.getSettings() })));
  router.put('/alert-settings', lanWrite, wrap(async (req, res) => res.json({ success: true, data: await alerts.updateSettings(req.body) })));
  return router;
}
module.exports = { createAlertRoutes };