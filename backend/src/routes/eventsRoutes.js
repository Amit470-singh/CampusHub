const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

router.get('/', optionalAuth, eventsController.getEvents);
router.post('/', requireAuth, eventsController.createEvent);
router.get('/:id', optionalAuth, eventsController.getEventById);
router.post('/:id/register', optionalAuth, eventsController.registerEvent);

module.exports = router;
