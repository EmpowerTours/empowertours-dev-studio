import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContract } from '../context/ContractContext';
import './Whitelist.css';

export default function Whitelist() {
  const { address, isConnected, signer } = useWallet();
  const { contract } = useContract();
  const [whitelistData, setWhitelistData] = useState({
    count: 0,
    max: 50,
    isWhitelisted: false,
    tokenId: null
  });
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isConnected && contract && address) {
      loadWhitelistStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, contract, address]);

  async function loadWhitelistStatus() {
    try {
      setLoading(true);
      const count = await contract.whitelistCount();
      const max = await contract.WHITELIST_MAX();

      // Check if user already has whitelist NFT
      let isWhitelisted = false;
      let tokenId = null;

      try {
        const balance = await contract.balanceOf(address);
        if (balance > 0) {
          for (let i = 0; i < balance; i++) {
            const tid = await contract.tokenOfOwnerByIndex(address, i);
            const uri = await contract.tokenURI(tid);
            if (uri.includes('whitelist')) {
              isWhitelisted = true;
              tokenId = tid.toString();
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error checking whitelist NFT:', err);
      }

      setWhitelistData({
        count: Number(count),
        max: Number(max),
        isWhitelisted,
        tokenId
      });
    } catch (error) {
      console.error('Failed to load whitelist status:', error);
      setError('Failed to load whitelist data');
    } finally {
      setLoading(false);
    }
  }

  async function mintWhitelistNFT() {
    if (!signer || !contract) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setMinting(true);
      setError('');
      setTxHash('');

      const contractWithSigner = contract.connect(signer);
      const metadata = JSON.stringify({
        name: 'EmpowerTours Whitelist',
        description: 'First 50 users - 50% lifetime discount + 2000 TOURS airdrop',
        timestamp: Date.now()
      });

      const tx = await contractWithSigner.mintWhitelistNFT(metadata);
      setTxHash(tx.hash);

      await tx.wait();

      // Reload whitelist status
      await loadWhitelistStatus();
    } catch (error) {
      console.error('Minting failed:', error);
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else if (error.message.includes('WhitelistFull')) {
        setError('Whitelist is full! All 50 spots have been claimed.');
      } else if (error.message.includes('AlreadyWhitelisted')) {
        setError('You already have a whitelist NFT!');
      } else {
        setError(error.reason || error.message || 'Minting failed');
      }
    } finally {
      setMinting(false);
    }
  }

  const spotsRemaining = whitelistData.max - whitelistData.count;
  const percentageFilled = (whitelistData.count / whitelistData.max) * 100;

  if (!isConnected) {
    return (
      <div className="whitelist">
        <div className="connect-prompt">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to check whitelist eligibility</p>
        </div>
      </div>
    );
  }

  return (
    <div className="whitelist">
      <div className="whitelist-header">
        <h1>Whitelist NFT</h1>
        <p>Be among the first 50 users to get exclusive benefits</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading whitelist data...</p>
        </div>
      ) : (
        <>
          {whitelistData.isWhitelisted ? (
            <div className="whitelist-success">
              <div className="success-icon">🎉</div>
              <h2>You're Whitelisted!</h2>
              <p>Congratulations! You're one of the first 50 users.</p>

              <div className="nft-card">
                <div className="nft-badge">🎟️</div>
                <h3>Whitelist NFT #{whitelistData.tokenId}</h3>
                <p>This soulbound NFT grants you exclusive benefits</p>
              </div>

              <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon">💰</div>
                  <h4>50% Lifetime Discount</h4>
                  <p>Pay only 50 MON per generation instead of 100 MON</p>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🪂</div>
                  <h4>2000 TOURS Airdrop</h4>
                  <p>Exclusive airdrop of 2000 TOURS tokens</p>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🔒</div>
                  <h4>Soulbound NFT</h4>
                  <p>Non-transferable proof of early supporter status</p>
                </div>
              </div>
            </div>
          ) : spotsRemaining > 0 ? (
            <div className="whitelist-available">
              <div className="progress-section">
                <div className="progress-header">
                  <h3>Whitelist Progress</h3>
                  <span className="spots-count">
                    {spotsRemaining} / {whitelistData.max} spots remaining
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percentageFilled}%` }}
                  />
                </div>
              </div>

              <div className="benefits-preview">
                <h3>Whitelist Benefits</h3>
                <div className="benefits-list">
                  <div className="benefit-card">
                    <span className="benefit-emoji">💰</span>
                    <div>
                      <h4>50% Lifetime Discount</h4>
                      <p>Generate dApps for only 50 MON instead of 100 MON</p>
                    </div>
                  </div>
                  <div className="benefit-card">
                    <span className="benefit-emoji">🪂</span>
                    <div>
                      <h4>2000 TOURS Airdrop</h4>
                      <p>Receive 2000 TOURS tokens as an early supporter</p>
                    </div>
                  </div>
                  <div className="benefit-card">
                    <span className="benefit-emoji">🎟️</span>
                    <div>
                      <h4>Exclusive Soulbound NFT</h4>
                      <p>Proof of early adopter status (non-transferable)</p>
                    </div>
                  </div>
                  <div className="benefit-card">
                    <span className="benefit-emoji">⚡</span>
                    <div>
                      <h4>Priority Support</h4>
                      <p>Get priority access to new features and support</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {txHash && (
                <div className="success-message">
                  Transaction submitted!{' '}
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
                className="mint-button"
                onClick={mintWhitelistNFT}
                disabled={minting}
              >
                {minting ? 'Minting...' : 'Claim Whitelist NFT (FREE)'}
              </button>

              <p className="mint-note">
                Hurry! Only {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
              </p>
            </div>
          ) : (
            <div className="whitelist-full">
              <div className="full-icon">😔</div>
              <h2>Whitelist Full</h2>
              <p>All 50 whitelist spots have been claimed.</p>
              <p className="full-note">
                Don't worry! You can still use EmpowerTours Dev Studio at the regular price of 100 MON per generation.
              </p>
              <button
                className="continue-button"
                onClick={() => window.location.href = '/generator'}
              >
                Continue to Generator
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
