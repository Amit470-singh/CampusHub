const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { optionalAuth } = require('../middlewares/auth');

router.get('/', optionalAuth, notificationsController.getNotifications);
router.post('/mark-read', optionalAuth, notificationsController.markAllAsRead);

module.exports = router;
