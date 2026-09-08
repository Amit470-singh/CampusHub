/**
 * CAMPUSHUB EVENTS & HACKATHONS CONTROLLER
 * Listing, event creation, registration with duplicate check, and details.
 */

const db = require('../../../database/db');

exports.getEvents = async (req, res, next) => {
  try {
    const { type } = req.query;
    const currentUserId = req.user ? req.user.id : null;
    const events = await db.getEvents(type || 'all', currentUserId);
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    next(error);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const event = await db.getEventById(req.params.id, currentUserId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const { title, type, date, time, location, desc, prize, img } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Event title is required.' });
    }

    const creatorId = req.user.id;
    const newEvent = await db.createEvent({
      title,
      type,
      date,
      time,
      location,
      desc,
      prize,
      img
    }, creatorId);

    res.status(201).json({ success: true, message: 'Event published successfully', data: newEvent });
  } catch (error) {
    next(error);
  }
};

exports.registerEvent = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'user-01';
    const result = await db.registerEvent(req.params.id, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};
