const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

router.get('/', teamsController.getTeams);
router.post('/', requireAuth, teamsController.createTeam);
router.get('/:id', teamsController.getTeamById);
router.delete('/:id', requireAuth, teamsController.deleteTeam);
router.post('/:id/apply', optionalAuth, teamsController.applyToTeam);

// Squad Lead Application Review Endpoints
router.get('/:id/applications', requireAuth, teamsController.getTeamApplications);
router.patch('/:id/applications/:applicationId', requireAuth, teamsController.updateApplicationStatus);

module.exports = router;
