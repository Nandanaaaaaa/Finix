const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Firebase Admin SDK initialization
 * Uses service account credentials automatically available on Cloud Run
 */

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production (Cloud Run), credentials are automatically available
      admin.initializeApp({
        projectId: process.env.GCP_PROJECT_ID,
      });
    } else {
      // For local development, use service account key
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : null;
      
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.GCP_PROJECT_ID,
        });
      } else {
        // Fallback to default credentials
        admin.initializeApp({
          projectId: process.env.GCP_PROJECT_ID,
        });
      }
    }
    
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Authentication middleware to verify Firebase ID tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.logSecurityEvent('missing_auth_header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header with Bearer token required'
      });
    }

    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      logger.logSecurityEvent('invalid_auth_format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format'
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || decodedToken.email,
      picture: decodedToken.picture,
      firebase: decodedToken
    };

    logger.logUserAction(req.user.uid, 'authenticated', {
      email: req.user.email,
      endpoint: req.path,
      method: req.method
    });

    next();
    
  } catch (error) {
    logger.logSecurityEvent('auth_verification_failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Your session has expired. Please sign in again.'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Token Revoked',
        message: 'Your session has been revoked. Please sign in again.'
      });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Invalid authentication token provided.'
      });
    }

    // Generic authentication error
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Unable to verify your identity. Please try signing in again.'
    });
  }
};

/**
 * Optional authentication middleware - allows both authenticated and anonymous users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // If auth header is present, verify it
    return authenticateUser(req, res, next);
  } else {
    // No auth header, continue as anonymous user
    req.user = null;
    logger.logUserAction('anonymous', 'api_access', {
      endpoint: req.path,
      method: req.method
    });
    next();
  }
};

/**
 * Get current authenticated user
 * @param {Object} req - Express request object
 * @returns {Object|null} User object or null if not authenticated
 */
const getCurrentUser = (req) => {
  return req.user || null;
};

module.exports = {
  authenticateUser,
  optionalAuth,
  getCurrentUser,
  admin
}; 