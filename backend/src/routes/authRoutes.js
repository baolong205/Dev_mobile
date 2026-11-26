const express = require('express');

function createAuthRoutes(auth, loginLimiter) {
  const router = express.Router();
  router.post('/login', loginLimiter, (req, res, next) => {
    auth.login(req.body?.username, req.body?.password)
      .then(data => res.json({ success: true, data }), next);
  });
  router.get('/me', auth.authenticate, (req, res) => res.json({ success: true, data: req.user }));
  return router;
}
module.exports = { createAuthRoutes };
