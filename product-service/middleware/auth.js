const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Middleware to authenticate JWT tokens via auth service
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'access_denied',
      message: 'Access token is required'
    });
  }

  try {
    // Validate token with auth service
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, {
      token: token
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({
        error: 'invalid_token',
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(401).json({
      error: 'authentication_failed',
      message: 'Unable to validate token'
    });
  }
};

// Middleware to check if user has required scopes
const authorizeScopes = (requiredScopes) => {
  return (req, res, next) => {
    if (!req.user || !req.user.scopes) {
      return res.status(403).json({
        error: 'insufficient_scope',
        message: 'User scopes not found'
      });
    }

    const userScopes = req.user.scopes;
    const hasRequiredScope = requiredScopes.some(scope => userScopes.includes(scope));

    if (!hasRequiredScope) {
      return res.status(403).json({
        error: 'insufficient_scope',
        message: `Required scopes: ${requiredScopes.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to check if user has specific role
const authorizeRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        error: 'access_denied',
        message: 'User role not found'
      });
    }

    const userRole = req.user.role;
    const hasRequiredRole = Array.isArray(requiredRoles) 
      ? requiredRoles.includes(userRole)
      : requiredRoles === userRole;

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'access_denied',
        message: `Required role: ${Array.isArray(requiredRoles) ? requiredRoles.join(' or ') : requiredRoles}`
      });
    }

    next();
  };
};

// Middleware to check resource ownership (for customers)
const authorizeResourceOwner = (req, res, next) => {
  // Admin can access all resources
  if (req.user.role === 'admin') {
    return next();
  }

  // For customers, check if they own the resource
  if (req.user.role === 'customer') {
    const resourceUserId = req.params.userId || req.body.user_id || req.query.user_id;
    
    if (resourceUserId && parseInt(resourceUserId) !== req.user.user_id) {
      return res.status(403).json({
        error: 'access_denied',
        message: 'You can only access your own resources'
      });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeScopes,
  authorizeRole,
  authorizeResourceOwner
};
