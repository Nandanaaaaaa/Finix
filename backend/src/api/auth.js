const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateUser, getCurrentUser } = require('../middleware/auth');
const fiMcpService = require('../services/fiMcpService');
const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

/**
 * Authentication API Routes
 * Handles Firebase authentication and Fi MCP integration
 */

// Validation schemas
const phoneSchema = Joi.object({
  phoneNumber: Joi.string()
    .min(10)
    .max(15)
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (only digits, spaces, +, -, and parentheses allowed)',
      'string.min': 'Phone number must be at least 10 digits',
      'string.max': 'Phone number must be at most 15 digits',
      'any.required': 'Phone number is required'
    })
});

const passcodeSchema = Joi.object({
  passcode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Passcode must be a 6-digit number',
      'any.required': 'Passcode is required'
    })
});

/**
 * GET /api/auth/status
 * Get current authentication status for both Firebase and Fi MCP
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const fiMcpStatus = geminiService.getAuthenticationStatus(user.uid);

    logger.logUserAction(user.uid, 'auth_status_check', {
      firebaseAuth: true,
      fiMcpAuth: fiMcpStatus.authenticated
    });

    res.json({
      success: true,
      firebase: {
        authenticated: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        }
      },
      fiMcp: fiMcpStatus,
      message: fiMcpStatus.authenticated 
        ? 'You are fully authenticated and ready to use FiNIX!'
        : 'Please connect your Fi Money account to access financial data.'
    });

  } catch (error) {
    logger.error('Auth status check failed:', error);
    res.status(500).json({
      error: 'Authentication Status Error',
      message: 'Unable to check authentication status'
    });
  }
});

/**
 * POST /api/auth/fi-mcp/initiate
 * Initiate Fi MCP authentication process
 */
router.post('/fi-mcp/initiate', authenticateUser, async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('Phone number received:', req.body.phoneNumber);
    
    // Validate request body
    const { error, value } = phoneSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details[0]);
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        field: error.details[0].path[0]
      });
    }

    const user = getCurrentUser(req);
    const { phoneNumber } = value;

    // Sanitize phone number
    const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '');
    console.log('Clean phone number:', cleanPhoneNumber);

    logger.logUserAction(user.uid, 'fi_mcp_auth_initiate', { 
      phoneNumber: cleanPhoneNumber.substring(0, 6) + '...' 
    });

    // Initiate Fi MCP authentication
    const result = await fiMcpService.initiateAuthentication(user.uid, cleanPhoneNumber);

    res.json({
      success: true,
      data: result,
      nextStep: 'Complete authentication by providing the passcode from your Fi Money app'
    });

  } catch (error) {
    logger.error('Fi MCP auth initiation failed:', error);
    
    if (error.message.includes('phone number')) {
      return res.status(400).json({
        error: 'Invalid Phone Number',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Authentication Initiation Failed',
      message: 'Unable to start Fi MCP authentication. Please try again.'
    });
  }
});

/**
 * POST /api/auth/fi-mcp/complete
 * Complete Fi MCP authentication with passcode
 */
router.post('/fi-mcp/complete', authenticateUser, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = passcodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        field: error.details[0].path[0]
      });
    }

    const user = getCurrentUser(req);
    const { passcode } = value;

    logger.logUserAction(user.uid, 'fi_mcp_auth_complete', { 
      passcode: 'provided' 
    });

    // Complete Fi MCP authentication
    const result = await fiMcpService.completeAuthentication(user.uid, passcode);

    res.json({
      success: true,
      data: result,
      message: 'Successfully connected to Fi Money! You can now ask questions about your finances.'
    });

  } catch (error) {
    logger.error('Fi MCP auth completion failed:', error);

    // Handle specific error types
    if (error.message.includes('passcode')) {
      return res.status(400).json({
        error: 'Invalid Passcode',
        message: error.message
      });
    }

    if (error.message.includes('session')) {
      return res.status(400).json({
        error: 'Session Error',
        message: error.message,
        suggestion: 'Please start the authentication process again'
      });
    }

    res.status(500).json({
      error: 'Authentication Completion Failed',
      message: 'Unable to complete Fi MCP authentication. Please try again.'
    });
  }
});

/**
 * GET /api/auth/fi-mcp/status
 * Get Fi MCP authentication status only
 */
router.get('/fi-mcp/status', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const isAuthenticated = fiMcpService.isAuthenticated(user.uid);

    logger.logUserAction(user.uid, 'fi_mcp_status_check', {
      authenticated: isAuthenticated
    });

    res.json({
      success: true,
      authenticated: isAuthenticated,
      message: isAuthenticated 
        ? 'Fi MCP connection is active'
        : 'Fi MCP authentication required',
      instructions: isAuthenticated 
        ? null 
        : [
            '1. Provide your Fi Money registered phone number',
            '2. Click the authentication link',
            '3. Get passcode from Fi Money app',
            '4. Complete authentication with passcode'
          ]
    });

  } catch (error) {
    logger.error('Fi MCP status check failed:', error);
    res.status(500).json({
      error: 'Status Check Failed',
      message: 'Unable to check Fi MCP authentication status'
    });
  }
});

/**
 * GET /api/auth/fi-mcp/mcp-status
 * Check MCP server connection and status
 */
router.get('/fi-mcp/mcp-status', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    
    console.log('=== MCP SERVER STATUS CHECK ===');
    console.log('User requesting MCP status:', user.uid);
    
    // Test MCP server connection
    const mcpStatus = await fiMcpService.testMcpConnection();
    
    // Get local storage status
    const localData = fiMcpService.queryStoredData(user.uid);
    
    res.json({
      success: true,
      userId: user.uid,
      mcpServer: mcpStatus,
      localStorage: localData,
      message: 'MCP server status retrieved successfully'
    });

  } catch (error) {
    logger.error('MCP server status check failed:', error);
    res.status(500).json({
      error: 'MCP Status Check Failed',
      message: 'Unable to check MCP server status'
    });
  }
});

/**
 * GET /api/auth/fi-mcp/query-data
 * Query stored phone number data (for debugging/verification)
 */
router.get('/fi-mcp/query-data', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    
    console.log('=== API QUERY REQUEST ===');
    console.log('User requesting data:', user.uid);
    
    // Query the stored data
    const storedData = fiMcpService.queryStoredData(user.uid);
    
    res.json({
      success: true,
      userId: user.uid,
      storedData,
      message: 'Stored data retrieved successfully'
    });

  } catch (error) {
    logger.error('Fi MCP data query failed:', error);
    res.status(500).json({
      error: 'Query Failed',
      message: 'Unable to query stored data'
    });
  }
});

/**
 * POST /api/auth/fi-mcp/disconnect
 * Disconnect Fi MCP authentication (logout)
 */
router.post('/fi-mcp/disconnect', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    // Remove user's Fi MCP token
    fiMcpService.userTokens.delete(user.uid);
    
    logger.logUserAction(user.uid, 'fi_mcp_disconnect', {
      success: true
    });

    res.json({
      success: true,
      message: 'Successfully disconnected from Fi Money',
      nextStep: 'You can reconnect anytime by providing your phone number again'
    });

  } catch (error) {
    logger.error('Fi MCP disconnect failed:', error);
    res.status(500).json({
      error: 'Disconnect Failed',
      message: 'Unable to disconnect from Fi Money'
    });
  }
});

/**
 * GET /api/auth/user
 * Get current Firebase user information
 */
router.get('/user', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    logger.logUserAction(user.uid, 'user_info_request', {
      email: user.email
    });

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        picture: user.picture,
        emailVerified: user.emailVerified
      },
      message: 'User information retrieved successfully'
    });

  } catch (error) {
    logger.error('User info request failed:', error);
    res.status(500).json({
      error: 'User Info Error',
      message: 'Unable to retrieve user information'
    });
  }
});

module.exports = router; 