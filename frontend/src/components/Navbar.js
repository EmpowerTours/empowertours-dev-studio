import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useContract } from '../context/ContractContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { account, isConnected, isCorrectNetwork, connectWallet, disconnectWallet, switchToNetwork, loading } = useWallet();
  const { credits, isWhitelisted } = useContract();
  const { theme, toggleTheme } = useTheme();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🚀 EmpowerTours Dev Studio
        </Link>

        <div className="navbar-left-controls">
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Dashboard</Link>
          <Link to="/generate" className="navbar-item">Generate</Link>
          <Link to="/my-apps" className="navbar-item">My Apps</Link>
          <Link to="/whitelist" className="navbar-item">Whitelist</Link>
          <Link to="/credits" className="navbar-item">Credits</Link>
          <Link to="/dao-contracts" className="navbar-item">DAO Contracts</Link>
        </div>

        <div className="navbar-right">
          {isConnected && (
            <div className="navbar-info">
              {isWhitelisted && <span className="whitelist-badge">⭐ Whitelisted</span>}
              <span className="credits-badge">{credits} Credits</span>
            </div>
          )}

          {!isConnected ? (
            <button
              className="connect-button"
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : !isCorrectNetwork ? (
            <button
              className="network-button wrong-network"
              onClick={switchToNetwork}
            >
              Switch to Monad Mainnet
            </button>
          ) : (
            <div className="wallet-info">
              <span className="network-indicator mainnet">
                Monad Mainnet
              </span>
              <button className="address-button" onClick={disconnectWallet}>
                {formatAddress(account)}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
