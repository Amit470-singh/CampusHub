/**
 * VERCEL SERVERLESS FUNCTION ENTRYPOINT
 * Routes incoming HTTP API requests to the Express application.
 */

const app = require('../backend/src/server');

module.exports = app;
