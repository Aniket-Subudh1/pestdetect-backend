const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const detectionRoutes = require('./routes/detection');

const app = express();

connectDB();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, 
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
      return false; 
    }
    return false;
  }
});

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://192.168.0.192:8081',
      'exp://192.168.0.192:8081',
      'exp://localhost:8081',
    ];
    
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/detection', detectionRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rateLimit: {
      general: process.env.NODE_ENV === 'production' ? '100/15min' : '1000/15min',
      auth: process.env.NODE_ENV === 'production' ? '10/15min' : '100/15min'
    }
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/reset-rate-limit', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Rate limit reset (development mode only)'
    });
  });
}

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PestDetect API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    rateLimits: {
      general: process.env.NODE_ENV === 'production' ? '100 requests per 15 minutes' : '1000 requests per 15 minutes',
      authentication: process.env.NODE_ENV === 'production' ? '10 requests per 15 minutes' : '100 requests per 15 minutes'
    },
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        verifyEmail: 'POST /api/auth/verify-email',
        resendVerification: 'POST /api/auth/resend-verification',
        login: 'POST /api/auth/login',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        getProfile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password'
      },
      detection: {
        detectDisease: 'POST /api/detection/disease',
        detectPest: 'POST /api/detection/pest',
        getHistory: 'GET /api/detection/history',
        getStats: 'GET /api/detection/stats',
        getDetection: 'GET /api/detection/:id',
        deleteDetection: 'DELETE /api/detection/:id'
      },
      other: {
        health: 'GET /api/health',
        docs: 'GET /api',
        resetRateLimit: process.env.NODE_ENV !== 'production' ? 'POST /api/reset-rate-limit (dev only)' : 'Not available in production'
      }
    }
  });
});

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID'
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed'
    });
  }
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║           PestDetect API             ║
║                                      ║
║  🚀 Server running on port ${PORT}      ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║
║  📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}          ║
║  🛡️  Rate Limits: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} Mode    ║
║                                      ║
║  📖 API Documentation: /api          ║
║  ❤️  Health Check: /api/health       ║
╚══════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = app;