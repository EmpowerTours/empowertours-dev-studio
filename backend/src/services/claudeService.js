const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set in .env');
    }

    this.client = new Anthropic({ apiKey: this.apiKey });

    console.log('✅ Claude Service initialized');
    console.log('🤖 Model:', CLAUDE_MODEL);
  }

  /**
   * Generate dApp code from user prompt
   * @param {string} prompt User's natural language description
   * @param {string} appType Type of app (VRF Game, NFT Platform, etc.)
   * @param {object} options Additional generation options
   * @returns {object} Generated code and metadata
   */
  async generateDApp(prompt, appType, options = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(appType, options);
      const userPrompt = this.buildUserPrompt(prompt, appType);

      console.log('🤖 Generating dApp with Claude...');
      console.log('📝 App Type:', appType);
      console.log('💬 Prompt length:', prompt.length);

      const response = await this.client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: options.maxTokens || 8000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });

      const generatedContent = response.content[0].text;
      const usage = {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
      };

      console.log('✅ Generation complete');
      console.log('📊 Tokens - Input:', usage.prompt_tokens, 'Output:', usage.completion_tokens);

      // Parse generated content
      const parsed = this.parseGeneratedCode(generatedContent, appType);

      // Calculate cost
      const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens);

      return {
        success: true,
        code: parsed.code,
        metadata: parsed.metadata,
        appType,
        usage,
        cost,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Claude API Error:', error.message);

      throw new Error(
        error.message || 'Failed to generate code with Claude API'
      );
    }
  }

  /**
   * Generate a DAO-governed contract with strict security constraints.
   * @param {string} prompt Description of the contract
   * @param {string|number} proposalId DAO proposal ID
   * @returns {object} Generated code
   */
  async generateDAOContract(prompt, proposalId) {
    const systemPrompt = `You are an expert Solidity developer generating a smart contract for DAO-governed deployment on Monad blockchain.

CRITICAL SECURITY REQUIREMENTS — violations will cause the contract to be rejected:
- NO proxy patterns (no delegatecall, no upgradeable, no ERC1967)
- NO admin keys or owner privileges that bypass governance
- NO upgradeability mechanisms
- NO selfdestruct or delegatecall
- Use Solidity 0.8.20+ with custom errors
- Include ReentrancyGuard where applicable
- All state changes must be protected
- Contract must be fully immutable once deployed
- Use OpenZeppelin battle-tested base contracts where possible
- Target Monad blockchain (EVM-compatible, high performance)

The contract will be reviewed by the community on IPFS before deployment.
DAO Proposal ID: ${proposalId}`;

    const userPrompt = `Generate a production-ready Solidity smart contract based on this description:

${prompt}

Return ONLY the Solidity source code, starting with the SPDX license identifier. No markdown, no explanation, just the contract code.`;

    console.log('🤖 Generating DAO contract for proposal', proposalId);

    const response = await this.client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const code = response.content[0].text;
    console.log('✅ DAO contract generated. Length:', code.length);

    return { success: true, code: code.trim() };
  }

  /**
   * Build system prompt based on app type
   */
  buildSystemPrompt(appType, options) {
    const basePrompt = `You are an expert Solidity and Web3 developer specializing in Monad blockchain development.

CRITICAL REQUIREMENTS:
- Generate production-ready, secure, and gas-optimized code
- Use Solidity 0.8.20+ with custom errors for gas efficiency
- Include ReentrancyGuard and access control where needed
- All contracts must compile and be deployment-ready
- Include comprehensive inline documentation
- Follow best practices and security patterns
- Target Monad blockchain (EVM-compatible, high performance)`;

    const typeSpecific = {
      'VRF Game': `
ADDITIONAL REQUIREMENTS FOR VRF GAMES:
- Integrate Pyth Entropy VRF for verifiable randomness
- Use commit-reveal pattern for fairness
- Include proper game state management
- Add emergency pause functionality
- Implement player rewards and payouts securely
- Include frontend React code with ethers.js v6
- Add tests using Hardhat and Chai`,

      'NFT Platform': `
ADDITIONAL REQUIREMENTS FOR NFT PLATFORMS:
- Use ERC721A for gas-efficient batch minting
- Include royalty support (ERC2981)
- Add metadata with IPFS integration
- Implement whitelist/allowlist if needed
- Include marketplace functionality
- Add frontend React code with ethers.js v6
- Include comprehensive tests`,

      'DeFi Protocol': `
ADDITIONAL REQUIREMENTS FOR DEFI:
- Use battle-tested patterns (Compound, Uniswap-inspired)
- Include oracle integration for price feeds
- Implement emergency shutdown mechanisms
- Add comprehensive slippage protection
- Include detailed economic parameters
- Add frontend React code with ethers.js v6
- Include thorough test coverage`,

      'DAO': `
ADDITIONAL REQUIREMENTS FOR DAO:
- Implement Governor Bravo or similar governance
- Include timelock for executed proposals
- Add delegation and voting power tracking
- Implement proposal thresholds and quorum
- Include treasury management
- Add frontend React code with ethers.js v6
- Include governance tests`,

      'Token': `
ADDITIONAL REQUIREMENTS FOR TOKENS:
- Use OpenZeppelin ERC20/ERC721 base
- Include proper access control
- Add burn/mint capabilities if needed
- Implement transfer restrictions if needed
- Include vesting schedules if applicable
- Add frontend React code with ethers.js v6
- Include token economics tests`
    };

    return basePrompt + (typeSpecific[appType] || typeSpecific['NFT Platform']);
  }

  /**
   * Build user prompt
   */
  buildUserPrompt(prompt, appType) {
    return `Generate a complete ${appType} application for Monad blockchain based on this description:

${prompt}

DELIVERABLES:
1. Smart contract(s) in Solidity 0.8.20+
2. Hardhat deployment script
3. Frontend React app with ethers.js v6 integration
4. Comprehensive test suite
5. README with setup instructions

Return ONLY valid code in this JSON structure:
{
  "contracts": {
    "Main.sol": "<solidity code>",
    "Helper.sol": "<solidity code if needed>"
  },
  "deploy": {
    "001_deploy.js": "<hardhat deploy script>"
  },
  "test": {
    "Main.test.js": "<hardhat tests>"
  },
  "frontend": {
    "App.js": "<react component>",
    "contract.js": "<ethers.js integration>"
  },
  "README.md": "<setup instructions>",
  "metadata": {
    "title": "<app name>",
    "description": "<brief description>",
    "features": ["<feature 1>", "<feature 2>"]
  }
}`;
  }

  /**
   * Parse generated code from Claude response
   */
  parseGeneratedCode(content, appType) {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();

      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        code: {
          contracts: parsed.contracts || {},
          deploy: parsed.deploy || {},
          test: parsed.test || {},
          frontend: parsed.frontend || {},
          readme: parsed['README.md'] || parsed.README || ''
        },
        metadata: {
          title: parsed.metadata?.title || `Generated ${appType}`,
          description: parsed.metadata?.description || '',
          features: parsed.metadata?.features || [],
          appType
        }
      };

    } catch (error) {
      console.error('Failed to parse Claude output:', error);

      // Fallback: return raw content
      return {
        code: {
          contracts: {},
          deploy: {},
          test: {},
          frontend: {},
          readme: content
        },
        metadata: {
          title: `Generated ${appType}`,
          description: 'Generated code - manual parsing required',
          features: [],
          appType,
          rawContent: content
        }
      };
    }
  }

  /**
   * Calculate API cost
   * Claude Sonnet: $3 per 1M input, $15 per 1M output
   */
  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * 3.00;
    const outputCost = (outputTokens / 1000000) * 15.00;
    const total = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: total.toFixed(6),
      totalCostUSD: `$${total.toFixed(4)}`
    };
  }
}

// Singleton instance
let claudeService = null;

module.exports = {
  getClaudeService: () => {
    if (!claudeService) {
      claudeService = new ClaudeService();
    }
    return claudeService;
  },
  ClaudeService
};
