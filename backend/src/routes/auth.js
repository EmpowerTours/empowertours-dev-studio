const express = require('express');
const router = express.Router();
const { generateToken, verifySignature } = require('../middleware/auth');
const crypto = require('crypto');

// Store nonces temporarily (in production, use Redis)
const nonces = new Map();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/auth/nonce/:address
 * Get nonce for wallet signature
 */
router.get('/nonce/:address', (req, res) => {
  try {
    const { address } = req.params;

    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const message = `Sign this message to authenticate with EmpowerTours Dev Studio.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

    // Store nonce with expiry
    nonces.set(address.toLowerCase(), {
      nonce,
      message,
      timestamp: Date.now()
    });

    // Clean up expired nonces
    setTimeout(() => {
      nonces.delete(address.toLowerCase());
    }, NONCE_EXPIRY);

    res.json({
      success: true,
      address,
      message,
      nonce,
      expiresIn: NONCE_EXPIRY / 1000 // seconds
    });

  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * POST /api/auth/verify
 * Verify signature and issue JWT
 */
router.post('/verify', async (req, res) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({
        error: 'Address and signature required'
      });
    }

    // Get stored nonce
    const stored = nonces.get(address.toLowerCase());

    if (!stored) {
      return res.status(401).json({
        error: 'Nonce not found or expired',
        hint: 'Request a new nonce from /api/auth/nonce/:address'
      });
    }

    // Check expiry
    if (Date.now() - stored.timestamp > NONCE_EXPIRY) {
      nonces.delete(address.toLowerCase());
      return res.status(401).json({
        error: 'Nonce expired',
        hint: 'Request a new nonce'
      });
    }

    // Verify signature
    const isValid = await verifySignature(
      address,
      signature,
      stored.message
    );

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    // Delete nonce (one-time use)
    nonces.delete(address.toLowerCase());

    // Generate JWT
    const token = generateToken(address);

    console.log('✅ User authenticated:', address);

    res.json({
      success: true,
      address,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/verify-token
 * Verify if current token is valid
 */
router.get('/verify-token', require('../middleware/auth'), (req, res) => {
  res.json({
    success: true,
    address: req.userAddress,
    timestamp: req.authTimestamp
  });
});

module.exports = router;
