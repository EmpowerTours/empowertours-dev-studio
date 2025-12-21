import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import './MyApps.css';

export default function MyApps() {
  const { address, isConnected, API_URL } = useWallet();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, deployed, draft

  useEffect(() => {
    if (isConnected && address) {
      loadUserApps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  async function loadUserApps() {
    try {
      setLoading(true);

      // Check if API_URL is available (backend API might not be deployed)
      if (!API_URL || API_URL.includes('localhost')) {
        console.warn('API not available - using local storage');
        // Load from local storage as fallback
        const savedApps = localStorage.getItem(`apps_${address}`);
        if (savedApps) {
          setApps(JSON.parse(savedApps));
        } else {
          setApps([]);
        }
        return;
      }

      const response = await fetch(`${API_URL}/api/apps/user/${address}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setApps(data.apps || []);
        } else {
          // Not JSON response, use local storage fallback
          const savedApps = localStorage.getItem(`apps_${address}`);
          setApps(savedApps ? JSON.parse(savedApps) : []);
        }
      } else {
        // API error, use local storage fallback
        const savedApps = localStorage.getItem(`apps_${address}`);
        setApps(savedApps ? JSON.parse(savedApps) : []);
      }
    } catch (error) {
      // Network error or other issue, use local storage fallback
      console.warn('API unavailable, using local storage:', error.message);
      const savedApps = localStorage.getItem(`apps_${address}`);
      setApps(savedApps ? JSON.parse(savedApps) : []);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getAppTypeIcon(type) {
    const icons = {
      'vrf-game': '🎲',
      'nft-platform': '🖼️',
      'defi-protocol': '💰',
      'dao-governance': '🏛️',
      'token-launch': '🪙',
      'other': '🚀'
    };
    return icons[type] || icons.other;
  }

  const filteredApps = apps.filter(app => {
    if (filter === 'all') return true;
    if (filter === 'deployed') return app.deployed;
    if (filter === 'draft') return !app.deployed;
    return true;
  });

  if (!isConnected) {
    return (
      <div className="my-apps">
        <div className="connect-prompt">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your generated apps</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-apps">
      <div className="apps-header">
        <div className="header-content">
          <h1>My Applications</h1>
          <p>View and manage all your generated dApps</p>
        </div>
        <button
          className="new-app-button"
          onClick={() => navigate('/generator')}
        >
          + New App
        </button>
      </div>

      <div className="apps-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({apps.length})
        </button>
        <button
          className={`filter-btn ${filter === 'deployed' ? 'active' : ''}`}
          onClick={() => setFilter('deployed')}
        >
          Deployed ({apps.filter(a => a.deployed).length})
        </button>
        <button
          className={`filter-btn ${filter === 'draft' ? 'active' : ''}`}
          onClick={() => setFilter('draft')}
        >
          Drafts ({apps.filter(a => !a.deployed).length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your apps...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No apps yet</h3>
          <p>
            {filter === 'all'
              ? "You haven't generated any apps yet. Start by creating your first dApp!"
              : `No ${filter} apps found.`}
          </p>
          <button
            className="create-first-button"
            onClick={() => navigate('/generator')}
          >
            Create Your First App
          </button>
        </div>
      ) : (
        <div className="apps-grid">
          {filteredApps.map((app) => (
            <div key={app.id} className="app-card">
              <div className="app-card-header">
                <div className="app-icon">{getAppTypeIcon(app.appType)}</div>
                <div className="app-status">
                  {app.deployed ? (
                    <span className="status-badge deployed">Deployed</span>
                  ) : (
                    <span className="status-badge draft">Draft</span>
                  )}
                </div>
              </div>

              <div className="app-card-body">
                <h3>{app.name || 'Untitled App'}</h3>
                <p className="app-description">
                  {app.description || 'No description provided'}
                </p>

                <div className="app-meta">
                  <div className="meta-item">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value">{app.appType || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span className="meta-value">{formatDate(app.createdAt)}</span>
                  </div>
                  {app.contractAddress && (
                    <div className="meta-item">
                      <span className="meta-label">Contract:</span>
                      <span className="meta-value code">
                        {app.contractAddress.slice(0, 6)}...{app.contractAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="app-card-actions">
                <button
                  className="action-btn view"
                  onClick={() => navigate(`/code-preview/${app.id}`)}
                >
                  View Code
                </button>
                {app.previewUrl && (
                  <button
                    className="action-btn preview"
                    onClick={() => window.open(app.previewUrl, '_blank')}
                  >
                    Preview
                  </button>
                )}
                {!app.deployed && (
                  <button
                    className="action-btn deploy"
                    onClick={() => navigate(`/testnet/${app.id}`)}
                  >
                    Deploy
                  </button>
                )}
                {app.deployed && app.contractAddress && (
                  <button
                    className="action-btn explorer"
                    onClick={() =>
                      window.open(
                        `https://testnet.monadscan.com/address/${app.contractAddress}`,
                        '_blank'
                      )
                    }
                  >
                    Explorer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
