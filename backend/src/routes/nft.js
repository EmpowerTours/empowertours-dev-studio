const express = require('express');
const router = express.Router();
const { getContractManager } = require('../config/contract');
const { getIPFSService } = require('../services/ipfsService');

/**
 * GET /api/nft/:tokenId
 * Get NFT metadata
 */
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const contractManager = getContractManager();
    const ipfsService = getIPFSService();

    // Get metadata URI from contract
    const metadataURI = await contractManager.getAppMetadata(tokenId);

    if (!metadataURI) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    // Fetch metadata from IPFS
    const metadata = await ipfsService.fetchFromIPFS(metadataURI);

    res.json({
      success: true,
      tokenId,
      metadataURI,
      metadata,
      ipfsUrl: ipfsService.getGatewayUrl(metadataURI)
    });

  } catch (error) {
    console.error('Error fetching NFT:', error);
    res.status(500).json({ error: 'Failed to fetch NFT metadata' });
  }
});

/**
 * GET /api/nft/user/:address
 * Get all NFTs owned by user
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const contractManager = getContractManager();

    // Query Transfer events to this address
    const filter = contractManager.contract.filters.Transfer(null, address);
    const events = await contractManager.contract.queryFilter(filter);

    const tokenIds = events.map(event => Number(event.args.tokenId));

    res.json({
      success: true,
      owner: address,
      tokenIds,
      count: tokenIds.length
    });

  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    res.status(500).json({ error: 'Failed to fetch user NFTs' });
  }
});

/**
 * GET /api/nft/whitelist/status
 * Get whitelist status and eligibility
 */
router.get('/whitelist/status', async (req, res) => {
  try {
    const userAddress = req.userAddress;
    const contractManager = getContractManager();

    const [isWhitelisted, isEligible, count] = await Promise.all([
      contractManager.isUserWhitelisted(userAddress),
      contractManager.isWhitelistEligible(userAddress),
      contractManager.getWhitelistCount()
    ]);

    res.json({
      success: true,
      user: userAddress,
      whitelist: {
        isMember: isWhitelisted,
        isEligible,
        currentCount: count,
        maxCount: 50,
        spotsRemaining: Math.max(0, 50 - count),
        benefits: {
          discount: '50%',
          toursAirdrop: '2000 TOURS',
          soulbound: true
        }
      }
    });

  } catch (error) {
    console.error('Error checking whitelist:', error);
    res.status(500).json({ error: 'Failed to check whitelist status' });
  }
});

module.exports = router;
