import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { useContract } from '../context/ContractContext';
import CodePreview from './CodePreview';
import TestnetPreview from './TestnetPreview';
import './Generator.css';

const APP_TYPES = [
  { value: 'VRF Game', label: '🎮 VRF Game', description: 'Provably fair game with verifiable randomness' },
  { value: 'NFT Platform', label: '🖼️ NFT Platform', description: 'NFT minting and marketplace' },
  { value: 'DeFi Protocol', label: '💰 DeFi Protocol', description: 'DEX, lending, or staking protocol' },
  { value: 'DAO', label: '🗳️ DAO', description: 'Decentralized governance system' },
  { value: 'Token', label: '🪙 Token', description: 'Custom ERC20/ERC721 token' },
  { value: 'Custom', label: '⚙️ Custom', description: 'Any other type of dApp' }
];

const Generator = () => {
  const { generateDApp, previewGeneration } = useApi();
  const { credits, loadUserData } = useContract();
  const location = useLocation();

  const [prompt, setPrompt] = useState('');
  const [appType, setAppType] = useState('NFT Platform');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('prompt'); // prompt, code, testnet
  const [daoContext, setDaoContext] = useState(null); // DAO contract context if building on a deployed contract

  // Pre-fill from DAO Contracts navigation
  useEffect(() => {
    if (location.state?.prefillPrompt) {
      setPrompt(location.state.prefillPrompt);
      setAppType(location.state.prefillAppType || 'Custom');
      if (location.state.daoContractAddress) {
        setDaoContext({
          address: location.state.daoContractAddress,
          proposalId: location.state.daoProposalId,
        });
      }
    }
  }, [location.state]);

  const handlePreview = async () => {
    if (!prompt || prompt.trim().length < 10) {
      setError('Please enter a detailed prompt (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const preview = await previewGeneration(prompt, appType);
      setPreviewData(preview);
      setActiveTab('code');
    } catch (err) {
      setError(err.error || 'Preview generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || prompt.trim().length < 10) {
      setError('Please enter a detailed prompt (at least 10 characters)');
      return;
    }

    // Check if backend/contract is available
    const hasBackend = window.location.hostname !== 'localhost' &&
                      !window.location.hostname.includes('127.0.0.1');

    if (credits < 1 && hasBackend) {
      setError('Insufficient credits. Backend API required for full generation. Try Preview mode instead (free).');
      return;
    }

    // If no backend, show info message but allow preview-like behavior
    if (!hasBackend || credits < 1) {
      setError('ℹ️ Backend API not available. Using Preview mode instead. Full generation requires deployed backend with credit system.');
      // Fall back to preview mode
      await handlePreview();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const generated = await generateDApp(prompt, appType);

      setResult(generated);
      setActiveTab('code');

      // Reload credits
      await loadUserData();

      console.log('✅ Generation complete:', generated);
    } catch (err) {
      setError(err.error || 'Generation failed. Backend API may not be available.');
      console.error('Generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = {
    'VRF Game': 'Create a dice rolling game where players bet MON tokens and win 2x their bet if they roll above 50. Use Pyth Entropy for verifiable randomness.',
    'NFT Platform': 'Build an NFT collection with 1000 unique items, whitelist minting at 10 MON, and public minting at 20 MON. Include a marketplace.',
    'DeFi Protocol': 'Create a simple staking protocol where users can stake MON tokens and earn 10% APY. Include emergency withdraw function.',
    'DAO': 'Build a DAO where token holders can create and vote on proposals. Include a 7-day voting period and 4% quorum requirement.',
    'Token': 'Create an ERC20 token with 1 million supply, burn function, and 2% transfer tax that goes to a treasury.'
  };

  const loadExample = () => {
    setPrompt(examplePrompts[appType] || '');
  };

  return (
    <div className="generator">
      <div className="generator-header">
        <h1>🤖 Generate Your dApp</h1>
        <p>Describe your idea in natural language and let Claude AI build it for you</p>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      <div className="generator-tabs">
        <button
          className={`tab ${activeTab === 'prompt' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          📝 Prompt
        </button>
        {(result || previewData) && (
          <>
            <button
              className={`tab ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              💻 Generated Code
            </button>
            <button
              className={`tab ${activeTab === 'testnet' ? 'active' : ''}`}
              onClick={() => setActiveTab('testnet')}
            >
              🚀 Deploy Preview
            </button>
          </>
        )}
      </div>

      {activeTab === 'prompt' && (
        <div className="generator-content">
          <div className="form-group">
            <label>App Type</label>
            <div className="app-types">
              {APP_TYPES.map(type => (
                <div
                  key={type.value}
                  className={`app-type-card ${appType === type.value ? 'selected' : ''}`}
                  onClick={() => setAppType(type.value)}
                >
                  <div className="app-type-label">{type.label}</div>
                  <div className="app-type-description">{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {daoContext && (
            <div className="dao-context-banner">
              <strong>Building on DAO Contract</strong>
              <span className="dao-context-address">{daoContext.address}</span>
              <button
                className="dao-context-clear"
                onClick={() => { setDaoContext(null); setPrompt(''); }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="form-group">
            <label>
              Describe Your dApp
              <button className="example-button" onClick={loadExample}>
                Load Example
              </button>
            </label>
            <textarea
              className="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dApp in detail. Include features, tokenomics, game mechanics, or any specific requirements..."
              rows={8}
            />
            <div className="char-count">
              {prompt.length} characters {prompt.length < 10 && '(min 10)'}
            </div>
          </div>

          <div className="generator-actions">
            <button
              className="preview-button"
              onClick={handlePreview}
              disabled={loading || !prompt}
            >
              {loading ? '⏳ Generating Preview...' : '👁️ Preview (Free)'}
            </button>

            <button
              className="generate-button"
              onClick={handleGenerate}
              disabled={loading || !prompt}
              title={credits < 1 ? 'Backend not available - will use Preview mode' : 'Generate full dApp with tests and deployment'}
            >
              {loading ? '⏳ Generating...' : credits < 1 ? '🚀 Generate (Demo Mode)' : `🚀 Generate (1 Credit)`}
            </button>
          </div>

          <div className="info-box">
            <h4>💡 Tips for Better Results:</h4>
            <ul>
              <li>Be specific about features and functionality</li>
              <li>Include tokenomics, game rules, or economic parameters</li>
              <li>Mention any specific security requirements</li>
              <li>Specify UI/UX preferences for the frontend</li>
              <li>Preview is free but limited - full generation includes tests & deployment scripts</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'code' && (result || previewData) && (
        <CodePreview
          data={result || previewData}
          isPreview={!!previewData && !result}
        />
      )}

      {activeTab === 'testnet' && result && (
        <TestnetPreview
          generatedCode={result.code}
          metadata={result.metadata}
          tokenId={result.generation?.tokenId}
        />
      )}
    </div>
  );
};

export default Generator;
