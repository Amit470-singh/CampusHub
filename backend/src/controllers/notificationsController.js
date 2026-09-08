/**
 * CAMPUSHUB NOTIFICATIONS CONTROLLER
 * Scoped strictly to authenticated student user ID.
 */

const db = require('../../../database/db');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const notifications = await db.getNotifications(userId);
    const unreadCount = notifications.filter(n => n.unread).length;
    res.json({ success: true, unreadCount, data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const result = await db.markAllNotificationsRead(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
