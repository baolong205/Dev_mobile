const router = require('express').Router();
const controller = require('../controllers/sensorController');
router.get('/latest', controller.latest);
router.get('/history', controller.history);
router.get('/stats', controller.stats);
router.get('/report', controller.report);
router.get('/motion', controller.motion);
module.exports = router;