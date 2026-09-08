/**
 * CAMPUSHUB IN-MEMORY RATE LIMITER MIDDLEWARE
 * Protects authentication & transactional SMTP endpoints against abuse.
 */

const rateLimitBuckets = new Map();

// Periodic cleanup of stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitBuckets.entries()) {
    if (now > record.resetTime) {
      rateLimitBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Creates a rate-limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max allowed requests per window
 * @param {string} options.message - Error response message
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 60, message = 'Too many requests. Please try again later.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitBuckets.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitBuckets.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  otpSendLimiter: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 6,                   // 6 OTP sends per 10 minutes per IP
    message: 'Too many verification requests. Please wait a few minutes before requesting another code.'
  }),
  otpVerifyLimiter: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 15,                  // 15 attempts per 10 minutes per IP
    message: 'Too many verification attempts. Please wait a few minutes.'
  }),
  apiGeneralLimiter: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    max: 180,                 // 180 requests per minute
    message: 'Request rate limit exceeded. Please slow down.'
  })
};
