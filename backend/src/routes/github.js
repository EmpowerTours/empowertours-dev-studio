const express = require('express');
const router = express.Router();
const { getGitHubService } = require('../services/githubService');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/github/auth
 * Redirect to GitHub OAuth
 */
router.get('/auth', (req, res) => {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'GitHub integration not configured' });
  }

  const redirectUri = `${process.env.FRONTEND_URL}/github/callback`;
  const scope = 'repo'; // Request repo access

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

  res.json({ authUrl });
});

/**
 * POST /api/github/callback
 * Exchange code for access token
 */
router.post('/callback', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const githubService = getGitHubService();

    if (!githubService.enabled) {
      return res.status(503).json({ error: 'GitHub integration not available' });
    }

    // Exchange code for token
    const accessToken = await githubService.getAccessToken(code);

    // Get user info
    const userInfo = await githubService.getUserInfo(accessToken);

    res.json({
      success: true,
      accessToken, // Frontend will store this temporarily
      user: userInfo
    });

  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).json({ error: error.message || 'GitHub authentication failed' });
  }
});

/**
 * POST /api/github/create-repo
 * Create repository and push generated code
 */
router.post('/create-repo', authMiddleware, async (req, res) => {
  try {
    const {
      accessToken,
      repoName,
      description,
      generatedCode,
      isPrivate
    } = req.body;

    if (!accessToken || !repoName || !generatedCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['accessToken', 'repoName', 'generatedCode']
      });
    }

    const githubService = getGitHubService();

    if (!githubService.enabled) {
      return res.status(503).json({ error: 'GitHub integration not available' });
    }

    console.log('📦 Creating GitHub repo:', repoName);

    // Create repo and push code
    const result = await githubService.createAndPushRepo(
      accessToken,
      repoName,
      description,
      generatedCode,
      isPrivate || false
    );

    res.json({
      success: true,
      message: 'Code pushed to GitHub successfully',
      repository: result.repo,
      commit: result.commit,
      user: result.user
    });

  } catch (error) {
    console.error('Create repo error:', error);
    res.status(500).json({ error: error.message || 'Failed to create repository' });
  }
});

/**
 * GET /api/github/user
 * Get authenticated GitHub user info
 */
router.post('/user', authMiddleware, async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const githubService = getGitHubService();
    const userInfo = await githubService.getUserInfo(accessToken);

    res.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

module.exports = router;
