import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useNetwork } from './NetworkContext';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { networkConfig } = useNetwork();
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();

          setProvider(provider);
          setSigner(signer);
          setAccount(address);
          setNetwork(network);
          setIsConnected(true);
          setIsCorrectNetwork(network.chainId === BigInt(networkConfig.chainIdInt));
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    }
  }, [networkConfig.chainIdInt]);

  useEffect(() => {
    checkConnection();

    // Load saved auth token
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, [checkConnection]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app!');
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setNetwork(network);
      setIsConnected(true);

      // Check network
      const correctNetwork = network.chainId === BigInt(networkConfig.chainIdInt);
      setIsCorrectNetwork(correctNetwork);

      if (!correctNetwork) {
        await switchToNetwork();
      }

      // Authenticate with backend
      await authenticateUser(address, signer);

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const switchToNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }]
      });

      setIsCorrectNetwork(true);
    } catch (error) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: networkConfig.chainId,
              chainName: networkConfig.name,
              nativeCurrency: networkConfig.nativeCurrency,
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: [networkConfig.explorerUrl]
            }]
          });

          setIsCorrectNetwork(true);
        } catch (addError) {
          console.error('Failed to add network:', addError);
          alert(`Failed to add ${networkConfig.name}. Please add it manually.`);
        }
      } else {
        console.error('Failed to switch network:', error);
      }
    }
  };

  const authenticateUser = async (address, signer) => {
    try {
      // Get nonce from backend
      const nonceRes = await axios.get(`${API_URL}/api/auth/nonce/${address}`);
      const { message } = nonceRes.data;

      // Sign message
      const signature = await signer.signMessage(message);

      // Verify signature and get JWT
      const authRes = await axios.post(`${API_URL}/api/auth/verify`, {
        address,
        signature
      });

      const { token } = authRes.data;

      // Save token
      setAuthToken(token);
      localStorage.setItem('authToken', token);

      console.log('✅ Authenticated successfully');

    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setNetwork(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setAuthToken(null);
    localStorage.removeItem('authToken');
  };

  const value = {
    account,
    provider,
    signer,
    network,
    isConnected,
    isCorrectNetwork,
    authToken,
    loading,
    connectWallet,
    disconnectWallet,
    switchToNetwork,
    API_URL,
    address: account
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
