const { ethers } = require('ethers');
require('dotenv').config();

// Contract ABI (essential functions only)
const STUDIO_ABI = [
  "function credits(address user) view returns (uint256)",
  "function isWhitelisted(address user) view returns (bool)",
  "function whitelistCounter() view returns (uint16)",
  "function calculateCost(address user, uint256 numPrompts) view returns (uint256)",
  "function isWhitelistEligible(address user) view returns (bool)",
  "function burnCredit(address user) external",
  "function mintAppNFT(address user, string memory appMetadata, string memory appType) external returns (uint256)",
  "function getAppMetadata(uint256 tokenId) view returns (string memory)",
  "event CreditsPurchased(address indexed user, uint256 amount, uint256 cost, bool usedMON)",
  "event PromptGenerated(address indexed user, uint256 indexed tokenId, string appType)",
  "event WhitelistMinted(address indexed user, uint256 indexed tokenId, uint256 timestamp)"
];

// Network configuration
const NETWORKS = {
  monadTestnet: {
    rpc: process.env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz',
    chainId: 41454,
    explorer: 'https://testnet.monadscan.com'
  },
  monadMainnet: {
    rpc: process.env.MONAD_MAINNET_RPC || 'https://rpc.monad.xyz',
    chainId: 143,
    explorer: 'https://monadscan.com'
  }
};

class ContractManager {
  constructor() {
    this.network = process.env.NETWORK || 'monadTestnet';
    this.contractAddress = process.env.STUDIO_CONTRACT_ADDRESS;

    if (!this.contractAddress) {
      throw new Error('STUDIO_CONTRACT_ADDRESS not set in .env');
    }

    // Setup provider
    const networkConfig = NETWORKS[this.network];
    this.provider = new ethers.JsonRpcProvider(networkConfig.rpc);

    // Setup wallet (for backend operations)
    if (!process.env.BACKEND_PRIVATE_KEY) {
      throw new Error('BACKEND_PRIVATE_KEY not set in .env');
    }
    this.wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, this.provider);

    // Setup contract
    this.contract = new ethers.Contract(
      this.contractAddress,
      STUDIO_ABI,
      this.wallet
    );

    console.log('✅ Contract Manager initialized');
    console.log('📄 Contract:', this.contractAddress);
    console.log('🌐 Network:', this.network);
    console.log('🔑 Backend wallet:', this.wallet.address);
  }

  // Get user credits
  async getUserCredits(userAddress) {
    try {
      const credits = await this.contract.credits(userAddress);
      return Number(credits);
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw new Error('Failed to fetch credits');
    }
  }

  // Check if user is whitelisted
  async isUserWhitelisted(userAddress) {
    try {
      return await this.contract.isWhitelisted(userAddress);
    } catch (error) {
      console.error('Error checking whitelist:', error);
      throw new Error('Failed to check whitelist status');
    }
  }

  // Get whitelist count
  async getWhitelistCount() {
    try {
      const count = await this.contract.whitelistCounter();
      return Number(count);
    } catch (error) {
      console.error('Error getting whitelist count:', error);
      throw new Error('Failed to fetch whitelist count');
    }
  }

  // Calculate cost for user
  async calculateCost(userAddress, numPrompts) {
    try {
      const cost = await this.contract.calculateCost(userAddress, numPrompts);
      return ethers.formatEther(cost);
    } catch (error) {
      console.error('Error calculating cost:', error);
      throw new Error('Failed to calculate cost');
    }
  }

  // Check whitelist eligibility
  async isWhitelistEligible(userAddress) {
    try {
      return await this.contract.isWhitelistEligible(userAddress);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw new Error('Failed to check eligibility');
    }
  }

  // Burn user credit (backend only)
  async burnCredit(userAddress) {
    try {
      const tx = await this.contract.burnCredit(userAddress);
      const receipt = await tx.wait();

      console.log('✅ Credit burned for', userAddress);
      console.log('📝 Tx:', receipt.hash);

      return receipt;
    } catch (error) {
      console.error('Error burning credit:', error);
      throw new Error('Failed to burn credit');
    }
  }

  // Mint app NFT (backend only)
  async mintAppNFT(userAddress, ipfsCID, appType) {
    try {
      const tx = await this.contract.mintAppNFT(userAddress, ipfsCID, appType);
      const receipt = await tx.wait();

      // Extract token ID from event
      const event = receipt.logs.find(log => {
        try {
          return this.contract.interface.parseLog(log)?.name === 'PromptGenerated';
        } catch {
          return false;
        }
      });

      let tokenId = null;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        tokenId = Number(parsed.args.tokenId);
      }

      console.log('✅ App NFT minted for', userAddress);
      console.log('🎫 Token ID:', tokenId);
      console.log('📝 Tx:', receipt.hash);

      return { tokenId, txHash: receipt.hash };
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw new Error('Failed to mint app NFT');
    }
  }

  // Get app metadata
  async getAppMetadata(tokenId) {
    try {
      return await this.contract.getAppMetadata(tokenId);
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error('Failed to fetch metadata');
    }
  }

  // Get network explorer URL
  getExplorerUrl(txHash) {
    const networkConfig = NETWORKS[this.network];
    return `${networkConfig.explorer}/tx/${txHash}`;
  }
}

// Singleton instance
let contractManager = null;

module.exports = {
  getContractManager: () => {
    if (!contractManager) {
      contractManager = new ContractManager();
    }
    return contractManager;
  },
  ContractManager
};
