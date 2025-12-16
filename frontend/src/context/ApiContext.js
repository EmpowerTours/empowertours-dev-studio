import React, { createContext, useContext } from 'react';
import axios from 'axios';
import { useWallet } from './WalletContext';

const ApiContext = createContext();

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const { authToken, API_URL } = useWallet();

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  });

  // Generate dApp
  const generateDApp = async (prompt, appType, options = {}) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/generate`,
        { prompt, appType, options },
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get generated app by token ID
  const getGeneratedApp = async (tokenId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/generate/${tokenId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Preview generation (no credit burn)
  const previewGeneration = async (prompt, appType) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/generate/preview`,
        { prompt, appType },
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get user credits info
  const getCreditsInfo = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/credits`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Calculate cost
  const calculateCost = async (numPrompts) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/credits/cost/${numPrompts}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get generation history
  const getHistory = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/credits/history`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get NFT metadata
  const getNFTMetadata = async (tokenId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/nft/${tokenId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get user's NFTs
  const getUserNFTs = async (address) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/nft/user/${address}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  // Get whitelist status
  const getWhitelistStatus = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/nft/whitelist/status`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const value = {
    generateDApp,
    getGeneratedApp,
    previewGeneration,
    getCreditsInfo,
    calculateCost,
    getHistory,
    getNFTMetadata,
    getUserNFTs,
    getWhitelistStatus
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};
