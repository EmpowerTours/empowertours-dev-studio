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
import DAOContracts from './components/DAOContracts';

// Context
import { NetworkProvider } from './context/NetworkContext';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import { ContractProvider } from './context/ContractContext';
import { ApiProvider } from './context/ApiContext';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  // Check if wallet is connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          setIsConnected(accounts.length > 0);
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
      } else {
        window.location.reload();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    checkConnection();
    setupListeners();
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <NetworkProvider>
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
                  <Route path="/dao-contracts" element={<DAOContracts />} />
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
                  <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer">
                    Claude AI
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
        </NetworkProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
