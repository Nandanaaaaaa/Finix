const logger = require('./logger');

/**
 * Enhanced error handling utilities for FiNIX backend
 * Provides comprehensive error handling with logging and user-friendly responses
 */

/**
 * Async handler wrapper to catch and forward errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Application error class for structured error handling
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Firebase Auth error handler
 * @param {Error} error - Firebase Auth error
 * @returns {Object} Standardized error response
 */
function handleFirebaseAuthError(error) {
  logger.error('Firebase Auth Error:', error);

  const errorMap = {
    'auth/id-token-expired': {
      status: 401,
      message: 'Your session has expired. Please sign in again.',
      code: 'TOKEN_EXPIRED'
    },
    'auth/id-token-revoked': {
      status: 401,
      message: 'Your session has been revoked. Please sign in again.',
      code: 'TOKEN_REVOKED'
    },
    'auth/invalid-id-token': {
      status: 401,
      message: 'Invalid authentication token. Please sign in again.',
      code: 'INVALID_TOKEN'
    },
    'auth/user-not-found': {
      status: 404,
      message: 'User account not found.',
      code: 'USER_NOT_FOUND'
    },
    'auth/user-disabled': {
      status: 403,
      message: 'User account has been disabled.',
      code: 'USER_DISABLED'
    }
  };

  const errorInfo = errorMap[error.code] || {
    status: 401,
    message: 'Authentication failed. Please try again.',
    code: 'AUTH_FAILED'
  };

  return {
    error: 'Authentication Error',
    message: errorInfo.message,
    code: errorInfo.code,
    status: errorInfo.status
  };
}

/**
 * Fi MCP error handler
 * @param {Error} error - Fi MCP related error
 * @returns {Object} Standardized error response
 */
function handleFiMcpError(error) {
  logger.error('Fi MCP Error:', error);

  if (error.response?.status === 401) {
    return {
      error: 'Fi MCP Authentication Error',
      message: 'Your Fi Money session has expired. Please authenticate again.',
      code: 'FI_MCP_AUTH_EXPIRED',
      status: 401
    };
  }

  if (error.response?.status === 403) {
    return {
      error: 'Fi MCP Access Denied',
      message: 'Access to Fi Money data was denied. Please check your permissions.',
      code: 'FI_MCP_ACCESS_DENIED',
      status: 403
    };
  }

  if (error.response?.status === 429) {
    return {
      error: 'Fi MCP Rate Limit',
      message: 'Too many requests to Fi Money. Please wait and try again.',
      code: 'FI_MCP_RATE_LIMIT',
      status: 429
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      error: 'Fi MCP Connection Error',
      message: 'Unable to connect to Fi Money services. Please try again later.',
      code: 'FI_MCP_CONNECTION_ERROR',
      status: 503
    };
  }

  if (error.code === 'ETIMEDOUT') {
    return {
      error: 'Fi MCP Timeout',
      message: 'Request to Fi Money timed out. Please try again.',
      code: 'FI_MCP_TIMEOUT',
      status: 408
    };
  }

  return {
    error: 'Fi MCP Error',
    message: 'An error occurred while accessing your financial data. Please try again.',
    code: 'FI_MCP_GENERAL_ERROR',
    status: 500
  };
}

/**
 * Gemini AI error handler
 * @param {Error} error - Gemini AI related error
 * @returns {Object} Standardized error response
 */
function handleGeminiError(error) {
  logger.error('Gemini AI Error:', error);

  if (error.message.includes('quota') || error.message.includes('QUOTA_EXCEEDED')) {
    return {
      error: 'AI Service Quota Exceeded',
      message: 'AI service is temporarily unavailable due to high demand. Please try again later.',
      code: 'GEMINI_QUOTA_EXCEEDED',
      status: 429
    };
  }

  if (error.message.includes('safety') || error.message.includes('SAFETY')) {
    return {
      error: 'Content Safety Error',
      message: 'Your message was flagged by our safety systems. Please rephrase and try again.',
      code: 'GEMINI_SAFETY_ERROR',
      status: 400
    };
  }

  if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
    return {
      error: 'AI Processing Timeout',
      message: 'AI processing took too long. Please try a simpler question.',
      code: 'GEMINI_TIMEOUT',
      status: 408
    };
  }

  return {
    error: 'AI Processing Error',
    message: 'Unable to process your request with AI. Please try again.',
    code: 'GEMINI_GENERAL_ERROR',
    status: 500
  };
}

/**
 * Validation error handler
 * @param {Error} error - Validation error (Joi)
 * @returns {Object} Standardized error response
 */
function handleValidationError(error) {
  logger.warn('Validation Error:', error);

  return {
    error: 'Validation Error',
    message: error.details[0].message,
    code: 'VALIDATION_ERROR',
    field: error.details[0].path[0],
    status: 400
  };
}

/**
 * Database error handler
 * @param {Error} error - Database related error
 * @returns {Object} Standardized error response
 */
function handleDatabaseError(error) {
  logger.error('Database Error:', error);

  if (error.code === 'ECONNREFUSED') {
    return {
      error: 'Database Connection Error',
      message: 'Unable to connect to database. Please try again later.',
      code: 'DB_CONNECTION_ERROR',
      status: 503
    };
  }

  return {
    error: 'Database Error',
    message: 'A database error occurred. Please try again.',
    code: 'DB_GENERAL_ERROR',
    status: 500
  };
}

/**
 * Central error handler that determines error type and formats response
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
function handleError(error, req = null) {
  // Log the original error for debugging
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.code && error.code.startsWith('auth/')) {
    return handleFirebaseAuthError(error);
  }

  if (error.message.includes('Fi MCP') || error.response?.config?.url?.includes('mcp.fi.money')) {
    return handleFiMcpError(error);
  }

  if (error.message.includes('Gemini') || error.message.includes('vertex')) {
    return handleGeminiError(error);
  }

  if (error.isJoi || error.name === 'ValidationError') {
    return handleValidationError(error);
  }

  if (error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
    return handleDatabaseError(error);
  }

  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      error: error.message,
      message: error.message,
      code: error.code,
      details: error.details,
      status: error.statusCode
    };
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    error: 'Internal Server Error',
    message: isDevelopment 
      ? error.message 
      : 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
    status: error.status || 500,
    ...(isDevelopment && { stack: error.stack })
  };
}

/**
 * Express error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const errorResponse = handleError(error, req);
  
  res.status(errorResponse.status).json({
    success: false,
    ...errorResponse,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
}

module.exports = {
  asyncHandler,
  AppError,
  handleError,
  errorMiddleware,
  handleFirebaseAuthError,
  handleFiMcpError,
  handleGeminiError,
  handleValidationError,
  handleDatabaseError
};
  