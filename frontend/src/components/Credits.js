import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContract } from '../context/ContractContext';
import { ethers } from 'ethers';
import './Credits.css';

export default function Credits() {
  const { address, isConnected, signer } = useWallet();
  const { contract } = useContract();
  const [creditData, setCreditData] = useState({
    balance: 0,
    isWhitelisted: false,
    price: 100,
    discountedPrice: 50
  });
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isConnected && contract && address) {
      loadCreditData();
    }
  }, [isConnected, contract, address]);

  async function loadCreditData() {
    try {
      setLoading(true);
      const credits = await contract.credits(address);
      const promptCost = await contract.PROMPT_COST();

      // Check if user is whitelisted
      let isWhitelisted = false;
      try {
        const balance = await contract.balanceOf(address);
        if (balance > 0) {
          for (let i = 0; i < balance; i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            const uri = await contract.tokenURI(tokenId);
            if (uri.includes('whitelist')) {
              isWhitelisted = true;
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error checking whitelist:', err);
      }

      const price = Number(ethers.formatEther(promptCost));
      const discountedPrice = price * 0.5; // 50% discount

      setCreditData({
        balance: Number(credits),
        isWhitelisted,
        price,
        discountedPrice
      });
    } catch (error) {
      console.error('Failed to load credit data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function purchaseCredits() {
    if (!signer || !contract) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setPurchasing(true);
      setError('');
      setTxHash('');

      const contractWithSigner = contract.connect(signer);
      const pricePerCredit = creditData.isWhitelisted
        ? creditData.discountedPrice
        : creditData.price;

      const totalCost = ethers.parseEther((pricePerCredit * selectedAmount).toString());

      const tx = await contractWithSigner.buyCreditsWithMON(selectedAmount, {
        value: totalCost
      });

      setTxHash(tx.hash);
      await tx.wait();

      // Reload credit data
      await loadCreditData();
    } catch (error) {
      console.error('Purchase failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else if (error.message.includes('InsufficientPayment')) {
        setError('Insufficient MON sent for purchase');
      } else {
        setError(error.reason || error.message || 'Purchase failed');
      }
    } finally {
      setPurchasing(false);
    }
  }

  const pricePerCredit = creditData.isWhitelisted
    ? creditData.discountedPrice
    : creditData.price;
  const totalCost = pricePerCredit * selectedAmount;
  const savings = creditData.isWhitelisted
    ? (creditData.price - creditData.discountedPrice) * selectedAmount
    : 0;

  if (!isConnected) {
    return (
      <div className="credits">
        <div className="connect-prompt">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to purchase credits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="credits">
      <div className="credits-header">
        <h1>Buy Generation Credits</h1>
        <p>Purchase credits to generate AI-powered dApps</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading credit information...</p>
        </div>
      ) : (
        <>
          <div className="current-balance">
            <div className="balance-card">
              <div className="balance-icon">⚡</div>
              <div className="balance-info">
                <span className="balance-label">Current Balance</span>
                <span className="balance-value">{creditData.balance}</span>
                <span className="balance-unit">Credits</span>
              </div>
            </div>

            {creditData.isWhitelisted && (
              <div className="whitelist-banner">
                <span className="banner-icon">🎟️</span>
                <div>
                  <strong>Whitelist Active!</strong>
                  <p>You're getting 50% off all credit purchases</p>
                </div>
              </div>
            )}
          </div>

          <div className="purchase-section">
            <h3>Purchase Credits</h3>

            <div className="pricing-info">
              <div className="price-card">
                <div className="price-header">
                  <h4>Price per Credit</h4>
                  {creditData.isWhitelisted && (
                    <span className="discount-badge">50% OFF</span>
                  )}
                </div>
                <div className="price-value">
                  {creditData.isWhitelisted && (
                    <span className="original-price">{creditData.price} MON</span>
                  )}
                  <span className="current-price">{pricePerCredit} MON</span>
                </div>
              </div>
            </div>

            <div className="amount-selector">
              <label>Number of Credits</label>
              <div className="selector-controls">
                <button
                  className="selector-btn"
                  onClick={() => setSelectedAmount(Math.max(1, selectedAmount - 1))}
                  disabled={selectedAmount <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={selectedAmount}
                  onChange={(e) => setSelectedAmount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="amount-input"
                />
                <button
                  className="selector-btn"
                  onClick={() => setSelectedAmount(Math.min(100, selectedAmount + 1))}
                  disabled={selectedAmount >= 100}
                >
                  +
                </button>
              </div>
            </div>

            <div className="quick-select">
              <span>Quick Select:</span>
              {[1, 5, 10, 25, 50].map((amount) => (
                <button
                  key={amount}
                  className={`quick-btn ${selectedAmount === amount ? 'active' : ''}`}
                  onClick={() => setSelectedAmount(amount)}
                >
                  {amount}
                </button>
              ))}
            </div>

            <div className="cost-summary">
              <div className="summary-row">
                <span>Credits:</span>
                <span>{selectedAmount}</span>
              </div>
              <div className="summary-row">
                <span>Price per credit:</span>
                <span>{pricePerCredit} MON</span>
              </div>
              {creditData.isWhitelisted && (
                <div className="summary-row savings">
                  <span>You save:</span>
                  <span>{savings} MON</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total Cost:</span>
                <span>{totalCost} MON</span>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {txHash && (
              <div className="success-message">
                Purchase successful!{' '}
                <a
                  href={`https://testnet.monadscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                </a>
              </div>
            )}

            <button
              className="purchase-button"
              onClick={purchaseCredits}
              disabled={purchasing || selectedAmount < 1}
            >
              {purchasing ? 'Processing...' : `Purchase ${selectedAmount} Credit${selectedAmount !== 1 ? 's' : ''} for ${totalCost} MON`}
            </button>
          </div>

          <div className="info-section">
            <h3>What You Get</h3>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-icon">🤖</div>
                <h4>AI Generation</h4>
                <p>Each credit generates a complete dApp with smart contracts and frontend using Grok AI</p>
              </div>
              <div className="info-card">
                <div className="info-icon">📦</div>
                <h4>Full Code Access</h4>
                <p>Download or push to GitHub - you own 100% of the generated code</p>
              </div>
              <div className="info-card">
                <div className="info-icon">🧪</div>
                <h4>Testnet Deployment</h4>
                <p>Deploy to Monad Testnet with one click to test your app</p>
              </div>
              <div className="info-card">
                <div className="info-icon">🔍</div>
                <h4>Live Preview</h4>
                <p>Test and interact with your dApp before deploying or downloading</p>
              </div>
            </div>
          </div>

          {!creditData.isWhitelisted && (
            <div className="whitelist-promo">
              <div className="promo-content">
                <h4>Want 50% off?</h4>
                <p>Join the whitelist to get lifetime 50% discount + 2000 TOURS airdrop!</p>
                <button
                  className="promo-button"
                  onClick={() => window.location.href = '/whitelist'}
                >
                  Check Whitelist
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
