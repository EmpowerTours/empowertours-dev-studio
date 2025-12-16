import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Generator from './components/Generator';
import MyApps from './components/MyApps';
import Whitelist from './components/Whitelist';
import Credits from './components/Credits';

// Context
import { WalletProvider } from './context/WalletContext';
import { ContractProvider } from './context/ContractContext';
import { ApiProvider } from './context/ApiContext';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);

  // Check if wallet is connected on mount
  useEffect(() => {
    checkConnection();
    setupListeners();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();

          setAccount(address);
          setNetwork(network);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    }
  };

  const setupListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount(null);
    } else {
      setAccount(accounts[0]);
      window.location.reload();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  return (
    <Router>
      <WalletProvider>
        <ContractProvider>
          <ApiProvider>
            <div className="App">
              <Navbar />

              <div className="container">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/generate" element={
                    isConnected ? <Generator /> : <Navigate to="/" />
                  } />
                  <Route path="/my-apps" element={
                    isConnected ? <MyApps /> : <Navigate to="/" />
                  } />
                  <Route path="/whitelist" element={
                    isConnected ? <Whitelist /> : <Navigate to="/" />
                  } />
                  <Route path="/credits" element={
                    isConnected ? <Credits /> : <Navigate to="/" />
                  } />
                </Routes>
              </div>

              <footer className="footer">
                <p>
                  🚀 Powered by <strong>EmpowerTours Dev Studio</strong> on Monad Blockchain
                </p>
                <p className="footer-links">
                  <a href="https://monad.xyz" target="_blank" rel="noopener noreferrer">
                    Monad
                  </a>
                  {' • '}
                  <a href="https://x.ai" target="_blank" rel="noopener noreferrer">
                    Grok AI
                  </a>
                  {' • '}
                  <a href="https://empowertours.com" target="_blank" rel="noopener noreferrer">
                    EmpowerTours
                  </a>
                </p>
              </footer>
            </div>
          </ApiProvider>
        </ContractProvider>
      </WalletProvider>
    </Router>
  );
}

export default App;
