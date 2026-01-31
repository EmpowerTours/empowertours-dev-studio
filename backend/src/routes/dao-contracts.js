const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

const RPC_URL = process.env.MONAD_MAINNET_RPC || process.env.MONAD_TESTNET_RPC || 'https://rpc.monad.xyz';
const FACTORY_ADDRESS = process.env.DAO_CONTRACT_FACTORY || '';

const FACTORY_ABI = [
  'function proposalCount() view returns (uint256)',
  'function getProposal(uint256 id) view returns (uint256 governorProposalId, address proposer, string prompt, string ipfsCodeHash, uint256 treasuryAllocation, address deployedContract, uint256 deploymentNftId, uint8 status, uint256 createdAt, uint256 deployedAt, bytes32 sourceCodeHash, bytes32 bytecodeHash, uint256 securityScore)',
];

const STATUS_NAMES = ['Pending', 'Approved', 'CodeGenerated', 'Compiled', 'Deployed'];

/**
 * GET /api/dao-contracts
 * Fetch contracts deployed via DAO governance
 */
router.get('/', async (req, res) => {
  try {
    if (!FACTORY_ADDRESS) {
      return res.status(500).json({
        error: 'DAO Contract Factory not configured',
        hint: 'Set DAO_CONTRACT_FACTORY environment variable',
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    const count = await factory.proposalCount();
    const total = Number(count);

    // Fetch last 20 proposals
    const proposals = [];
    const start = total > 20 ? total - 20 : 0;

    for (let i = total - 1; i >= start; i--) {
      try {
        const p = await factory.getProposal(i);
        const deployedContract = p[5];
        const isDeployed = deployedContract !== ethers.ZeroAddress;

        proposals.push({
          id: i,
          governorProposalId: p[0].toString(),
          proposer: p[1],
          prompt: p[2].substring(0, 200),
          ipfsCodeHash: p[3],
          treasuryAllocation: Number(p[4]),
          deployedContract: isDeployed ? deployedContract : null,
          status: STATUS_NAMES[Number(p[7])] || 'Unknown',
          statusIndex: Number(p[7]),
          createdAt: Number(p[8]),
          deployedAt: Number(p[9]),
          securityScore: Number(p[12]),
          isDeployed,
        });
      } catch {
        // Skip failed reads
      }
    }

    // Filter to only deployed contracts if ?deployed=true
    const deployedOnly = req.query.deployed === 'true';
    const filtered = deployedOnly ? proposals.filter((p) => p.isDeployed) : proposals;

    res.json({
      success: true,
      total,
      proposals: filtered,
      factory: FACTORY_ADDRESS,
    });
  } catch (error) {
    console.error('DAO contracts error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch DAO contracts',
    });
  }
});

/**
 * GET /api/dao-contracts/:id
 * Get specific DAO-deployed contract details
 */
router.get('/:id', async (req, res) => {
  try {
    if (!FACTORY_ADDRESS) {
      return res.status(500).json({ error: 'DAO Contract Factory not configured' });
    }

    const { id } = req.params;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    const p = await factory.getProposal(id);

    res.json({
      success: true,
      proposal: {
        id: Number(id),
        governorProposalId: p[0].toString(),
        proposer: p[1],
        prompt: p[2],
        ipfsCodeHash: p[3],
        treasuryAllocation: Number(p[4]),
        deployedContract: p[5] !== ethers.ZeroAddress ? p[5] : null,
        deploymentNftId: Number(p[6]),
        status: STATUS_NAMES[Number(p[7])] || 'Unknown',
        statusIndex: Number(p[7]),
        createdAt: Number(p[8]),
        deployedAt: Number(p[9]),
        sourceCodeHash: p[10],
        bytecodeHash: p[11],
        securityScore: Number(p[12]),
      },
    });
  } catch (error) {
    console.error('DAO contract detail error:', error);
    res.status(500).json({ error: 'Failed to fetch contract details' });
  }
});

module.exports = router;
