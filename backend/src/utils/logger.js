const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

/**
 * Logger configuration for FiNIX backend
 * Uses Winston with Google Cloud Logging for production
 * Includes console output for local development
 */

// Cloud Logging Winston transport
const cloudLoggingWinston = new LoggingWinston({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  logName: 'finix-backend',
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.colorize({ all: true })
  ),
  defaultMeta: { 
    service: 'finix-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Add Cloud Logging in production
if (process.env.NODE_ENV === 'production' && process.env.GCP_PROJECT_ID) {
  logger.add(cloudLoggingWinston);
}

/**
 * Log user interaction
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} metadata - Additional metadata
 */
logger.logUserAction = (userId, action, metadata = {}) => {
  logger.info('User action', {
    userId: userId || 'anonymous',
    action,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log Fi MCP interaction
 * @param {string} userId - User ID
 * @param {string} operation - Fi MCP operation
 * @param {Object} result - Operation result
 */
logger.logFiMCPInteraction = (userId, operation, result = {}) => {
  logger.info('Fi MCP interaction', {
    userId,
    operation,
    success: result.success || false,
    error: result.error || null,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
logger.logSecurityEvent = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger; 