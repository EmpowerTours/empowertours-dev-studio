const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT for authenticated user
 */
function generateToken(userAddress) {
  return jwt.sign(
    {
      address: userAddress.toLowerCase(),
      timestamp: Date.now()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify signature and generate token
 * Used for wallet-based authentication
 */
async function verifySignature(address, signature, message) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user address to request
 */
async function authMiddleware(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authentication token provided',
        hint: 'Include Authorization: Bearer <token> header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user address to request
    req.userAddress = decoded.address;
    req.authTimestamp = decoded.timestamp;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token expired',
        hint: 'Please sign in again'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid authentication token',
        hint: 'Token verification failed'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if authenticated, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userAddress = decoded.address;
      req.authTimestamp = decoded.timestamp;
    }

    next();
  } catch (error) {
    // Silently fail - authentication is optional
    next();
  }
}

module.exports = authMiddleware;
module.exports.generateToken = generateToken;
module.exports.verifySignature = verifySignature;
module.exports.optionalAuth = optionalAuth;
