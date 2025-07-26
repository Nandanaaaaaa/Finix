const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateUser, getCurrentUser } = require('../middleware/auth');
const { sendMessageToGemini, getAuthenticationStatus } = require('../services/geminiService');
const logger = require('../utils/logger');

/**
 * Chat API Routes
 * Handles AI conversations with Fi MCP integration
 */

// Validation schemas
const chatSchema = Joi.object({
  message: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message is too short',
      'string.max': 'Message is too long (max 2000 characters)',
      'any.required': 'Message is required'
    }),
  chatHistory: Joi.array()
    .items(Joi.object({
      role: Joi.string().valid('user', 'model').required(),
      parts: Joi.array().items(Joi.object({
        text: Joi.string().required()
      })).required()
    }))
    .max(50)
    .default([])
    .messages({
      'array.max': 'Chat history too long (max 50 messages)'
    })
});

/**
 * POST /api/chat
 * Send message to AI assistant
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        field: error.details[0].path[0]
      });
    }

    const user = getCurrentUser(req);
    const { message, chatHistory } = value;

    // Log user interaction
    logger.logUserAction(user.uid, 'chat_message_sent', {
      messageLength: message.length,
      historyLength: chatHistory.length,
      email: user.email
    });

    // Check authentication status
    const authStatus = getAuthenticationStatus(user.uid);
    
    // Send message to Gemini with user context
    const aiResponse = await sendMessageToGemini(message, user.uid, chatHistory);

    // Log successful response
    logger.logUserAction(user.uid, 'chat_response_received', {
      responseLength: aiResponse.length,
      fiMcpAuthenticated: authStatus.authenticated
    });

    res.json({
      success: true,
      response: aiResponse,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email
      },
      authStatus: authStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const user = getCurrentUser(req);
    
    logger.error('Chat request failed:', error);
    logger.logUserAction(user?.uid || 'unknown', 'chat_error', {
      error: error.message,
      messageLength: req.body?.message?.length || 0
    });

    // Handle specific error types
    if (error.message.includes('authentication')) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'Please connect your Fi Money account to access financial data',
        suggestion: 'Use the authentication flow to connect your account'
      });
    }

    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please wait a moment and try again.',
        retryAfter: 60
      });
    }

    if (error.message.includes('timeout')) {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request took too long to process. Please try again.',
        suggestion: 'Try asking a simpler question or check your connection'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Chat Processing Error',
      message: 'I encountered an issue processing your message. Please try again.',
      suggestion: 'If the problem persists, please check your authentication status'
    });
  }
});

/**
 * GET /api/chat/status
 * Get chat service status and user capabilities
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const authStatus = getAuthenticationStatus(user.uid);

    logger.logUserAction(user.uid, 'chat_status_check', {
      fiMcpAuthenticated: authStatus.authenticated
    });

    res.json({
      success: true,
      chatAvailable: true,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email
      },
      capabilities: {
        basicChat: true,
        financialData: authStatus.authenticated,
        realTimeData: authStatus.authenticated,
        portfolioAnalysis: authStatus.authenticated
      },
      authStatus: authStatus,
      features: [
        'Natural language financial queries',
        'Real-time portfolio analysis',
        'Investment performance tracking',
        'Loan and credit card management',
        'Net worth monitoring',
        'Personalized financial advice'
      ],
      limitations: authStatus.authenticated ? [] : [
        'Financial data access requires Fi Money authentication',
        'Connect your Fi Money account to unlock all features'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chat status check failed:', error);
    res.status(500).json({
      error: 'Status Check Failed',
      message: 'Unable to check chat service status'
    });
  }
});

/**
 * POST /api/chat/clear-history
 * Clear chat history for debugging/privacy
 */
router.post('/clear-history', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    logger.logUserAction(user.uid, 'chat_history_cleared', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Chat history cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Clear chat history failed:', error);
    res.status(500).json({
      error: 'Clear History Failed',
      message: 'Unable to clear chat history'
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Get suggested questions based on user's authentication status
 */
router.get('/suggestions', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const authStatus = getAuthenticationStatus(user.uid);

    const baseSuggestions = [
      'Hello! How can you help me with my finances?',
      'What financial data can you access?',
      'How do I connect my Fi Money account?'
    ];

    const authenticatedSuggestions = [
      'What is my current net worth?',
      'How are my mutual funds performing?',
      'Which investments are underperforming?',
      'What is my asset allocation?',
      'How much do I owe in loans and credit cards?',
      'Give me a portfolio analysis',
      'How has my net worth changed over time?',
      'Which fund has the best CAGR?',
      'What are my top 5 holdings?',
      'Are there any financial red flags I should know about?'
    ];

    const suggestions = authStatus.authenticated 
      ? [...baseSuggestions, ...authenticatedSuggestions]
      : baseSuggestions;

    logger.logUserAction(user.uid, 'chat_suggestions_requested', {
      authenticated: authStatus.authenticated,
      suggestionsCount: suggestions.length
    });

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 8), // Limit to 8 suggestions
      authStatus: authStatus,
      message: authStatus.authenticated
        ? 'Here are some questions you can ask about your finances:'
        : 'Connect your Fi Money account to unlock financial questions:'
    });

  } catch (error) {
    logger.error('Get chat suggestions failed:', error);
    res.status(500).json({
      error: 'Suggestions Error',
      message: 'Unable to get chat suggestions'
    });
  }
});

module.exports = router;
