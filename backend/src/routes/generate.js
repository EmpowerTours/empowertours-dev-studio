const express = require('express');
const router = express.Router();
const { getGrokService } = require('../services/grokService');
const { getIPFSService } = require('../services/ipfsService');
const { getContractManager } = require('../config/contract');

/**
 * POST /api/generate
 * Generate dApp from natural language prompt
 */
router.post('/', async (req, res) => {
  try {
    const { prompt, appType, options } = req.body;
    const userAddress = req.userAddress;

    // Validation
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({
        error: 'Prompt must be at least 10 characters'
      });
    }

    if (!appType) {
      return res.status(400).json({
        error: 'App type is required',
        validTypes: ['VRF Game', 'NFT Platform', 'DeFi Protocol', 'DAO', 'Token', 'Custom']
      });
    }

    console.log('\n🎨 Generation request from:', userAddress);
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('🏗️  App Type:', appType);

    // Check user has credits
    const contractManager = getContractManager();
    const credits = await contractManager.getUserCredits(userAddress);

    if (credits < 1) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits: 0,
        hint: 'Purchase credits to continue'
      });
    }

    console.log('✅ User has', credits, 'credits');

    // Generate code with Grok
    const grokService = getGrokService();
    const generated = await grokService.generateDApp(prompt, appType, options);

    if (!generated.success) {
      return res.status(500).json({
        error: 'Code generation failed',
        details: generated.error
      });
    }

    console.log('✅ Code generated successfully');
    console.log('💰 API Cost:', generated.cost.totalCostUSD);

    // Upload to IPFS
    const ipfsService = getIPFSService();
    const ipfsCID = await ipfsService.uploadGeneratedApp(
      generated.code,
      generated.metadata
    );

    console.log('✅ Uploaded to IPFS:', ipfsCID);

    // Burn credit
    await contractManager.burnCredit(userAddress);
    console.log('✅ Credit burned');

    // Mint NFT
    const nftResult = await contractManager.mintAppNFT(
      userAddress,
      ipfsCID,
      appType
    );

    console.log('✅ NFT minted - Token ID:', nftResult.tokenId);

    // Return result
    res.json({
      success: true,
      generation: {
        tokenId: nftResult.tokenId,
        txHash: nftResult.txHash,
        ipfsCID,
        ipfsUrl: ipfsService.getGatewayUrl(ipfsCID),
        explorerUrl: contractManager.getExplorerUrl(nftResult.txHash)
      },
      code: generated.code,
      metadata: generated.metadata,
      cost: generated.cost,
      creditsRemaining: credits - 1,
      timestamp: generated.timestamp
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    res.status(500).json({
      error: error.message || 'Generation failed',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

/**
 * GET /api/generate/:tokenId
 * Retrieve generated app by token ID
 */
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const contractManager = getContractManager();
    const ipfsService = getIPFSService();

    // Get IPFS CID from contract
    const ipfsCID = await contractManager.getAppMetadata(tokenId);

    if (!ipfsCID) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Fetch from IPFS
    const appData = await ipfsService.fetchFromIPFS(ipfsCID);

    res.json({
      success: true,
      tokenId,
      ipfsCID,
      ipfsUrl: ipfsService.getGatewayUrl(ipfsCID),
      app: appData
    });

  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

/**
 * POST /api/generate/preview
 * Generate preview without burning credit (limited)
 */
router.post('/preview', async (req, res) => {
  try {
    const { prompt, appType } = req.body;

    if (!prompt || !appType) {
      return res.status(400).json({ error: 'Prompt and appType required' });
    }

    const grokService = getGrokService();

    // Generate with limited tokens for preview
    const generated = await grokService.generateDApp(prompt, appType, {
      maxTokens: 2000 // Limited preview
    });

    res.json({
      success: true,
      preview: true,
      code: generated.code,
      metadata: generated.metadata,
      cost: generated.cost,
      note: 'This is a preview. Full generation requires credits.'
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Preview generation failed' });
  }
});

module.exports = router;
