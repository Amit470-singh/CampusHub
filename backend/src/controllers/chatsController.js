/**
 * CAMPUSHUB CHATS CONTROLLER
 * User-to-user direct messages, authorized peer chat creation, and message persistence.
 */

const db = require('../../../database/db');

exports.getChats = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const chats = await db.getChats(userId);
    res.json({ success: true, count: chats.length, data: chats });
  } catch (error) {
    next(error);
  }
};

exports.openOrCreateChat = async (req, res, next) => {
  try {
    const { peerName, avatar, peerStatus, peerId } = req.body;
    if (!peerName) {
      return res.status(400).json({ success: false, message: 'peerName is required' });
    }

    const currentUserId = req.user ? req.user.id : 'user-01';
    const targetUserId = peerId || null;

    const chat = await db.getOrCreateChat(currentUserId, targetUserId, peerName, avatar, peerStatus);
    res.json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const senderId = req.user ? req.user.id : 'user-01';
    const senderName = req.user ? req.user.name : 'me';

    const result = await db.sendMessage(chatId, senderId, senderName, text.trim());
    res.json({ success: true, message: 'Message sent', data: result });
  } catch (error) {
    next(error);
  }
};
