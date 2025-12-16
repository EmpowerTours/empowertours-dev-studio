import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import './PushToGitHub.css';

const PushToGitHub = ({ generatedCode, metadata }) => {
  const { API_URL, authToken } = useWallet();

  const [githubToken, setGithubToken] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Set default repo name from metadata
  useEffect(() => {
    if (metadata?.title && !repoName) {
      const sanitized = metadata.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setRepoName(sanitized);
    }
    if (metadata?.description && !description) {
      setDescription(metadata.description);
    }
  }, [metadata]);

  // Check for GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !githubToken) {
      handleGitHubCallback(code);
    }
  }, []);

  const connectGitHub = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/github/auth`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Redirect to GitHub OAuth
      window.location.href = response.data.authUrl;

    } catch (err) {
      setError('Failed to connect to GitHub');
      console.error(err);
    }
  };

  const handleGitHubCallback = async (code) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/github/callback`,
        { code },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      setGithubToken(response.data.accessToken);
      setGithubUser(response.data.user);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (err) {
      setError('GitHub authentication failed');
      console.error(err);
    }
  };

  const pushToGitHub = async () => {
    if (!repoName.trim()) {
      setError('Repository name is required');
      return;
    }

    setPushing(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/github/create-repo`,
        {
          accessToken: githubToken,
          repoName: repoName.trim(),
          description: description.trim(),
          generatedCode,
          isPrivate
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      setResult(response.data);
      console.log('✅ Pushed to GitHub:', response.data);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to push to GitHub');
      console.error(err);
    } finally {
      setPushing(false);
    }
  };

  if (!githubToken) {
    return (
      <div className="push-to-github">
        <div className="github-connect">
          <h3>🐙 Push to GitHub</h3>
          <p>Connect your GitHub account to push this generated code to a new repository.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="github-connect-button" onClick={connectGitHub}>
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Connect GitHub
          </button>

          <div className="info-box">
            <h4>What happens next?</h4>
            <ul>
              <li>You'll authorize EmpowerTours to create repos</li>
              <li>We'll create a new repository in your account</li>
              <li>All generated code will be pushed there</li>
              <li>You'll have full control over the repo</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="push-to-github">
        <div className="github-success">
          <div className="success-icon">✅</div>
          <h3>Pushed to GitHub!</h3>

          <div className="repo-info">
            <div className="info-item">
              <span className="label">Repository:</span>
              <a
                href={result.repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                {result.repository.fullName}
              </a>
            </div>

            <div className="info-item">
              <span className="label">Commit:</span>
              <a
                href={result.commit.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="commit-link"
              >
                View Initial Commit
              </a>
            </div>

            <div className="info-item">
              <span className="label">Clone URL:</span>
              <code className="clone-url">{result.repository.cloneUrl}</code>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(result.repository.cloneUrl);
                  alert('Clone URL copied!');
                }}
              >
                📋
              </button>
            </div>
          </div>

          <div className="next-steps">
            <h4>🚀 Next Steps:</h4>
            <ol>
              <li>Clone the repository: <code>git clone {result.repository.cloneUrl}</code></li>
              <li>Install dependencies: <code>npm install</code></li>
              <li>Configure .env file with your keys</li>
              <li>Deploy to Monad: <code>npx hardhat deploy</code></li>
            </ol>
          </div>

          <button
            className="view-repo-button"
            onClick={() => window.open(result.repository.url, '_blank')}
          >
            View on GitHub →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="push-to-github">
      <div className="github-form">
        <div className="github-user">
          <img src={githubUser.avatarUrl} alt={githubUser.username} className="avatar" />
          <div>
            <strong>{githubUser.name || githubUser.username}</strong>
            <span className="username">@{githubUser.username}</span>
          </div>
        </div>

        <h3>Create Repository</h3>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label>Repository Name *</label>
          <input
            type="text"
            className="input"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="my-awesome-dapp"
          />
          <small>Will be created as: {githubUser.username}/{repoName}</small>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Generated by EmpowerTours Dev Studio"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Make repository private
          </label>
        </div>

        <div className="files-preview">
          <h4>Files to be created:</h4>
          <ul>
            {generatedCode.contracts && Object.keys(generatedCode.contracts).map(file => (
              <li key={file}>📄 contracts/{file}</li>
            ))}
            {generatedCode.deploy && Object.keys(generatedCode.deploy).map(file => (
              <li key={file}>📄 deploy/{file}</li>
            ))}
            {generatedCode.test && Object.keys(generatedCode.test).map(file => (
              <li key={file}>📄 test/{file}</li>
            ))}
            {generatedCode.frontend && Object.keys(generatedCode.frontend).map(file => (
              <li key={file}>📄 frontend/src/{file}</li>
            ))}
            <li>📄 README.md</li>
            <li>📄 package.json</li>
            <li>📄 hardhat.config.js</li>
          </ul>
        </div>

        <button
          className="push-button"
          onClick={pushToGitHub}
          disabled={pushing || !repoName.trim()}
        >
          {pushing ? '⏳ Creating Repository...' : '🚀 Push to GitHub'}
        </button>
      </div>
    </div>
  );
};

export default PushToGitHub;
