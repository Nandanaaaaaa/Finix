const { VertexAI } = require('@google-cloud/vertexai');
const fiMcpService = require('./fiMcpService');
const logger = require('../utils/logger');

/**
 * Gemini AI Service with Fi MCP Function Calling Integration
 * Handles AI conversations and automatically calls Fi MCP functions based on user queries
 */

class GeminiService {
  constructor() {
    this.vertexAI = new VertexAI({ 
      project: process.env.GCP_PROJECT_ID, 
      location: 'us-central1' 
    });

    // Function declarations for Gemini function calling
    this.functionDeclarations = [
      {
        name: 'getNetWorth',
        description: 'Get the user\'s current net worth, including assets, liabilities, and overall financial position. Use this when user asks about their net worth, total wealth, financial status, or overall portfolio value.',
        parameters: {
          type: 'object',
          properties: {
            includeBreakdown: {
              type: 'boolean',
              description: 'Whether to include detailed breakdown of assets and liabilities'
            }
          }
        }
      },
      {
        name: 'getMutualFunds',
        description: 'Get detailed information about the user\'s mutual fund holdings, performance, and SIP details. Use this when user asks about mutual funds, SIPs, fund performance, or investment returns.',
        parameters: {
          type: 'object',
          properties: {
            includePerformance: {
              type: 'boolean',
              description: 'Whether to include performance metrics like CAGR, XIRR'
            }
          }
        }
      },
      {
        name: 'getStocks',
        description: 'Get information about the user\'s stock holdings, both Indian and US stocks. Use this when user asks about stocks, equity investments, stock performance, or individual stock holdings.',
        parameters: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              enum: ['all', 'indian', 'us'],
              description: 'Which region stocks to fetch - all, indian only, or us only'
            }
          }
        }
      },
      {
        name: 'getLoansAndCreditCards',
        description: 'Get information about the user\'s loans, credit cards, and debt obligations. Use this when user asks about loans, credit cards, debt, EMIs, or liabilities.',
        parameters: {
          type: 'object',
          properties: {
            includePaymentSchedule: {
              type: 'boolean',
              description: 'Whether to include upcoming payment schedules'
            }
          }
        }
      },
      {
        name: 'getPortfolioAnalysis',
        description: 'Get comprehensive portfolio analysis including asset allocation, risk assessment, and recommendations. Use this when user asks for analysis, recommendations, portfolio review, or financial advice.',
        parameters: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['full', 'risk', 'allocation', 'performance'],
              description: 'Type of analysis to perform'
            }
          }
        }
      },
      {
        name: 'initiateAuthentication',
        description: 'Initiate Fi MCP authentication process when user wants to connect their Fi Money account. Use this when user asks to connect, authenticate, or link their Fi Money account.',
        parameters: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'User\'s Fi Money registered phone number'
            }
          },
          required: ['phoneNumber']
        }
      },
      {
        name: 'completeAuthentication',
        description: 'Complete Fi MCP authentication with passcode from Fi Money app. Use this when user provides the passcode they received from the Fi Money app.',
        parameters: {
          type: 'object',
          properties: {
            passcode: {
              type: 'string',
              description: 'The 6-digit passcode from Fi Money app'
            }
          },
          required: ['passcode']
        }
      }
    ];

    // Tool configuration for Gemini
    this.toolConfig = {
      functionCallingConfig: {
        mode: 'AUTO',
        allowedFunctionNames: this.functionDeclarations.map(f => f.name)
      }
    };

    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      tools: [{
        functionDeclarations: this.functionDeclarations
      }],
      toolConfig: this.toolConfig,
      systemInstruction: `You are FiNIX, an AI financial assistant integrated with Fi Money's MCP (Model Context Protocol) API. You help users understand and manage their personal finances.

Key capabilities:
- Access real-time financial data through Fi MCP API
- Provide personalized financial insights and recommendations
- Help with investment analysis, portfolio optimization, and financial planning
- Answer questions about net worth, mutual funds, stocks, loans, and credit cards

Important guidelines:
1. Always verify user authentication before accessing financial data
2. If user is not authenticated, guide them through the Fi MCP authentication process
3. Provide clear, actionable financial advice based on their actual data
4. Never make assumptions about financial data - always use the Fi MCP functions to get current information
5. Be helpful, professional, and maintain user privacy
6. When discussing financial advice, always remind users to consider their personal financial situation and consult with financial advisors for major decisions

Authentication flow:
1. User provides their Fi Money registered phone number
2. You initiate authentication which provides a login URL
3. User clicks the URL, enters their phone number, then gets a passcode from the Fi Money app
4. User provides the passcode to complete authentication
5. Once authenticated, you can access their financial data for 30 minutes

Always be encouraging and help users make better financial decisions!`
    });
  }

  /**
   * Send message to Gemini with function calling support
   * @param {string} message - User message
   * @param {string} userId - User ID for Fi MCP authentication
   * @param {Array} chatHistory - Previous chat history
   * @returns {string} AI response
   */
  async sendMessageToGemini(message, userId, chatHistory = []) {
    try {
      logger.info(`Processing message for user ${userId}: ${message.substring(0, 100)}...`);

      // Start chat with history
      const chat = this.model.startChat({
        history: chatHistory
      });

      // Send the message
      const result = await chat.sendMessage(message);
      const response = result.response;

      // Check if Gemini wants to call a function
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        logger.info(`Gemini requested ${functionCalls.length} function calls`);
        
        // Process all function calls
        const functionResponses = [];
        
        for (const functionCall of functionCalls) {
          try {
            const functionResult = await this.executeFunctionCall(functionCall, userId);
            functionResponses.push({
              name: functionCall.name,
              response: functionResult
            });
          } catch (error) {
            logger.error(`Function call ${functionCall.name} failed:`, error);
            functionResponses.push({
              name: functionCall.name,
              response: {
                error: error.message,
                success: false
              }
            });
          }
        }

        // Send function responses back to Gemini
        const followUpResult = await chat.sendMessage({
          functionResponses
        });

        const finalResponse = followUpResult.response;
        const textResponse = this.extractTextResponse(finalResponse);
        
        logger.logUserAction(userId, 'gemini_function_call_completed', {
          functionsUsed: functionCalls.map(fc => fc.name),
          responseLength: textResponse.length
        });

        return textResponse;
      } else {
        // No function calls, return direct response
        const textResponse = this.extractTextResponse(response);
        
        logger.logUserAction(userId, 'gemini_direct_response', {
          responseLength: textResponse.length
        });

        return textResponse;
      }

    } catch (error) {
      logger.error('Gemini service error:', error);
      throw new Error(`Failed to process your request: ${error.message}`);
    }
  }

  /**
   * Execute a function call requested by Gemini
   * @param {Object} functionCall - Function call object from Gemini
   * @param {string} userId - User ID for authentication
   * @returns {Object} Function execution result
   */
  async executeFunctionCall(functionCall, userId) {
    const { name, args } = functionCall;
    
    logger.info(`Executing function: ${name} for user: ${userId}`);

    switch (name) {
      case 'getNetWorth':
        return await fiMcpService.getNetWorth(userId);

      case 'getMutualFunds':
        return await fiMcpService.getMutualFunds(userId);

      case 'getStocks':
        return await fiMcpService.getStocks(userId);

      case 'getLoansAndCreditCards':
        return await fiMcpService.getLoansAndCreditCards(userId);

      case 'getPortfolioAnalysis':
        return await fiMcpService.getPortfolioAnalysis(userId);

      case 'initiateAuthentication':
        if (!args?.phoneNumber) {
          throw new Error('Phone number is required for authentication');
        }
        return await fiMcpService.initiateAuthentication(userId, args.phoneNumber);

      case 'completeAuthentication':
        if (!args?.passcode) {
          throw new Error('Passcode is required to complete authentication');
        }
        return await fiMcpService.completeAuthentication(userId, args.passcode);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  /**
   * Extract text response from Gemini response object
   * @param {Object} response - Gemini response object
   * @returns {string} Extracted text
   */
  extractTextResponse(response) {
    return response.text ||
           response.candidates?.[0]?.content?.parts?.[0]?.text ||
           'I apologize, but I couldn\'t generate a proper response. Please try again.';
  }

  /**
   * Check if user is authenticated with Fi MCP
   * @param {string} userId - User ID
   * @returns {boolean} Authentication status
   */
  isUserAuthenticated(userId) {
    return fiMcpService.isAuthenticated(userId);
  }

  /**
   * Get authentication status and guidance for user
   * @param {string} userId - User ID
   * @returns {Object} Authentication status and guidance
   */
  getAuthenticationStatus(userId) {
    const isAuthenticated = this.isUserAuthenticated(userId);
    
    return {
      authenticated: isAuthenticated,
      message: isAuthenticated 
        ? 'You are connected to Fi Money. I can access your financial data!'
        : 'To access your financial data, please connect your Fi Money account by providing your registered phone number.'
    };
  }
}

// Create singleton instance
const geminiService = new GeminiService();

module.exports = {
  sendMessageToGemini: (message, userId, chatHistory) => 
    geminiService.sendMessageToGemini(message, userId, chatHistory),
  isUserAuthenticated: (userId) => 
    geminiService.isUserAuthenticated(userId),
  getAuthenticationStatus: (userId) => 
    geminiService.getAuthenticationStatus(userId)
};
