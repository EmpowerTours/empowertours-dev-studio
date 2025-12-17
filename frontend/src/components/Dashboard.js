import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContract } from '../context/ContractContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { address, isConnected } = useWallet();
  const { contract } = useContract();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    creditsRemaining: 0,
    appsGenerated: 0,
    isWhitelisted: false,
    whitelistSpots: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && contract && address) {
      loadUserStats();
    } else if (isConnected && !contract) {
      // Contract not deployed yet, show empty state
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, contract, address]);

  async function loadUserStats() {
    try {
      setLoading(true);

      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled([
        contract.credits(address),
        contract.whitelistCount(),
        contract.WHITELIST_MAX(),
        contract.balanceOf(address)
      ]);

      const credits = results[0].status === 'fulfilled' ? Number(results[0].value) : 0;
      const whitelistCount = results[1].status === 'fulfilled' ? Number(results[1].value) : 0;
      const whitelistMax = results[2].status === 'fulfilled' ? Number(results[2].value) : 50;
      const balance = results[3].status === 'fulfilled' ? results[3].value : 0;

      // Check if user has whitelist NFT
      let isWhitelisted = false;
      if (balance > 0) {
        try {
          for (let i = 0; i < balance; i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            const tokenURI = await contract.tokenURI(tokenId);
            if (tokenURI.includes('whitelist')) {
              isWhitelisted = true;
              break;
            }
          }
        } catch (err) {
          console.error('Error checking whitelist status:', err);
        }
      }

      setStats({
        creditsRemaining: credits,
        appsGenerated: 0, // Will be fetched from backend API
        isWhitelisted,
        whitelistSpots: whitelistMax - whitelistCount
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
      // Set default values on error
      setStats({
        creditsRemaining: 0,
        appsGenerated: 0,
        isWhitelisted: false,
        whitelistSpots: 50
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Welcome to EmpowerTours Dev Studio</h1>
        <p>Build complete dApps from natural language prompts, powered by Grok AI</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <div className="connect-card">
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to start generating dApps on Monad blockchain</p>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your dashboard...</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-value">{stats.creditsRemaining}</div>
                  <div className="stat-label">Credits Remaining</div>
                  <button
                    className="stat-action"
                    onClick={() => navigate('/credits')}
                  >
                    Buy More
                  </button>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🚀</div>
                  <div className="stat-value">{stats.appsGenerated}</div>
                  <div className="stat-label">Apps Generated</div>
                  <button
                    className="stat-action"
                    onClick={() => navigate('/my-apps')}
                  >
                    View All
                  </button>
                </div>

                <div className={`stat-card ${stats.isWhitelisted ? 'whitelisted' : ''}`}>
                  <div className="stat-icon">🎟️</div>
                  <div className="stat-value">
                    {stats.isWhitelisted ? '✓' : stats.whitelistSpots}
                  </div>
                  <div className="stat-label">
                    {stats.isWhitelisted ? 'Whitelisted!' : 'Spots Left'}
                  </div>
                  {!stats.isWhitelisted && stats.whitelistSpots > 0 && (
                    <button
                      className="stat-action"
                      onClick={() => navigate('/whitelist')}
                    >
                      Get Whitelist
                    </button>
                  )}
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-value">100 MON</div>
                  <div className="stat-label">Per Generation</div>
                  {stats.isWhitelisted && (
                    <div className="discount-badge">50% OFF</div>
                  )}
                </div>
              </div>

              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                  <div
                    className="action-card primary"
                    onClick={() => navigate('/generator')}
                  >
                    <div className="action-icon">✨</div>
                    <h4>Generate New dApp</h4>
                    <p>Create a complete dApp from your prompt</p>
                  </div>

                  <div
                    className="action-card"
                    onClick={() => navigate('/my-apps')}
                  >
                    <div className="action-icon">📁</div>
                    <h4>My Apps</h4>
                    <p>View and manage your generated applications</p>
                  </div>

                  <div
                    className="action-card"
                    onClick={() => navigate('/credits')}
                  >
                    <div className="action-icon">⚡</div>
                    <h4>Buy Credits</h4>
                    <p>Purchase more generation credits</p>
                  </div>

                  {!stats.isWhitelisted && stats.whitelistSpots > 0 && (
                    <div
                      className="action-card highlight"
                      onClick={() => navigate('/whitelist')}
                    >
                      <div className="action-icon">🎟️</div>
                      <h4>Join Whitelist</h4>
                      <p>Get 50% off + 2000 TOURS airdrop</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="features-section">
                <h3>Platform Features</h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <span className="feature-icon">🤖</span>
                    <h4>AI-Powered Generation</h4>
                    <p>Grok AI creates production-ready smart contracts and frontends</p>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🔍</span>
                    <h4>Live Preview</h4>
                    <p>Test your dApp before deploying or pushing to GitHub</p>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🧪</span>
                    <h4>Testnet Deployment</h4>
                    <p>Deploy to Monad Testnet with one click</p>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📦</span>
                    <h4>GitHub Integration</h4>
                    <p>Push your code directly to your GitHub repository</p>
                  </div>
                </div>
              </div>

              <div className="portfolio-section">
                <h3>Featured Projects</h3>
                <div className="portfolio-grid">
                  <div className="portfolio-card">
                    <div className="portfolio-header">
                      <div className="portfolio-status-badge live">Live Demo</div>
                      <h4>Blockchain Settlement Framework</h4>
                      <p className="portfolio-description">
                        Voluntary bilateral negotiation tool on Monad blockchain.
                        Demonstrates smart contract development, escrow mechanics, and
                        secure pull-pattern withdrawals.
                      </p>
                    </div>
                    <div className="portfolio-tech">
                      <span className="tech-tag">Solidity</span>
                      <span className="tech-tag">Monad</span>
                      <span className="tech-tag">ethers.js</span>
                      <span className="tech-tag">React</span>
                    </div>
                    <div className="portfolio-features">
                      <div className="portfolio-feature">
                        <span className="check-icon">✓</span>
                        Escrow & Mutual Consent
                      </div>
                      <div className="portfolio-feature">
                        <span className="check-icon">✓</span>
                        Pull-Pattern Security
                      </div>
                      <div className="portfolio-feature">
                        <span className="check-icon">✓</span>
                        On-Chain Dispute Resolution
                      </div>
                    </div>
                    <div className="portfolio-actions">
                      <a
                        href="/settlement-framework"
                        className="portfolio-btn primary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Live Demo
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
