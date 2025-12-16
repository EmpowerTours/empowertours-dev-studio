const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Using Pinata for IPFS (popular choice)
const PINATA_API_URL = 'https://api.pinata.cloud';

class IPFSService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.apiSecret = process.env.PINATA_SECRET_API_KEY;

    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️  IPFS service not configured (missing Pinata keys)');
      this.enabled = false;
      return;
    }

    this.client = axios.create({
      baseURL: PINATA_API_URL,
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.apiSecret
      },
      timeout: 120000 // 2 minute timeout for large uploads
    });

    this.enabled = true;
    console.log('✅ IPFS Service initialized (Pinata)');
  }

  /**
   * Upload generated code to IPFS
   * @param {object} generatedCode The code object from Grok
   * @param {object} metadata App metadata
   * @returns {string} IPFS CID
   */
  async uploadGeneratedApp(generatedCode, metadata) {
    if (!this.enabled) {
      console.warn('IPFS upload skipped - service not configured');
      return 'ipfs://local-dev-' + Date.now(); // Dev fallback
    }

    try {
      const appBundle = {
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          platform: 'EmpowerTours Dev Studio',
          blockchain: 'Monad'
        },
        code: generatedCode,
        manifest: {
          contracts: Object.keys(generatedCode.contracts || {}),
          hasTests: Object.keys(generatedCode.test || {}).length > 0,
          hasFrontend: Object.keys(generatedCode.frontend || {}).length > 0,
          hasDeployScript: Object.keys(generatedCode.deploy || {}).length > 0
        }
      };

      console.log('📤 Uploading to IPFS...');

      const response = await this.client.post('/pinning/pinJSONToIPFS', {
        pinataContent: appBundle,
        pinataMetadata: {
          name: `${metadata.title || 'Generated App'} - ${Date.now()}`,
          keyvalues: {
            appType: metadata.appType,
            generatedBy: 'EmpowerTours'
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      });

      const cid = response.data.IpfsHash;
      console.log('✅ Uploaded to IPFS:', cid);
      console.log('🔗 Gateway URL:', this.getGatewayUrl(cid));

      return `ipfs://${cid}`;

    } catch (error) {
      console.error('❌ IPFS upload failed:', error.response?.data || error.message);
      throw new Error('Failed to upload to IPFS');
    }
  }

  /**
   * Upload whitelist NFT metadata
   */
  async uploadWhitelistMetadata(userAddress, whitelistNumber) {
    if (!this.enabled) {
      return `ipfs://whitelist-dev-${userAddress}-${Date.now()}`;
    }

    try {
      const metadata = {
        name: `EmpowerTours Whitelist #${whitelistNumber}`,
        description: 'Early adopter whitelist NFT - 50% lifetime discount + 2000 TOURS airdrop',
        image: 'ipfs://QmWhitelistBadgeImage', // TODO: Upload actual image
        attributes: [
          { trait_type: 'Member Number', value: whitelistNumber },
          { trait_type: 'Discount', value: '50%' },
          { trait_type: 'TOURS Airdrop', value: '2000' },
          { trait_type: 'Soulbound', value: 'Yes' },
          { trait_type: 'Member Address', value: userAddress }
        ],
        properties: {
          category: 'Whitelist',
          soulbound: true,
          benefits: [
            '50% discount on all generations',
            '2000 TOURS token airdrop',
            'Early access to new features',
            'Priority support'
          ]
        }
      };

      const response = await this.client.post('/pinning/pinJSONToIPFS', {
        pinataContent: metadata,
        pinataMetadata: {
          name: `Whitelist #${whitelistNumber} - ${userAddress}`,
          keyvalues: {
            type: 'whitelist',
            number: whitelistNumber.toString()
          }
        }
      });

      const cid = response.data.IpfsHash;
      console.log('✅ Whitelist metadata uploaded:', cid);

      return `ipfs://${cid}`;

    } catch (error) {
      console.error('❌ Whitelist metadata upload failed:', error.message);
      throw new Error('Failed to upload whitelist metadata');
    }
  }

  /**
   * Get IPFS gateway URL
   */
  getGatewayUrl(cid) {
    // Remove ipfs:// prefix if present
    const hash = cid.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  /**
   * Fetch content from IPFS
   */
  async fetchFromIPFS(cid) {
    try {
      const url = this.getGatewayUrl(cid);
      const response = await axios.get(url, { timeout: 30000 });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch from IPFS:', error.message);
      throw new Error('Failed to fetch IPFS content');
    }
  }
}

// Singleton instance
let ipfsService = null;

module.exports = {
  getIPFSService: () => {
    if (!ipfsService) {
      ipfsService = new IPFSService();
    }
    return ipfsService;
  },
  IPFSService
};
