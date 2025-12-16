import React, { useState } from 'react';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import './LivePreview.css';

const LivePreview = ({ generatedCode, metadata }) => {
  const { API_URL, authToken } = useWallet();

  const [building, setBuilding] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const buildPreview = async () => {
    if (!generatedCode?.frontend) {
      setError('No frontend code to preview');
      return;
    }

    setBuilding(true);
    setError(null);

    try {
      console.log('🔨 Building live preview...');

      const response = await axios.post(
        `${API_URL}/api/preview/build`,
        {
          generatedCode,
          metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const previewId = response.data.preview.previewId;
      const url = `${API_URL}/api/preview/${previewId}`;

      setPreviewUrl(url);
      console.log('✅ Preview ready:', url);

    } catch (err) {
      console.error('Preview build failed:', err);
      setError(err.response?.data?.error || 'Failed to build preview');
    } finally {
      setBuilding(false);
    }
  };

  if (error) {
    return (
      <div className="live-preview">
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
        <button className="retry-button" onClick={buildPreview}>
          🔄 Try Again
        </button>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="live-preview">
        <div className="preview-intro">
          <h3>🚀 Live Preview</h3>
          <p>See your generated dApp in action! We'll build and deploy a temporary preview.</p>

          <div className="info-box">
            <h4>What you'll get:</h4>
            <ul>
              <li>✅ Fully functional React app</li>
              <li>✅ Connected to Monad Testnet</li>
              <li>✅ Real smart contract interactions</li>
              <li>✅ Preview available for 24 hours</li>
            </ul>
          </div>

          <button
            className="build-preview-button"
            onClick={buildPreview}
            disabled={building}
          >
            {building ? '⏳ Building Preview...' : '🔨 Build Live Preview'}
          </button>

          {building && (
            <div className="building-status">
              <div className="spinner"></div>
              <p>Compiling React app... (5-10 seconds)</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="live-preview">
      <div className="preview-ready">
        <div className="preview-header">
          <h3>✅ Live Preview Ready!</h3>
          <p>Your dApp is running on a temporary preview server</p>
        </div>

        <div className="preview-actions">
          <button
            className="open-preview-button"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            🚀 Open in New Tab
          </button>

          <button
            className="copy-url-button"
            onClick={() => {
              navigator.clipboard.writeText(previewUrl);
              alert('Preview URL copied!');
            }}
          >
            📋 Copy URL
          </button>
        </div>

        <div className="preview-frame-container">
          <div className="frame-header">
            <span className="frame-url">{previewUrl}</span>
          </div>
          <iframe
            src={previewUrl}
            className="preview-iframe"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>

        <div className="preview-info">
          <h4>💡 Testing Tips:</h4>
          <ul>
            <li>Connect your wallet to Monad Testnet</li>
            <li>Interact with the deployed contract</li>
            <li>Test all features thoroughly</li>
            <li>Preview expires in 24 hours</li>
          </ul>
        </div>

        <button
          className="rebuild-button"
          onClick={() => {
            setPreviewUrl(null);
            buildPreview();
          }}
        >
          🔄 Rebuild Preview
        </button>
      </div>
    </div>
  );
};

export default LivePreview;
