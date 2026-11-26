const service = require('../services/sensorService');
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
module.exports = {
  latest: asyncRoute(async (_req, res) => {
    const data = await service.getLatest();
    if (!data) throw service.httpError(404, 'NO_SENSOR_DATA', 'No sensor reading has been stored');
    res.json({ success: true, data });
  }),
  history: asyncRoute(async (req, res) => res.json({ success: true, ...await service.getHistory(service.parsePagination(req.query)) })),
  stats: asyncRoute(async (_req, res) => res.json({ success: true, data: await service.getStats() }))
};