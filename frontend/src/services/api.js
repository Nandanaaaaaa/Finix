import axios from 'axios';
import { getAuth } from 'firebase/auth';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add Firebase ID token
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const token = await user.getIdToken();
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Fi MCP session ID if available
  const fiMcpSession = localStorage.getItem('fiMcpSession');
  if (fiMcpSession) {
    const { sessionId } = JSON.parse(fiMcpSession);
    if (sessionId) {
      config.headers['Mcp-Session-Id'] = sessionId;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
    console.error('API Error:', errorMessage);
    throw new Error(errorMessage);
  }
);

// Authentication APIs
export const initiatePhoneFiMcp = async (phoneNumber) => {
  return await api.post('/auth/fi-mcp/initiate', { phoneNumber });
};

export const completePhoneFiMcp = async (passcode) => {
  return await api.post('/auth/fi-mcp/complete', { passcode });
};

export const getAuthStatus = async () => {
  return await api.get('/auth/status');
};

// Backend health check
export const checkBackendHealth = async () => {
  // Use the root health endpoint, not /api/health
  const response = await axios.get('http://localhost:8081/health');
  return response.data;
};

// MCP server status and data query
export const queryFiMcpData = async () => {
  return await api.get('/auth/fi-mcp/query-data');
};

export const checkMcpServerStatus = async () => {
  return await api.get('/auth/fi-mcp/mcp-status');
};

// Chat API Calls
export const sendMessage = async (message, chatHistory = []) => {
  return await api.post('/chat', {
    message,
    chatHistory
  });
};

export const getChatStatus = async () => {
  return await api.get('/chat/status');
};

export const getChatSuggestions = async () => {
  return await api.get('/chat/suggestions');
};

export const clearChatHistory = async () => {
  return await api.post('/chat/clear-history');
};

export default api;