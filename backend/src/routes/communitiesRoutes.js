const express = require('express');
const router = express.Router();
const communitiesController = require('../controllers/communitiesController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

router.get('/', optionalAuth, communitiesController.getCommunities);
router.post('/', requireAuth, communitiesController.createCommunity);
router.get('/:id', optionalAuth, communitiesController.getCommunityById);
router.post('/:id/join', optionalAuth, communitiesController.joinCommunity);
router.post('/:id/leave', optionalAuth, communitiesController.leaveCommunity);

module.exports = router;
