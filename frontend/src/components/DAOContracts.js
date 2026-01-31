import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import './DAOContracts.css';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Approved: '#3b82f6',
  CodeGenerated: '#8b5cf6',
  Compiled: '#06b6d4',
  Deployed: '#10b981',
  Unknown: '#6b7280',
};

const STATUS_ICONS = {
  Pending: '\u23F3',
  Approved: '\u2705',
  CodeGenerated: '\uD83D\uDCBB',
  Compiled: '\u2699\uFE0F',
  Deployed: '\uD83D\uDE80',
  Unknown: '\u2753',
};

const SecurityScoreBar = ({ score }) => {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Secure' : score >= 50 ? 'Caution' : 'Risk';

  return (
    <div className="security-score-bar">
      <div className="security-score-header">
        <span className="security-label">{label}</span>
        <span className="security-value" style={{ color }}>{score}/100</span>
      </div>
      <div className="security-track">
        <div
          className="security-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
};

const DAOContracts = () => {
  const { API_URL } = useWallet();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | deployed
  const [selectedProposal, setSelectedProposal] = useState(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deployedParam = filter === 'deployed' ? '?deployed=true' : '';
      const response = await fetch(`${API_URL}/api/dao-contracts${deployedParam}`);
      const data = await response.json();
      if (data.success) {
        setProposals(data.proposals || []);
      } else {
        setError(data.error || 'Failed to fetch DAO contracts');
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Backend not available. Ensure the server is running.'
          : err.message || 'Failed to fetch DAO contracts'
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, filter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleBuildOn = (proposal) => {
    const contractAddr = proposal.deployedContract;
    const promptText = `Build a frontend dApp that interacts with the DAO-deployed contract at ${contractAddr} on Monad. The contract was created from this prompt: "${proposal.prompt}". Generate React components with ethers.js v6 integration, including contract interaction hooks, a clean UI, and proper error handling.`;

    // Navigate to generator with pre-populated state
    navigate('/generate', {
      state: {
        prefillPrompt: promptText,
        prefillAppType: 'Custom',
        daoContractAddress: contractAddr,
        daoProposalId: proposal.id,
      },
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(38)}`;
  };

  return (
    <div className="dao-contracts">
      <div className="dao-contracts-header">
        <div>
          <h1>DAO-Deployed Contracts</h1>
          <p>Smart contracts deployed through community governance. Build dApps on top of them.</p>
        </div>
        <div className="dao-contracts-actions">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Proposals
            </button>
            <button
              className={`filter-tab ${filter === 'deployed' ? 'active' : ''}`}
              onClick={() => setFilter('deployed')}
            >
              Deployed Only
            </button>
          </div>
          <button className="refresh-button" onClick={fetchProposals} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Fetching DAO contracts...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{'\uD83C\uDFDB\uFE0F'}</div>
          <h3>No Proposals Found</h3>
          <p>
            {filter === 'deployed'
              ? 'No contracts have been deployed through governance yet.'
              : 'No proposals have been created yet. Submit one through the EmpowerTours Farcaster app.'}
          </p>
        </div>
      ) : (
        <>
          {/* Detail Modal */}
          {selectedProposal && (
            <div className="proposal-detail-overlay" onClick={() => setSelectedProposal(null)}>
              <div className="proposal-detail-card" onClick={(e) => e.stopPropagation()}>
                <div className="detail-header">
                  <h2>Proposal #{selectedProposal.id}</h2>
                  <button
                    className="detail-close"
                    onClick={() => setSelectedProposal(null)}
                  >
                    {'\u2715'}
                  </button>
                </div>

                <div className="detail-status">
                  <span
                    className="status-badge large"
                    style={{ background: STATUS_COLORS[selectedProposal.status] }}
                  >
                    {STATUS_ICONS[selectedProposal.status]} {selectedProposal.status}
                  </span>
                  {selectedProposal.securityScore > 0 && (
                    <SecurityScoreBar score={selectedProposal.securityScore} />
                  )}
                </div>

                <div className="detail-section">
                  <h4>Prompt</h4>
                  <p className="detail-prompt">{selectedProposal.prompt}</p>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Proposer</span>
                    <span className="detail-value mono">{truncateAddress(selectedProposal.proposer)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{formatDate(selectedProposal.createdAt)}</span>
                  </div>
                  {selectedProposal.deployedContract && (
                    <div className="detail-item">
                      <span className="detail-label">Contract</span>
                      <span className="detail-value mono">{truncateAddress(selectedProposal.deployedContract)}</span>
                    </div>
                  )}
                  {selectedProposal.deployedAt > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">Deployed</span>
                      <span className="detail-value">{formatDate(selectedProposal.deployedAt)}</span>
                    </div>
                  )}
                  {selectedProposal.ipfsCodeHash && (
                    <div className="detail-item">
                      <span className="detail-label">IPFS Code</span>
                      <a
                        className="detail-value link"
                        href={`https://gateway.pinata.cloud/ipfs/${selectedProposal.ipfsCodeHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Source
                      </a>
                    </div>
                  )}
                  {selectedProposal.treasuryAllocation > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">Treasury</span>
                      <span className="detail-value">{selectedProposal.treasuryAllocation / 100}%</span>
                    </div>
                  )}
                </div>

                {/* Pipeline Progress */}
                <div className="detail-pipeline">
                  <h4>Pipeline</h4>
                  <div className="pipeline-steps">
                    {['Pending', 'Approved', 'CodeGenerated', 'Compiled', 'Deployed'].map((step, i) => {
                      const stepIndex = ['Pending', 'Approved', 'CodeGenerated', 'Compiled', 'Deployed'].indexOf(selectedProposal.status);
                      const isComplete = i <= stepIndex;
                      const isActive = i === stepIndex;
                      return (
                        <div key={step} className="pipeline-step-item">
                          <div className={`pipeline-dot ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''}`}>
                            {isComplete ? '\u2713' : i + 1}
                          </div>
                          <span className={`pipeline-label ${isComplete ? 'complete' : ''}`}>
                            {step === 'CodeGenerated' ? 'Generated' : step}
                          </span>
                          {i < 4 && <div className={`pipeline-line ${isComplete && i < stepIndex ? 'complete' : ''}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedProposal.isDeployed && (
                  <button
                    className="build-on-button large"
                    onClick={() => {
                      setSelectedProposal(null);
                      handleBuildOn(selectedProposal);
                    }}
                  >
                    Build a dApp on This Contract
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Proposals Grid */}
          <div className="proposals-grid">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className={`proposal-card ${proposal.isDeployed ? 'deployed' : ''}`}
                onClick={() => setSelectedProposal(proposal)}
              >
                <div className="proposal-card-header">
                  <span className="proposal-id">#{proposal.id}</span>
                  <span
                    className="status-badge"
                    style={{ background: STATUS_COLORS[proposal.status] }}
                  >
                    {STATUS_ICONS[proposal.status]} {proposal.status}
                  </span>
                </div>

                <p className="proposal-prompt">{proposal.prompt}</p>

                {proposal.securityScore > 0 && (
                  <SecurityScoreBar score={proposal.securityScore} />
                )}

                <div className="proposal-meta">
                  <span className="meta-item">
                    {formatDate(proposal.createdAt)}
                  </span>
                  {proposal.deployedContract && (
                    <span className="meta-item mono">
                      {truncateAddress(proposal.deployedContract)}
                    </span>
                  )}
                </div>

                {/* Mini pipeline dots */}
                <div className="mini-pipeline">
                  {['Pending', 'Approved', 'CodeGenerated', 'Compiled', 'Deployed'].map((step, i) => {
                    const stepIndex = ['Pending', 'Approved', 'CodeGenerated', 'Compiled', 'Deployed'].indexOf(proposal.status);
                    return (
                      <div
                        key={step}
                        className={`mini-dot ${i <= stepIndex ? 'complete' : ''} ${i === stepIndex ? 'active' : ''}`}
                        title={step === 'CodeGenerated' ? 'Generated' : step}
                      />
                    );
                  })}
                </div>

                {proposal.isDeployed && (
                  <button
                    className="build-on-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuildOn(proposal);
                    }}
                  >
                    Build dApp
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DAOContracts;
