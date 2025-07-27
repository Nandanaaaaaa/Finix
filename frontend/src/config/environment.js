/**
 * Environment Configuration for FiNIX Frontend
 * Centralized configuration management with validation
 */

const environment = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8081',
  
  // Firebase Configuration
  FIREBASE: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  },

  // App Configuration
  APP: {
    name: 'FiNIX',
    version: '1.0.0',
    description: 'AI-powered financial assistant with Fi Money integration'
  },

  // Feature Flags
  FEATURES: {
    enableChat: true,
    enableFiMcpAuth: true,
    enableSuggestions: true,
    enableErrorReporting: true
  },

  // Development Settings
  DEVELOPMENT: {
    enableDebugLogs: process.env.NODE_ENV === 'development',
    enableMockData: false,
    enablePerformanceMonitoring: true
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('Missing required environment variables:', missingVars);
  console.warn('Please check your .env file and ensure all required variables are set.');
}

// Validate Firebase project ID matches backend
if (process.env.REACT_APP_FIREBASE_PROJECT_ID !== 'finix-467107') {
  console.warn('Firebase project ID mismatch!');
  console.warn('Frontend project ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
  console.warn('Expected project ID: finix-467107');
  console.warn('Please update your .env file to use the correct Firebase project.');
}

export default environment; 