/**
 * CAMPUSHUB TEAMS & SQUADS CONTROLLER
 * Full CRUD, squad applications, ownership verification, and member management.
 */

const db = require('../../../database/db');

exports.getTeams = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const teams = await db.getTeams(role || 'all', search || '');
    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    next(error);
  }
};

exports.getTeamById = async (req, res, next) => {
  try {
    const team = await db.getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

exports.createTeam = async (req, res, next) => {
  try {
    const { title, eventType, eventName, description, neededRoles, github } = req.body;
    if (!title || !eventName) {
      return res.status(400).json({ success: false, message: 'Team title and event name are required.' });
    }

    const ownerId = req.user.id;
    const newTeam = await db.createTeam({
      title,
      eventType,
      eventName,
      description: description || '',
      neededRoles: Array.isArray(neededRoles) ? neededRoles : (neededRoles ? [neededRoles] : []),
      github: github || ''
    }, ownerId);

    res.status(201).json({ success: true, message: 'Squad created successfully', data: newTeam });
  } catch (error) {
    next(error);
  }
};

exports.applyToTeam = async (req, res, next) => {
  try {
    const { roleApplied, reason, githubPortfolio } = req.body;
    if (!roleApplied || !reason) {
      return res.status(400).json({ success: false, message: 'Role applied for and reason are required.' });
    }

    const applicantId = req.user ? req.user.id : null;
    const applicantName = req.user ? req.user.name : (req.body.applicantName || 'Student Applicant');
    const applicantEmail = req.user ? req.user.email : (req.body.applicantEmail || '');

    const result = await db.applyToTeam(req.params.id, {
      roleApplied,
      reason,
      githubPortfolio,
      applicantName,
      applicantEmail
    }, applicantId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getTeamApplications = async (req, res, next) => {
  try {
    const applications = await db.getTeamApplications(req.params.id, req.user.id);
    if (!applications) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }
    res.json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the squad lead can view applications.' });
    }
    next(error);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status ("accepted" or "rejected") is required.' });
    }

    const result = await db.updateApplicationStatus(req.params.id, req.params.applicationId, status, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the squad lead can review applications.' });
    }
    next(error);
  }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    const result = await db.deleteTeam(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the squad lead can delete this squad.' });
    }
    next(error);
  }
};
