const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Email and password are required'
    });
  }

  const db = getDatabase();
  
  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'server_error',
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Invalid email or password'
        });
      }

      try {
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({
            error: 'invalid_credentials',
            message: 'Invalid email or password'
          });
        }

        // Generate access token
        const accessToken = jwt.sign(
          {
            user_id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            scopes: getRoleScopes(user.role)
          },
          JWT_SECRET,
          { 
            expiresIn: '15m',
            issuer: 'ecommerce-auth-service',
            audience: 'ecommerce-api'
          }
        );

        res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 900,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });

      } catch (error) {
        res.status(500).json({
          error: 'server_error',
          message: 'Authentication failed'
        });
      }
    }
  );
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [req.user.user_id],
    (err, user) => {
      db.close();
      
      if (err || !user) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'User not found'
        });
      }

      res.json({
        user: {
          ...user,
          scopes: getRoleScopes(user.role)
        }
      });
    }
  );
});

// Validate token endpoint
router.post('/validate', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      valid: true,
      user: {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        scopes: decoded.scopes
      },
      expires_at: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (err) {
    res.status(401).json({
      valid: false,
      error: 'invalid_token',
      message: 'Token is invalid or expired'
    });
  }
});

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'access_denied',
      message: 'Access token is required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'invalid_token',
        message: 'Token is invalid or expired'
      });
    }
    req.user = user;
    next();
  });
}

// Helper function to get role-based scopes
function getRoleScopes(role) {
  const scopeMap = {
    admin: ['read', 'write', 'delete', 'admin', 'reports'],
    viewer: ['read', 'reports'],
    customer: ['read', 'purchase']
  };
  
  return scopeMap[role] || ['read'];
}

module.exports = router;
