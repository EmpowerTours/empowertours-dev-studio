const express = require('express');
const router = express.Router();
const { getContractManager } = require('../config/contract');

/**
 * GET /api/credits
 * Get user's credit balance and whitelist status
 */
router.get('/', async (req, res) => {
  try {
    const userAddress = req.userAddress;
    const contractManager = getContractManager();

    const [credits, isWhitelisted, whitelistCount, isEligible] = await Promise.all([
      contractManager.getUserCredits(userAddress),
      contractManager.isUserWhitelisted(userAddress),
      contractManager.getWhitelistCount(),
      contractManager.isWhitelistEligible(userAddress)
    ]);

    // Calculate cost per prompt
    const costPerPrompt = await contractManager.calculateCost(userAddress, 1);

    res.json({
      success: true,
      user: {
        address: userAddress,
        credits,
        isWhitelisted,
        whitelistEligible: isEligible,
        costPerPrompt: costPerPrompt + ' MON',
        discount: isWhitelisted ? '50%' : '0%'
      },
      whitelist: {
        count: whitelistCount,
        max: 50,
        remaining: Math.max(0, 50 - whitelistCount),
        open: whitelistCount < 50
      }
    });

  } catch (error) {
    console.error('Error fetching credits:', error);
    res.status(500).json({ error: 'Failed to fetch credit info' });
  }
});

/**
 * GET /api/credits/cost
 * Calculate cost for N prompts
 */
router.get('/cost/:numPrompts', async (req, res) => {
  try {
    const { numPrompts } = req.params;
    const userAddress = req.userAddress;
    const contractManager = getContractManager();

    const num = parseInt(numPrompts);
    if (isNaN(num) || num < 1) {
      return res.status(400).json({ error: 'Invalid number of prompts' });
    }

    const cost = await contractManager.calculateCost(userAddress, num);
    const isWhitelisted = await contractManager.isUserWhitelisted(userAddress);

    res.json({
      success: true,
      calculation: {
        numPrompts: num,
        costInMON: cost,
        perPrompt: (parseFloat(cost) / num).toFixed(2),
        discount: isWhitelisted ? '50%' : '0%',
        isWhitelisted
      }
    });

  } catch (error) {
    console.error('Error calculating cost:', error);
    res.status(500).json({ error: 'Failed to calculate cost' });
  }
});

/**
 * GET /api/credits/history
 * Get user's generation history (from events)
 */
router.get('/history', async (req, res) => {
  try {
    const userAddress = req.userAddress;
    const contractManager = getContractManager();

    // Query PromptGenerated events for this user
    const filter = contractManager.contract.filters.PromptGenerated(userAddress);
    const events = await contractManager.contract.queryFilter(filter);

    const history = await Promise.all(events.map(async (event) => {
      const block = await event.getBlock();
      return {
        tokenId: Number(event.args.tokenId),
        appType: event.args.appType,
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
    }));

    // Sort by newest first
    history.sort((a, b) => b.blockNumber - a.blockNumber);

    res.json({
      success: true,
      user: userAddress,
      totalGenerations: history.length,
      history
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
