import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodePreview.css';

const CodePreview = ({ data, isPreview }) => {
  const [activeFile, setActiveFile] = useState(null);
  const [activeCategory, setActiveCategory] = useState('contracts');

  const code = data.code || {};
  const metadata = data.metadata || {};

  // Build file structure
  const files = {};

  if (code.contracts) {
    files.contracts = Object.keys(code.contracts).map(name => ({
      name,
      content: code.contracts[name],
      language: 'solidity'
    }));
  }

  if (code.deploy) {
    files.deploy = Object.keys(code.deploy).map(name => ({
      name,
      content: code.deploy[name],
      language: 'javascript'
    }));
  }

  if (code.test) {
    files.test = Object.keys(code.test).map(name => ({
      name,
      content: code.test[name],
      language: 'javascript'
    }));
  }

  if (code.frontend) {
    files.frontend = Object.keys(code.frontend).map(name => ({
      name,
      content: code.frontend[name],
      language: 'javascript'
    }));
  }

  if (code.readme) {
    files.readme = [{
      name: 'README.md',
      content: code.readme,
      language: 'markdown'
    }];
  }

  // Set initial active file
  if (!activeFile && files[activeCategory]?.length > 0) {
    setActiveFile(files[activeCategory][0]);
  }

  const downloadCode = () => {
    const zip = {
      contracts: code.contracts || {},
      deploy: code.deploy || {},
      test: code.test || {},
      frontend: code.frontend || {},
      'README.md': code.readme || ''
    };

    const dataStr = JSON.stringify(zip, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metadata.title || 'generated-app'}.json`;
    link.click();
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="code-preview">
      {isPreview && (
        <div className="preview-banner">
          ⚠️ This is a limited preview. Full generation includes complete tests, deployment scripts, and production-ready code.
        </div>
      )}

      <div className="code-header">
        <div>
          <h2>{metadata.title || 'Generated dApp'}</h2>
          <p>{metadata.description}</p>
          {metadata.features && metadata.features.length > 0 && (
            <div className="features">
              {metadata.features.map((feature, i) => (
                <span key={i} className="feature-tag">✓ {feature}</span>
              ))}
            </div>
          )}
        </div>

        <button className="download-button" onClick={downloadCode}>
          📥 Download All Files
        </button>
      </div>

      <div className="code-body">
        <div className="file-sidebar">
          <div className="file-categories">
            {Object.keys(files).map(category => (
              <div key={category}>
                <div
                  className={`category-header ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  📁 {category}
                </div>
                {activeCategory === category && files[category]?.map((file, i) => (
                  <div
                    key={i}
                    className={`file-item ${activeFile?.name === file.name ? 'active' : ''}`}
                    onClick={() => setActiveFile(file)}
                  >
                    📄 {file.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="code-viewer">
          {activeFile ? (
            <>
              <div className="viewer-header">
                <span className="file-name">{activeFile.name}</span>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(activeFile.content)}
                >
                  📋 Copy
                </button>
              </div>

              <SyntaxHighlighter
                language={activeFile.language}
                style={vscDarkPlus}
                showLineNumbers
                wrapLines
              >
                {activeFile.content}
              </SyntaxHighlighter>
            </>
          ) : (
            <div className="no-file-selected">
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>

      {data.cost && (
        <div className="cost-info">
          <h4>💰 Generation Cost</h4>
          <p>
            Input: {data.cost.inputTokens} tokens (${data.cost.inputCost})
            {' • '}
            Output: {data.cost.outputTokens} tokens (${data.cost.outputCost})
            {' • '}
            <strong>Total: {data.cost.totalCostUSD}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default CodePreview;
