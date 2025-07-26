const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const logger = require('../utils/logger');

/**
 * Fi MCP Service - Handles integration with Fi Money's Model Context Protocol API
 * Manages authentication, passcode flow, and financial data retrieval
 * Based on Fi MCP documentation: https://fi.money/features/getting-started-with-fi-mcp
 */

class FiMcpService {
  constructor() {
    this.mcpEndpoint = process.env.FI_MCP_ENDPOINT || 'https://mcp.fi.money:8080/mcp/stream';
    this.secretManagerClient = new SecretManagerServiceClient();
    this.userTokens = new Map(); // In-memory store for user tokens (30-min expiry)
    this.tokenExpiry = 30 * 60 * 1000; // 30 minutes in milliseconds
  }

  /**
   * Initiate Fi MCP authentication flow
   * @param {string} userId - User ID from Firebase
   * @param {string} phoneNumber - Fi registered phone number
   * @returns {Object} Response with login URL and instructions
   */
  async initiateAuthentication(userId, phoneNumber) {
    try {
      logger.logFiMCPInteraction(userId, 'initiate_auth', { phoneNumber });

      // Validate phone number format (basic validation)
      if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/\s+/g, ''))) {
        throw new Error('Invalid phone number format');
      }

      // Step 1: Request authentication with Fi MCP
      const authResponse = await axios.post(`${this.mcpEndpoint}/auth/initiate`, {
        phone: phoneNumber.replace(/\s+/g, ''),
        client: 'finix-ai-assistant'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 10000
      });

      const { loginUrl, sessionId } = authResponse.data;

      // Store session ID for this user
      this.userTokens.set(`${userId}_session`, {
        sessionId,
        timestamp: Date.now(),
        status: 'pending'
      });

      logger.logFiMCPInteraction(userId, 'auth_initiated', { 
        success: true, 
        sessionId: sessionId.substring(0, 8) + '...' 
      });

      return {
        success: true,
        loginUrl,
        sessionId,
        instructions: [
          '1. Click the login link to open Fi Money authentication',
          '2. Enter your Fi-registered phone number',
          '3. Open Fi Money app',
          '4. Navigate to Net Worth Dashboard > Talk to AI > Get Passcode',
          '5. Copy the passcode and provide it to continue'
        ]
      };

    } catch (error) {
      logger.error('Fi MCP authentication initiation failed:', error);
      logger.logFiMCPInteraction(userId, 'auth_initiate_failed', { 
        error: error.message 
      });

      throw new Error(`Failed to initiate Fi MCP authentication: ${error.message}`);
    }
  }

  /**
   * Complete Fi MCP authentication with passcode
   * @param {string} userId - User ID from Firebase
   * @param {string} passcode - Passcode from Fi Money app
   * @returns {Object} Authentication result with token
   */
  async completeAuthentication(userId, passcode) {
    try {
      logger.logFiMCPInteraction(userId, 'complete_auth', { passcode: 'provided' });

      // Validate passcode format (assuming 6-digit numeric)
      if (!passcode || !/^\d{6}$/.test(passcode)) {
        throw new Error('Invalid passcode format. Expected 6-digit numeric code.');
      }

      // Get session ID for this user
      const sessionData = this.userTokens.get(`${userId}_session`);
      if (!sessionData || sessionData.status !== 'pending') {
        throw new Error('No pending authentication session found. Please initiate authentication first.');
      }

      // Check session timeout (5 minutes for passcode entry)
      if (Date.now() - sessionData.timestamp > 5 * 60 * 1000) {
        this.userTokens.delete(`${userId}_session`);
        throw new Error('Authentication session expired. Please start again.');
      }

      // Step 2: Complete authentication with passcode
      const authResponse = await axios.post(`${this.mcpEndpoint}/auth/complete`, {
        sessionId: sessionData.sessionId,
        passcode: passcode
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 10000
      });

      const { token, expiresAt, netWorthSummary } = authResponse.data;

      // Store the authentication token
      this.userTokens.set(userId, {
        token,
        expiresAt: new Date(expiresAt),
        timestamp: Date.now(),
        netWorthSummary
      });

      // Clean up session data
      this.userTokens.delete(`${userId}_session`);

      logger.logFiMCPInteraction(userId, 'auth_completed', { 
        success: true,
        tokenExpiry: expiresAt
      });

      return {
        success: true,
        authenticated: true,
        expiresAt,
        netWorthSummary,
        message: 'Successfully authenticated with Fi MCP. You can now ask questions about your finances!'
      };

    } catch (error) {
      logger.error('Fi MCP authentication completion failed:', error);
      logger.logFiMCPInteraction(userId, 'auth_complete_failed', { 
        error: error.message 
      });

      // Clean up session on failure
      this.userTokens.delete(`${userId}_session`);

      throw new Error(`Failed to complete Fi MCP authentication: ${error.message}`);
    }
  }

  /**
   * Check if user has valid Fi MCP authentication
   * @param {string} userId - User ID from Firebase
   * @returns {boolean} True if authenticated and token is valid
   */
  isAuthenticated(userId) {
    const tokenData = this.userTokens.get(userId);
    if (!tokenData) return false;

    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      this.userTokens.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Get user's net worth data
   * @param {string} userId - User ID from Firebase
   * @returns {Object} Net worth data from Fi MCP
   */
  async getNetWorth(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('Fi MCP authentication required. Please authenticate first.');
    }

    try {
      const tokenData = this.userTokens.get(userId);
      
      const response = await axios.get(`${this.mcpEndpoint}/data/networth`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 15000
      });

      logger.logFiMCPInteraction(userId, 'get_networth', { success: true });
      
      return response.data;

    } catch (error) {
      logger.error('Fi MCP get net worth failed:', error);
      logger.logFiMCPInteraction(userId, 'get_networth_failed', { error: error.message });
      
      if (error.response?.status === 401) {
        this.userTokens.delete(userId);
        throw new Error('Fi MCP session expired. Please authenticate again.');
      }
      
      throw new Error(`Failed to fetch net worth data: ${error.message}`);
    }
  }

  /**
   * Get mutual fund holdings and performance
   * @param {string} userId - User ID from Firebase
   * @returns {Object} Mutual fund data from Fi MCP
   */
  async getMutualFunds(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('Fi MCP authentication required. Please authenticate first.');
    }

    try {
      const tokenData = this.userTokens.get(userId);
      
      const response = await axios.get(`${this.mcpEndpoint}/data/mutualfunds`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 15000
      });

      logger.logFiMCPInteraction(userId, 'get_mutual_funds', { success: true });
      
      return response.data;

    } catch (error) {
      logger.error('Fi MCP get mutual funds failed:', error);
      logger.logFiMCPInteraction(userId, 'get_mutual_funds_failed', { error: error.message });
      
      if (error.response?.status === 401) {
        this.userTokens.delete(userId);
        throw new Error('Fi MCP session expired. Please authenticate again.');
      }
      
      throw new Error(`Failed to fetch mutual fund data: ${error.message}`);
    }
  }

  /**
   * Get stock holdings (Indian and US)
   * @param {string} userId - User ID from Firebase
   * @returns {Object} Stock holdings data from Fi MCP
   */
  async getStocks(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('Fi MCP authentication required. Please authenticate first.');
    }

    try {
      const tokenData = this.userTokens.get(userId);
      
      const response = await axios.get(`${this.mcpEndpoint}/data/stocks`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 15000
      });

      logger.logFiMCPInteraction(userId, 'get_stocks', { success: true });
      
      return response.data;

    } catch (error) {
      logger.error('Fi MCP get stocks failed:', error);
      logger.logFiMCPInteraction(userId, 'get_stocks_failed', { error: error.message });
      
      if (error.response?.status === 401) {
        this.userTokens.delete(userId);
        throw new Error('Fi MCP session expired. Please authenticate again.');
      }
      
      throw new Error(`Failed to fetch stock data: ${error.message}`);
    }
  }

  /**
   * Get loan and credit card information
   * @param {string} userId - User ID from Firebase
   * @returns {Object} Loans and credit card data from Fi MCP
   */
  async getLoansAndCreditCards(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('Fi MCP authentication required. Please authenticate first.');
    }

    try {
      const tokenData = this.userTokens.get(userId);
      
      const response = await axios.get(`${this.mcpEndpoint}/data/liabilities`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 15000
      });

      logger.logFiMCPInteraction(userId, 'get_liabilities', { success: true });
      
      return response.data;

    } catch (error) {
      logger.error('Fi MCP get liabilities failed:', error);
      logger.logFiMCPInteraction(userId, 'get_liabilities_failed', { error: error.message });
      
      if (error.response?.status === 401) {
        this.userTokens.delete(userId);
        throw new Error('Fi MCP session expired. Please authenticate again.');
      }
      
      throw new Error(`Failed to fetch liability data: ${error.message}`);
    }
  }

  /**
   * Get comprehensive financial portfolio analysis
   * @param {string} userId - User ID from Firebase
   * @returns {Object} Complete financial analysis from Fi MCP
   */
  async getPortfolioAnalysis(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('Fi MCP authentication required. Please authenticate first.');
    }

    try {
      const tokenData = this.userTokens.get(userId);
      
      const response = await axios.get(`${this.mcpEndpoint}/data/analysis`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FiNIX-AI-Assistant/1.0.0'
        },
        timeout: 15000
      });

      logger.logFiMCPInteraction(userId, 'get_portfolio_analysis', { success: true });
      
      return response.data;

    } catch (error) {
      logger.error('Fi MCP get portfolio analysis failed:', error);
      logger.logFiMCPInteraction(userId, 'get_portfolio_analysis_failed', { error: error.message });
      
      if (error.response?.status === 401) {
        this.userTokens.delete(userId);
        throw new Error('Fi MCP session expired. Please authenticate again.');
      }
      
      throw new Error(`Failed to fetch portfolio analysis: ${error.message}`);
    }
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  cleanupExpiredTokens() {
    const now = new Date();
    for (const [userId, tokenData] of this.userTokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.userTokens.delete(userId);
        logger.info(`Cleaned up expired token for user: ${userId}`);
      }
    }
  }
}

// Create singleton instance
const fiMcpService = new FiMcpService();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  fiMcpService.cleanupExpiredTokens();
}, 5 * 60 * 1000);

module.exports = fiMcpService; 