/**
 * CAMPUSHUB COMMUNITIES CONTROLLER
 * Hub listing, community creation, join and leave operations.
 */

const db = require('../../../database/db');

exports.getCommunities = async (req, res, next) => {
  try {
    const { category } = req.query;
    const currentUserId = req.user ? req.user.id : null;
    const communities = await db.getCommunities(category || 'all', currentUserId);
    res.json({ success: true, count: communities.length, data: communities });
  } catch (error) {
    next(error);
  }
};

exports.getCommunityById = async (req, res, next) => {
  try {
    const community = await db.getCommunityById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community hub not found' });
    }
    res.json({ success: true, data: community });
  } catch (error) {
    next(error);
  }
};

exports.createCommunity = async (req, res, next) => {
  try {
    const { name, category, icon, desc } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required.' });
    }

    const creatorId = req.user.id;
    const community = await db.createCommunity({
      name,
      category,
      icon,
      desc
    }, creatorId);

    res.status(201).json({ success: true, message: 'Community created successfully', data: community });
  } catch (error) {
    next(error);
  }
};

exports.joinCommunity = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const result = await db.joinCommunity(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.leaveCommunity = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const result = await db.leaveCommunity(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
