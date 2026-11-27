const express = require('express');

function createStoreWatchRoutes(watch) {
  const router = express.Router();
  const handle = fn => async (req, res, next) => {
    try { res.json({ success: true, data: (await fn(req)) ?? null }); } catch (error) { next(error); }
  };
  router.get('/', handle(() => watch.snapshot()));
  router.put('/mode', handle(req => watch.change(req.body?.mode)));
  router.patch('/incidents/:id', handle(req => watch.review(req.params.id, req.body?.note)));
  return router;
}
module.exports = { createStoreWatchRoutes };
