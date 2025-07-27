const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Import routes
const chatRoutes = require('./api/chat');
const authRoutes = require('./api/auth');

/**
 * FiNIX Express Application
 * Production-ready configuration with security, rate limiting, and comprehensive error handling
 */

const app = express();

// Trust proxy for rate limiting behind Cloud Run
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://mcp.fi.money", "https://identitytoolkit.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://finix-ai-assistant.web.app',
      'https://finix-ai-assistant.firebaseapp.com'
    ];
    
    // Add dynamic origins based on environment
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.logSecurityEvent('cors_blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    error: 'Rate Limit Exceeded',
    message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

// Apply rate limits
app.use('/api/chat', createRateLimit(60 * 1000, 30, 'Too many chat requests')); // 30 per minute
app.use('/api/auth', createRateLimit(60 * 1000, 10, 'Too many auth requests')); // 10 per minute
app.use(createRateLimit(15 * 60 * 1000, 1000, 'Too many requests')); // 1000 per 15 minutes globally

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  // Don't log health checks to reduce noise
  if (req.path !== '/health') {
    logger.info('Request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'finix-backend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8081
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FiNIX AI Assistant Backend',
    description: 'AI-powered financial assistant with Fi Money MCP integration',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      authentication: '/api/auth',
      chat: '/api/chat'
    },
    documentation: 'https://github.com/finix-ai/backend/blob/main/README.md',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.logSecurityEvent('endpoint_not_found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Endpoint Not Found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /health',
      'GET /api/auth/status',
      'POST /api/auth/fi-mcp/initiate',
      'POST /api/auth/fi-mcp/complete',
      'POST /api/chat',
      'GET /api/chat/status'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Log the error
  logger.error('Application error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body is too large'
    });
  }

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Your domain is not allowed to access this API'
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment 
      ? error.message 
      : 'An unexpected error occurred. Please try again.',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason.toString(),
    stack: reason.stack,
    promise: promise.toString()
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Exit gracefully
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

logger.info('FiNIX backend application initialized', {
  environment: process.env.NODE_ENV || 'development',
  gcpProject: process.env.GCP_PROJECT_ID || 'not-set',
  version: process.env.npm_package_version || '1.0.0'
});

module.exports = app;
