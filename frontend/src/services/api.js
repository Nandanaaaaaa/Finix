import axios from 'axios';
import config from '../config/environment';

/**
 * Enhanced API Service for FiNIX Backend Integration
 * Handles all communication with the backend including authentication, chat, and Fi MCP operations
 */

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('firebase_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('firebase_token');
      window.location.reload(); // Force re-authentication
    }
    
    // Log error for debugging
    console.error('API Error:', error.response?.data || error.message);
    
    return Promise.reject(error);
  }
);

/**
 * Authentication API Calls
 */

// Get authentication status
export const getAuthStatus = async () => {
  try {
    const response = await api.get('/api/auth/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get authentication status');
  }
};

// Get user information
export const getUserInfo = async () => {
  try {
    const response = await api.get('/api/auth/user');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get user information');
  }
};

// Initiate Fi MCP authentication
export const initiateFiMcpAuth = async (phoneNumber) => {
  try {
    const response = await api.post('/api/auth/fi-mcp/initiate', {
      phoneNumber
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to initiate Fi MCP authentication');
  }
};

// Complete Fi MCP authentication
export const completeFiMcpAuth = async (passcode) => {
  try {
    const response = await api.post('/api/auth/fi-mcp/complete', {
      passcode
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to complete Fi MCP authentication');
  }
};

// Get Fi MCP status
export const getFiMcpStatus = async () => {
  try {
    const response = await api.get('/api/auth/fi-mcp/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get Fi MCP status');
  }
};

// Disconnect Fi MCP
export const disconnectFiMcp = async () => {
  try {
    const response = await api.post('/api/auth/fi-mcp/disconnect');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to disconnect Fi MCP');
  }
};

/**
 * Chat API Calls
 */

// Send message to AI assistant
export const sendMessage = async (message, chatHistory = []) => {
  try {
    const response = await api.post('/api/chat', {
      message,
      chatHistory
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send message');
  }
};

// Get chat status and capabilities
export const getChatStatus = async () => {
  try {
    const response = await api.get('/api/chat/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get chat status');
  }
};

// Get chat suggestions
export const getChatSuggestions = async () => {
  try {
    const response = await api.get('/api/chat/suggestions');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get chat suggestions');
  }
};

// Clear chat history
export const clearChatHistory = async () => {
  try {
    const response = await api.post('/api/chat/clear-history');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to clear chat history');
  }
};

/**
 * Health Check
 */

// Check backend health
export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Backend is not responding');
  }
};

/**
 * Utility Functions
 */

// Update Firebase token in localStorage and axios headers
export const updateAuthToken = (token) => {
  if (token) {
    localStorage.setItem('firebase_token', token);
  } else {
    localStorage.removeItem('firebase_token');
  }
};

// Check if backend is available
export const isBackendAvailable = async () => {
  try {
    await checkBackendHealth();
    return true;
  } catch (error) {
    return false;
  }
};

// Legacy function for backward compatibility
export const sendMessageToBackend = async (message, token) => {
  if (token) {
    updateAuthToken(token);
  }
  return sendMessage(message);
};

export default api;