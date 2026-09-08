const express = require('express');
const router = express.Router();
const discussionsController = require('../controllers/discussionsController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

router.get('/', optionalAuth, discussionsController.getDiscussions);
router.post('/', optionalAuth, discussionsController.createDiscussion);
router.delete('/:id', requireAuth, discussionsController.deleteDiscussion);
router.post('/:id/like', discussionsController.toggleLike);

// Comments / Replies Endpoints
router.get('/:id/comments', discussionsController.getComments);
router.post('/:id/comments', requireAuth, discussionsController.addComment);

module.exports = router;
