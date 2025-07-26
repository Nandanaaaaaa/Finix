/**
 * Environment Configuration
 * Centralized configuration for environment variables with fallbacks
 */

const config = {
  // Backend API URL
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  
  // Firebase Configuration
  FIREBASE: {
    API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
    AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: process.env.REACT_APP_FIREBASE_APP_ID
  },
  
  // App Configuration
  APP: {
    NAME: process.env.REACT_APP_NAME || 'FiNIX AI Assistant',
    VERSION: process.env.REACT_APP_VERSION || '1.0.0',
    ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development'
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_VOICE_INPUT: process.env.REACT_APP_ENABLE_VOICE_INPUT === 'true',
    ENABLE_CHARTS: process.env.REACT_APP_ENABLE_CHARTS !== 'false',
    ENABLE_EXPORT: process.env.REACT_APP_ENABLE_EXPORT === 'true'
  }
};

// Validation
const validateConfig = () => {
  const required = [
    'FIREBASE.API_KEY',
    'FIREBASE.AUTH_DOMAIN',
    'FIREBASE.PROJECT_ID'
  ];
  
  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    return !value;
  });
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
    console.warn('Please check your .env file configuration');
  }
};

// Validate on import
validateConfig();

export default config; 