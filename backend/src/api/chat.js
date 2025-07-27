const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateUser, getCurrentUser } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

/**
 * Chat API Routes
 * Handles AI conversations and Fi MCP data access
 */

// Validation schemas
const messageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message is too long (max 2000 characters)',
      'any.required': 'Message is required'
    }),
  chatHistory: Joi.array().items(
    Joi.object({
      sender: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().required(),
      timestamp: Joi.date().optional()
    })
  ).optional().default([])
});

/**
 * POST /api/chat
 * Send message to AI assistant
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        field: error.details[0].path[0]
      });
    }

    const user = getCurrentUser(req);
    const { message, chatHistory } = value;

    logger.logUserAction(user.uid, 'chat_message_sent', { 
      messageLength: message.length,
      hasHistory: chatHistory.length > 0
    });

    // Process message with Gemini AI
    const result = await geminiService.processMessage(user.uid, message, chatHistory);

    if (!result.success) {
      return res.status(400).json({
        error: 'Chat Error',
        message: result.message,
        requiresAuth: result.requiresAuth || false
      });
    }

    logger.logUserAction(user.uid, 'chat_response_sent', { 
      responseLength: result.message.length,
      functionCalled: result.functionCalled
    });

    res.json({
      success: true,
      message: result.message,
      functionCalled: result.functionCalled,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chat message processing failed:', error);
    res.status(500).json({
      error: 'Chat Processing Error',
      message: 'Unable to process your message. Please try again.'
    });
  }
});

/**
 * GET /api/chat/status
 * Get chat status and capabilities
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const status = geminiService.getChatStatus(user.uid);

    logger.logUserAction(user.uid, 'chat_status_check', {
      authenticated: status.authenticated,
      capabilities: status.capabilities.length
    });

    res.json({
      success: true,
      status,
      message: status.message
    });

  } catch (error) {
    logger.error('Chat status check failed:', error);
    res.status(500).json({
      error: 'Status Check Error',
      message: 'Unable to check chat status'
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Get chat suggestions based on authentication status
 */
router.get('/suggestions', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const suggestions = geminiService.getChatSuggestions(user.uid);

    logger.logUserAction(user.uid, 'chat_suggestions_requested', {
      suggestionCount: suggestions.length
    });

    res.json({
      success: true,
      suggestions,
      message: 'Chat suggestions retrieved successfully'
    });

  } catch (error) {
    logger.error('Chat suggestions failed:', error);
    res.status(500).json({
      error: 'Suggestions Error',
      message: 'Unable to get chat suggestions'
    });
  }
});

/**
 * POST /api/chat/clear-history
 * Clear chat history (placeholder for future implementation)
 */
router.post('/clear-history', authenticateUser, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    logger.logUserAction(user.uid, 'chat_history_cleared', {
      success: true
    });

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    logger.error('Chat history clear failed:', error);
    res.status(500).json({
      error: 'Clear History Error',
      message: 'Unable to clear chat history'
    });
  }
});

module.exports = router;
