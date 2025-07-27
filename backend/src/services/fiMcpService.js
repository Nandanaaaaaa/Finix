const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const logger = require('../utils/logger');

/**
 * Fi MCP Service - Handles integration with Fi Money's Model Context Protocol
 * Based on official documentation: https://fi.money/features/getting-started-with-fi-mcp
 * 
 * This service connects to the Fi MCP Development Server for testing
 */

class FiMcpService {
  constructor() {
    // Fi MCP Development Server endpoint
    this.mcpEndpoint = 'http://localhost:8080/mcp/stream';
    this.secretManagerClient = new SecretManagerServiceClient();
    this.userSessions = new Map(); // Store session IDs for users
    this.sessionExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Generate a unique session ID for MCP connection
   */
  generateSessionId() {
    return `mcp-session-${require('crypto').randomUUID()}`;
  }

  /**
   * Make MCP protocol call to the Fi MCP server
   */
  async makeMcpCall(sessionId, method, params = {}) {
    try {
      const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: method,
        params: params
      };

      const response = await axios.post(this.mcpEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': sessionId
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('MCP call failed:', error.response?.data || error.message);
      throw new Error(`MCP call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Initiate Fi MCP authentication flow
   * Creates a session and returns login URL
   */
  async initiateAuthentication(userId, phoneNumber) {
    try {
      logger.logFiMCPInteraction(userId, 'initiate_auth', { phoneNumber });

      // Validate phone number format
      if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/\s+/g, ''))) {
        throw new Error('Invalid phone number format. Please enter a valid phone number.');
      }

      // Generate session ID for this user
      const sessionId = this.generateSessionId();
      
      // Store session data
      const sessionData = {
        sessionId,
        phoneNumber: phoneNumber.replace(/\s+/g, ''),
        timestamp: Date.now(),
        status: 'pending'
      };
      
      this.userSessions.set(userId, sessionData);
      
      logger.logFiMCPInteraction(userId, 'auth_initiated', { 
        success: true, 
        phoneNumber: phoneNumber.replace(/\s+/g, ''),
        sessionId
      });

      return {
        success: true,
        sessionId,
        loginUrl: `http://localhost:8080/mockWebPage?sessionId=${sessionId}`,
        instructions: [
          '✅ Phone number validated successfully!',
          '',
          '📱 **Next Steps:**',
          '1. Click the login link below',
          '2. Enter your phone number on the login page',
          '3. Use any OTP (e.g., 123456)',
          '4. Return here and click "Complete Authentication"',
          '',
          '🔗 **Login Link:**',
          `http://localhost:8080/mockWebPage?sessionId=${sessionId}`,
          '',
          '⏰ **Note:** Session expires in 30 minutes'
        ],
        phoneNumber: phoneNumber.replace(/\s+/g, '')
      };

    } catch (error) {
      logger.error('Fi MCP authentication initiation failed:', error);
      logger.logFiMCPInteraction(userId, 'auth_initiate_failed', { 
        error: error.message 
      });

      throw new Error(`Authentication initiation failed: ${error.message}`);
    }
  }

  /**
   * Complete Fi MCP authentication by testing the session
   */
  async completeAuthentication(userId, passcode) {
    try {
      logger.logFiMCPInteraction(userId, 'complete_auth', { passcode: 'provided' });

      // Get session data for this user
      const sessionData = this.userSessions.get(userId);
      if (!sessionData || sessionData.status !== 'pending') {
        throw new Error('No pending authentication session found. Please initiate authentication first.');
      }

      // Check session timeout
      if (Date.now() - sessionData.timestamp > this.sessionExpiry) {
        this.userSessions.delete(userId);
        throw new Error('Authentication session expired. Please start again.');
      }

      // Test the session by making a simple MCP call
      const testResult = await this.makeMcpCall(sessionData.sessionId, 'tools/list', {});
      
      if (testResult.error) {
        throw new Error('Session not authenticated. Please complete login on the MCP server first.');
      }

      // Update session status
      sessionData.status = 'authenticated';
      sessionData.authenticatedAt = Date.now();

      logger.logFiMCPInteraction(userId, 'auth_completed', { 
        success: true, 
        phoneNumber: sessionData.phoneNumber 
      });

      return {
        success: true,
        message: 'Fi MCP authentication completed successfully!',
        sessionId: sessionData.sessionId,
        expiresIn: this.sessionExpiry,
        phoneNumber: sessionData.phoneNumber
      };

    } catch (error) {
      logger.error('Fi MCP authentication completion failed:', error);
      logger.logFiMCPInteraction(userId, 'auth_complete_failed', { 
        error: error.message 
      });

      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if user is authenticated with Fi MCP
   */
  isAuthenticated(userId) {
    const sessionData = this.userSessions.get(userId);
    if (!sessionData || sessionData.status !== 'authenticated') {
      return false;
    }

    // Check if session is expired
    if (Date.now() - sessionData.authenticatedAt > this.sessionExpiry) {
      this.userSessions.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Get user's net worth data from Fi MCP server
   */
  async getNetWorth(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_net_worth');

      const sessionData = this.userSessions.get(userId);
      const result = await this.makeMcpCall(sessionData.sessionId, 'tools/call', {
        name: 'fetch_net_worth',
        arguments: {}
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch net worth');
      }

      logger.logFiMCPInteraction(userId, 'net_worth_retrieved', { success: true });
      return result.result;

    } catch (error) {
      logger.error('Failed to get net worth:', error);
      logger.logFiMCPInteraction(userId, 'net_worth_failed', { error: error.message });
      throw new Error(`Failed to get net worth: ${error.message}`);
    }
  }

  /**
   * Get user's mutual funds data from Fi MCP server
   */
  async getMutualFunds(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_mutual_funds');

      const sessionData = this.userSessions.get(userId);
      const result = await this.makeMcpCall(sessionData.sessionId, 'tools/call', {
        name: 'fetch_mutual_fund_transactions',
        arguments: {}
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch mutual funds');
      }

      logger.logFiMCPInteraction(userId, 'mutual_funds_retrieved', { success: true });
      return result.result;

    } catch (error) {
      logger.error('Failed to get mutual funds:', error);
      logger.logFiMCPInteraction(userId, 'mutual_funds_failed', { error: error.message });
      throw new Error(`Failed to get mutual funds: ${error.message}`);
    }
  }

  /**
   * Get user's bank transactions from Fi MCP server
   */
  async getBankTransactions(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_bank_transactions');

      const sessionData = this.userSessions.get(userId);
      const result = await this.makeMcpCall(sessionData.sessionId, 'tools/call', {
        name: 'fetch_bank_transactions',
        arguments: {}
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch bank transactions');
      }

      logger.logFiMCPInteraction(userId, 'bank_transactions_retrieved', { success: true });
      return result.result;

    } catch (error) {
      logger.error('Failed to get bank transactions:', error);
      logger.logFiMCPInteraction(userId, 'bank_transactions_failed', { error: error.message });
      throw new Error(`Failed to get bank transactions: ${error.message}`);
    }
  }

  /**
   * Get user's EPF details from Fi MCP server
   */
  async getEpfDetails(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_epf_details');

      const sessionData = this.userSessions.get(userId);
      const result = await this.makeMcpCall(sessionData.sessionId, 'tools/call', {
        name: 'fetch_epf_details',
        arguments: {}
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch EPF details');
      }

      logger.logFiMCPInteraction(userId, 'epf_details_retrieved', { success: true });
      return result.result;

    } catch (error) {
      logger.error('Failed to get EPF details:', error);
      logger.logFiMCPInteraction(userId, 'epf_details_failed', { error: error.message });
      throw new Error(`Failed to get EPF details: ${error.message}`);
    }
  }

  /**
   * Get user's credit report from Fi MCP server
   */
  async getCreditReport(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_credit_report');

      const sessionData = this.userSessions.get(userId);
      const result = await this.makeMcpCall(sessionData.sessionId, 'tools/call', {
        name: 'fetch_credit_report',
        arguments: {}
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch credit report');
      }

      logger.logFiMCPInteraction(userId, 'credit_report_retrieved', { success: true });
      return result.result;

    } catch (error) {
      logger.error('Failed to get credit report:', error);
      logger.logFiMCPInteraction(userId, 'credit_report_failed', { error: error.message });
      throw new Error(`Failed to get credit report: ${error.message}`);
    }
  }

  /**
   * Get comprehensive portfolio analysis
   */
  async getPortfolioAnalysis(userId) {
    if (!this.isAuthenticated(userId)) {
      throw new Error('User not authenticated with Fi MCP');
    }

    try {
      logger.logFiMCPInteraction(userId, 'get_portfolio_analysis');

      // Get all available data
      const [netWorth, mutualFunds, bankTransactions, epfDetails] = await Promise.allSettled([
        this.getNetWorth(userId),
        this.getMutualFunds(userId),
        this.getBankTransactions(userId),
        this.getEpfDetails(userId)
      ]);

      const analysis = {
        summary: {
          netWorth: netWorth.status === 'fulfilled' ? netWorth.value : null,
          mutualFunds: mutualFunds.status === 'fulfilled' ? mutualFunds.value : null,
          bankTransactions: bankTransactions.status === 'fulfilled' ? bankTransactions.value : null,
          epfDetails: epfDetails.status === 'fulfilled' ? epfDetails.value : null
        },
        availableData: {
          netWorth: netWorth.status === 'fulfilled',
          mutualFunds: mutualFunds.status === 'fulfilled',
          bankTransactions: bankTransactions.status === 'fulfilled',
          epfDetails: epfDetails.status === 'fulfilled'
        },
        lastUpdated: new Date().toISOString()
      };

      logger.logFiMCPInteraction(userId, 'portfolio_analysis_retrieved', { success: true });
      return analysis;

    } catch (error) {
      logger.error('Failed to get portfolio analysis:', error);
      logger.logFiMCPInteraction(userId, 'portfolio_analysis_failed', { error: error.message });
      throw new Error(`Failed to get portfolio analysis: ${error.message}`);
    }
  }

  /**
   * Disconnect Fi MCP authentication
   */
  disconnect(userId) {
    try {
      this.userSessions.delete(userId);
      logger.logFiMCPInteraction(userId, 'disconnected', { success: true });
      return { success: true, message: 'Fi MCP disconnected successfully' };
    } catch (error) {
      logger.error('Failed to disconnect Fi MCP:', error);
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Test MCP server connection
   */
  async testMcpConnection() {
    try {
      console.log('=== MCP SERVER CONNECTION TEST ===');
      console.log('MCP Endpoint:', this.mcpEndpoint);
      
      // Test basic connection
      const response = await axios.get('http://localhost:8080/health', {
        timeout: 10000
      });
      
      console.log('MCP Server Health Response:', response.status, response.data);
      return {
        connected: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error('MCP Server Connection Failed:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Query stored session data (for debugging/verification)
   */
  queryStoredData(userId) {
    const sessionData = this.userSessions.get(userId);
    
    console.log('=== SESSION DATA QUERY ===');
    console.log('User ID:', userId);
    console.log('Session Data:', sessionData);
    console.log('All Sessions:', Array.from(this.userSessions.entries()));
    console.log('=== END QUERY ===');
    
    return {
      sessionData,
      allSessions: Array.from(this.userSessions.entries())
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [userId, sessionData] of this.userSessions.entries()) {
      if (now - sessionData.timestamp > this.sessionExpiry) {
        this.userSessions.delete(userId);
        logger.info(`Cleaned up expired session for user: ${userId}`);
      }
    }
  }
}

module.exports = new FiMcpService(); 