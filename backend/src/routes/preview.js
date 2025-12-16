const express = require('express');
const router = express.Router();
const { getPreviewService } = require('../services/previewService');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/preview/build
 * Build and create preview
 */
router.post('/build', authMiddleware, async (req, res) => {
  try {
    const { generatedCode, metadata } = req.body;

    if (!generatedCode || !generatedCode.frontend) {
      return res.status(400).json({
        error: 'Generated code with frontend required'
      });
    }

    console.log('🔨 Building preview for:', metadata?.title || 'Unknown');

    const previewService = getPreviewService();
    const result = await previewService.buildPreview(generatedCode, metadata || {});

    res.json({
      success: true,
      preview: result,
      message: 'Preview built successfully'
    });

  } catch (error) {
    console.error('Preview build error:', error);
    res.status(500).json({
      error: error.message || 'Failed to build preview'
    });
  }
});

/**
 * GET /api/preview/:id
 * Get preview HTML
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const previewService = getPreviewService();

    const preview = await previewService.getPreview(id);

    // Serve HTML file
    res.sendFile(preview.htmlPath);

  } catch (error) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Preview Not Found</title></head>
      <body>
        <div style="text-align: center; padding: 50px; font-family: sans-serif;">
          <h1>🔍 Preview Not Found</h1>
          <p>${error.message}</p>
          <p>Preview may have expired or been deleted.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * GET /api/preview/:id/bundle.js
 * Get preview JavaScript bundle
 */
router.get('/:id/preview-bundle.js', async (req, res) => {
  try {
    const { id } = req.params;
    const previewService = getPreviewService();

    const preview = await previewService.getPreview(id);

    res.type('application/javascript');
    res.sendFile(preview.bundlePath);

  } catch (error) {
    res.status(404).send('// Preview bundle not found');
  }
});

/**
 * DELETE /api/preview/:id
 * Delete preview
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const previewService = getPreviewService();

    await previewService.deletePreview(id);

    res.json({
      success: true,
      message: 'Preview deleted'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete preview'
    });
  }
});

/**
 * GET /api/preview/admin/active
 * Get all active previews (admin only)
 */
router.get('/admin/active', authMiddleware, async (req, res) => {
  try {
    const previewService = getPreviewService();
    const active = previewService.getActivePreviews();

    res.json({
      success: true,
      count: active.length,
      previews: active
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get active previews'
    });
  }
});

module.exports = router;
