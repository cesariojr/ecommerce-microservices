const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

// OAuth 2.0 Authorization Endpoint
router.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  // Validate required parameters
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing or invalid parameters'
    });
  }

  // Validate client
  const db = getDatabase();
  db.get(
    'SELECT * FROM oauth_clients WHERE client_id = ?',
    [client_id],
    (err, client) => {
      if (err || !client) {
        db.close();
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Invalid client_id'
        });
      }

      // Check redirect URI
      const allowedUris = client.redirect_uris.split(',');
      if (!allowedUris.includes(redirect_uri)) {
        db.close();
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri'
        });
      }

      db.close();

      // Return authorization page data (in real app, this would render a login form)
      res.json({
        message: 'Authorization required',
        client_name: client.name,
        scopes: scope ? scope.split(' ') : ['read'],
        authorize_url: `/oauth/authorize/confirm`,
        params: { client_id, redirect_uri, scope, state }
      });
    }
  );
});

// OAuth 2.0 Authorization Confirmation (after user login)
router.post('/authorize/confirm', (req, res) => {
  const { client_id, redirect_uri, scope, state, user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      error: 'access_denied',
      error_description: 'User authentication required'
    });
  }

  // Generate authorization code
  const authCode = uuidv4();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const db = getDatabase();
  db.run(
    `INSERT INTO auth_codes 
     (code, client_id, user_id, scopes, redirect_uri, expires_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [authCode, client_id, user_id, scope || 'read', redirect_uri, expiresAt.toISOString()],
    function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to generate authorization code'
        });
      }

      // Redirect with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);

      res.json({
        redirect_url: redirectUrl.toString(),
        code: authCode
      });
    }
  );
});

// OAuth 2.0 Token Endpoint
router.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token } = req.body;

  if (grant_type === 'authorization_code') {
    handleAuthorizationCodeGrant(req, res);
  } else if (grant_type === 'refresh_token') {
    handleRefreshTokenGrant(req, res);
  } else if (grant_type === 'client_credentials') {
    handleClientCredentialsGrant(req, res);
  } else {
    res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Grant type not supported'
    });
  }
});

const handleAuthorizationCodeGrant = (req, res) => {
  const { code, redirect_uri, client_id, client_secret } = req.body;

  const db = getDatabase();
  
  // Validate authorization code
  db.get(
    `SELECT ac.*, u.email, u.role, u.name 
     FROM auth_codes ac 
     JOIN users u ON ac.user_id = u.id 
     WHERE ac.code = ? AND ac.client_id = ? AND ac.redirect_uri = ? AND ac.used = FALSE`,
    [code, client_id, redirect_uri],
    (err, authCode) => {
      if (err || !authCode) {
        db.close();
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        });
      }

      // Check if code is expired
      if (new Date() > new Date(authCode.expires_at)) {
        db.close();
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        });
      }

      // Mark code as used
      db.run('UPDATE auth_codes SET used = TRUE WHERE code = ?', [code]);

      // Generate tokens
      const accessToken = generateAccessToken({
        user_id: authCode.user_id,
        email: authCode.email,
        role: authCode.role,
        name: authCode.name,
        scopes: authCode.scopes.split(' ')
      });

      const refreshToken = uuidv4();
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

      // Store refresh token
      db.run(
        `INSERT INTO refresh_tokens 
         (token, user_id, client_id, scopes, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [refreshToken, authCode.user_id, client_id, authCode.scopes, refreshExpiresAt.toISOString()],
        (err) => {
          db.close();
          
          if (err) {
            return res.status(500).json({
              error: 'server_error',
              error_description: 'Failed to generate refresh token'
            });
          }

          res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 900, // 15 minutes
            refresh_token: refreshToken,
            scope: authCode.scopes
          });
        }
      );
    }
  );
};

const handleRefreshTokenGrant = (req, res) => {
  const { refresh_token } = req.body;

  const db = getDatabase();
  
  db.get(
    `SELECT rt.*, u.email, u.role, u.name 
     FROM refresh_tokens rt 
     JOIN users u ON rt.user_id = u.id 
     WHERE rt.token = ? AND rt.revoked = FALSE`,
    [refresh_token],
    (err, token) => {
      if (err || !token) {
        db.close();
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token'
        });
      }

      // Check if token is expired
      if (new Date() > new Date(token.expires_at)) {
        db.close();
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Refresh token expired'
        });
      }

      // Revoke old refresh token
      db.run('UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?', [refresh_token]);

      // Generate new tokens
      const accessToken = generateAccessToken({
        user_id: token.user_id,
        email: token.email,
        role: token.role,
        name: token.name,
        scopes: token.scopes.split(' ')
      });

      const newRefreshToken = uuidv4();
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

      // Store new refresh token
      db.run(
        `INSERT INTO refresh_tokens 
         (token, user_id, client_id, scopes, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [newRefreshToken, token.user_id, token.client_id, token.scopes, refreshExpiresAt.toISOString()],
        (err) => {
          db.close();
          
          if (err) {
            return res.status(500).json({
              error: 'server_error',
              error_description: 'Failed to generate new refresh token'
            });
          }

          res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 900,
            refresh_token: newRefreshToken,
            scope: token.scopes
          });
        }
      );
    }
  );
};

const handleClientCredentialsGrant = (req, res) => {
  const { client_id, client_secret, scope } = req.body;

  const db = getDatabase();
  
  db.get(
    'SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ?',
    [client_id, client_secret],
    (err, client) => {
      db.close();
      
      if (err || !client) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }

      // Generate access token for client
      const accessToken = generateAccessToken({
        client_id: client.client_id,
        client_name: client.name,
        scopes: scope ? scope.split(' ') : ['read'],
        token_type: 'client_credentials'
      });

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600, // 1 hour for client credentials
        scope: scope || 'read'
      });
    }
  );
};

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ecommerce-auth-service',
    audience: 'ecommerce-api'
  });
};

// Token introspection endpoint
router.post('/introspect', (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      active: true,
      ...decoded
    });
  } catch (err) {
    res.json({ active: false });
  }
});

module.exports = router;
