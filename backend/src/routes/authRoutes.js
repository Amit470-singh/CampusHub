const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');
const { otpSendLimiter, otpVerifyLimiter } = require('../middlewares/rateLimiter');

// Real OTP Authentication Endpoints with Rate Limiting
router.post('/send-otp', otpSendLimiter, authController.sendOtp);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOtp);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', authController.logout);

// Profile Management
router.get('/profile', optionalAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile', requireAuth, authController.updateProfile);

module.exports = router;
