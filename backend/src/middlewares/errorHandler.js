/**
 * GLOBAL ERROR HANDLER MIDDLEWARE
 * Production-safe error responses without stack leaks.
 */

const config = require('../config/config');

function errorHandler(err, req, res, next) {
  console.error('🔥 [API ERROR]', err.stack || err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const isProd = config.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : (err.message || 'Internal Server Error')
  });
}

module.exports = errorHandler;
