const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chatsController');
const { optionalAuth } = require('../middlewares/auth');

router.get('/', optionalAuth, chatsController.getChats);
router.post('/open', optionalAuth, chatsController.openOrCreateChat);
router.post('/:chatId/messages', optionalAuth, chatsController.sendMessage);

module.exports = router;
