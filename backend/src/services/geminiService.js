const { VertexAI } = require('@google-cloud/vertexai');
const fiMcpService = require('./fiMcpService');
const logger = require('../utils/logger');

/**
 * Gemini AI Service for FiNIX
 * Integrates with Google's Vertex AI Gemini model for financial analysis
 */

class GeminiService {
  constructor() {
    try {
      this.vertexAI = new VertexAI({
        project: process.env.GCP_PROJECT_ID,
        location: process.env.GCP_LOCATION || 'us-central1'
      });

      this.model = this.vertexAI.preview.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generation_config: {
          max_output_tokens: 2048,
          temperature: 0.7,
          top_p: 0.8,
          top_k: 40
        }
      });

      // Define available functions for Gemini
      this.functionDeclarations = [
        {
          name: 'getNetWorth',
          description: 'Get user\'s current net worth and financial overview',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'getMutualFunds',
          description: 'Get user\'s mutual fund portfolio and transactions',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'getBankTransactions',
          description: 'Get user\'s bank account transactions',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'getEpfDetails',
          description: 'Get user\'s EPF (Employee Provident Fund) details',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'getCreditReport',
          description: 'Get user\'s credit report and score',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'getPortfolioAnalysis',
          description: 'Get comprehensive portfolio analysis and recommendations',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'initiateAuthentication',
          description: 'Initiate Fi MCP authentication for a user',
          parameters: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID from Firebase authentication'
              },
              phoneNumber: {
                type: 'string',
                description: 'Phone number registered with Fi Money'
              }
            },
            required: ['userId', 'phoneNumber']
          }
        }
      ];

      // System instruction for Gemini
      this.systemInstruction = `You are FiNIX, an AI financial assistant powered by Fi Money's Model Context Protocol (MCP).

Your capabilities include:
- Analyzing net worth and financial health
- Reviewing mutual fund portfolios and performance
- Examining bank transactions and spending patterns
- Checking EPF (Employee Provident Fund) details
- Accessing credit reports and scores
- Providing comprehensive portfolio analysis

IMPORTANT GUIDELINES:
1. Always verify user authentication before accessing financial data
2. Use the available functions to fetch real-time data from Fi MCP
3. Provide actionable financial insights and recommendations
4. Be conversational but professional
5. Explain financial concepts clearly
6. Suggest improvements based on the data
7. Respect user privacy and data security

When users ask about their finances, automatically fetch the relevant data using the appropriate functions.`;

      // Store authentication status
      this.userAuthStatus = new Map();
      
      logger.info('GeminiService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GeminiService:', error);
      // Initialize with fallback values
      this.userAuthStatus = new Map();
      this.functionDeclarations = [];
      this.systemInstruction = '';
    }
  }

  /**
   * Get authentication status for a user
   */
  getAuthenticationStatus(userId) {
    // Ensure userAuthStatus is initialized
    if (!this.userAuthStatus) {
      this.userAuthStatus = new Map();
    }
    
    const isAuthenticated = fiMcpService.isAuthenticated(userId);
    this.userAuthStatus.set(userId, isAuthenticated);
    
    return {
      authenticated: isAuthenticated,
      message: isAuthenticated 
        ? 'Fi MCP connection is active'
        : 'Fi MCP authentication required',
      instructions: isAuthenticated 
        ? null 
        : [
            '1. Provide your Fi Money registered phone number',
            '2. Complete authentication on the MCP server',
            '3. Return to chat to access your financial data'
          ]
    };
  }

  /**
   * Execute a function call based on Gemini's request
   */
  async executeFunctionCall(functionName, functionArgs) {
    const { userId } = functionArgs;
    
    try {
      logger.logUserAction(userId, 'gemini_function_call', { functionName });

      switch (functionName) {
        case 'getNetWorth':
          return await fiMcpService.getNetWorth(userId);
          
        case 'getMutualFunds':
          return await fiMcpService.getMutualFunds(userId);
          
        case 'getBankTransactions':
          return await fiMcpService.getBankTransactions(userId);
          
        case 'getEpfDetails':
          return await fiMcpService.getEpfDetails(userId);
          
        case 'getCreditReport':
          return await fiMcpService.getCreditReport(userId);
          
        case 'getPortfolioAnalysis':
          return await fiMcpService.getPortfolioAnalysis(userId);
          
        case 'initiateAuthentication':
          const { phoneNumber } = functionArgs;
          return await fiMcpService.initiateAuthentication(userId, phoneNumber);
          
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error) {
      logger.error(`Function call failed: ${functionName}`, error);
      throw error;
    }
  }

  /**
   * Process user message with Gemini AI
   */
  async processMessage(userId, message, chatHistory = []) {
    try {
      logger.logUserAction(userId, 'chat_message', { messageLength: message.length });

      // Check authentication status
      const authStatus = this.getAuthenticationStatus(userId);
      
      // Prepare conversation history
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Create chat session
      const chat = this.model.startChat({
        history: conversationHistory,
        generation_config: {
          max_output_tokens: 2048,
          temperature: 0.7
        },
        tools: this.functionDeclarations
      });

      // Send message and get response
  const result = await chat.sendMessage(message);
      const response = await result.response;
      
      // Check if Gemini wants to call a function
      if (response.candidates[0].content.parts[0].functionCall) {
        const functionCall = response.candidates[0].content.parts[0].functionCall;
        
        logger.logUserAction(userId, 'gemini_function_request', { 
          functionName: functionCall.name 
        });

        // Execute the function
        const functionResult = await this.executeFunctionCall(
          functionCall.name, 
          functionCall.args
        );

        // Send function result back to Gemini
        const finalResult = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: {
                name: functionCall.name,
                content: JSON.stringify(functionResult)
              }
            }
          }
        ]);

        const finalResponse = await finalResult.response;
        const responseText = finalResponse.candidates[0].content.parts[0].text;

        logger.logUserAction(userId, 'chat_response_with_function', { 
          functionName: functionCall.name,
          responseLength: responseText.length 
        });

        return {
          success: true,
          message: responseText,
          functionCalled: functionCall.name,
          data: functionResult
        };
      } else {
        // Simple text response
        const responseText = response.candidates[0].content.parts[0].text;
        
        logger.logUserAction(userId, 'chat_response', { 
          responseLength: responseText.length 
        });

        return {
          success: true,
          message: responseText,
          functionCalled: null,
          data: null
        };
      }

    } catch (error) {
      logger.error('Gemini message processing failed:', error);
      
      // Handle authentication errors
      if (error.message.includes('not authenticated')) {
        return {
          success: false,
          message: `I need access to your Fi Money account to help with that. Please connect your account first by clicking "Connect Fi Money" in the sidebar.`,
          requiresAuth: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        message: 'Sorry, I encountered an error while processing your request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Get chat suggestions based on authentication status
   */
  getChatSuggestions(userId) {
    const isAuthenticated = fiMcpService.isAuthenticated(userId);
    
    if (isAuthenticated) {
      return [
        "What's my current net worth?",
        "Show me my mutual fund portfolio",
        "Analyze my bank transactions",
        "What's my EPF balance?",
        "Give me a portfolio analysis",
        "How can I improve my financial health?"
      ];
    } else {
      return [
        "Connect my Fi Money account",
        "How does FiNIX work?",
        "What financial data can you access?",
        "Is my data secure?"
      ];
    }
  }

  /**
   * Get chat status and capabilities
   */
  getChatStatus(userId) {
    const authStatus = this.getAuthenticationStatus(userId);
    
    return {
      available: true,
      authenticated: authStatus.authenticated,
      capabilities: [
        'Net worth analysis',
        'Mutual fund portfolio review',
        'Bank transaction analysis',
        'EPF details',
        'Credit report access',
        'Portfolio recommendations'
      ],
      requiresAuth: !authStatus.authenticated,
      message: authStatus.message
    };
  }
}

module.exports = new GeminiService();
