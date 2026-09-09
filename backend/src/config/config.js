/**
 * CAMPUSHUB BACKEND CONFIGURATION
 * Strict environment variable loading and production validation.
 */

const path = require('path');

// Only load local .env in development/testing environments to prevent overwriting Vercel production environment variables
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
  } catch (e) {
    // dotenv optional in environments with pre-loaded vars
  }
}

const isProduction = process.env.NODE_ENV === 'production';

// Sanitize DATABASE_URL (trim spaces, remove accidental wrapping quotes)
const sanitizedDatabaseUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

// Fail-fast in production if critical variables are missing
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) {
    throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is required in production (minimum 16 characters). Configure this in Vercel Project Settings.');
  }
  if (!sanitizedDatabaseUrl || !sanitizedDatabaseUrl.startsWith('postgres')) {
    throw new Error('CRITICAL CONFIGURATION ERROR: DATABASE_URL environment variable is required in production with a valid PostgreSQL URI. Configure this in Vercel Project Settings.');
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || '*',
  DATABASE_URL: sanitizedDatabaseUrl,

  // Database Pool settings (optimized for serverless & Supabase transaction pooler)
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || (isProduction ? '5' : '20'), 10),

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'campushub-dev-local-jwt-secret-key-2026'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Email / SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'CampusHub <no-reply@campushub.edu>',

  // OTP Security Rules
  OTP_EXPIRY_MS: 5 * 60 * 1000,     // 5 minutes
  OTP_MAX_ATTEMPTS: 5,             // Max 5 attempts before lock
  OTP_COOLDOWN_MS: 60 * 1000       // 60s cooldown between resends
};
