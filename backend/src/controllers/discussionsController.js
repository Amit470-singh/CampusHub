/**
 * CAMPUSHUB DISCUSSIONS & COMMENTS CONTROLLER
 * Feed post creation, replies/comments, likes, and deletion with ownership checks.
 */

const db = require('../../../database/db');

exports.getDiscussions = async (req, res, next) => {
  try {
    const { category } = req.query;
    const currentUserId = req.user ? req.user.id : null;
    const discussions = await db.getDiscussions(category || 'all', currentUserId);
    res.json({ success: true, count: discussions.length, data: discussions });
  } catch (error) {
    next(error);
  }
};

exports.createDiscussion = async (req, res, next) => {
  try {
    const { content, category, isAnon, tags } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const authorId = req.user ? req.user.id : null;
    const author = isAnon ? 'Anonymous Builder' : (req.user ? req.user.name : (req.body.author || 'Student Builder'));
    const dept = req.user ? `${req.user.department || 'Verified Student'}` : 'Verified Student';
    const avatar = req.user ? req.user.avatar : null;

    const newPost = await db.createDiscussion({
      content,
      category,
      isAnon,
      tags,
      author,
      dept,
      avatar
    }, authorId);

    res.status(201).json({ success: true, message: 'Post published successfully', data: newPost });
  } catch (error) {
    next(error);
  }
};

exports.deleteDiscussion = async (req, res, next) => {
  try {
    const result = await db.deleteDiscussion(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the author can delete this discussion.' });
    }
    next(error);
  }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const result = await db.toggleLikeDiscussion(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const comments = await db.getDiscussionComments(req.params.id);
    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const userId = req.user.id;
    const authorName = req.user.name;
    const authorAvatar = req.user.avatar;

    const comment = await db.addDiscussionComment(req.params.id, userId, text.trim(), authorName, authorAvatar);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Discussion post not found.' });
    }

    res.status(201).json({ success: true, message: 'Comment added successfully', data: comment });
  } catch (error) {
    next(error);
  }
};
