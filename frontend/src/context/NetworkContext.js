import React, { createContext, useState, useContext, useEffect } from 'react';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};

export const NETWORKS = {
  TESTNET: {
    name: 'Monad Testnet',
    chainId: '0x279f', // 10143
    chainIdInt: 10143,
    rpcUrl: 'https://rpc-testnet.monadinfra.com/',
    explorerUrl: 'https://testnet.monadscan.com',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18
    }
  },
  MAINNET: {
    name: 'Monad Mainnet',
    chainId: '0x8f', // 143
    chainIdInt: 143,
    rpcUrl: 'https://rpc.monad.xyz',
    explorerUrl: 'https://monadscan.com',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18
    }
  }
};

export const NetworkProvider = ({ children }) => {
  const [currentNetwork, setCurrentNetwork] = useState(() => {
    // Load from localStorage or default to testnet
    const saved = localStorage.getItem('selectedNetwork');
    return saved === 'MAINNET' ? 'MAINNET' : 'TESTNET';
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem('selectedNetwork', currentNetwork);
  }, [currentNetwork]);

  const switchNetwork = (network) => {
    if (network !== 'TESTNET' && network !== 'MAINNET') {
      console.error('Invalid network:', network);
      return;
    }
    setCurrentNetwork(network);
  };

  const getNetworkConfig = () => {
    return NETWORKS[currentNetwork];
  };

  const isTestnet = currentNetwork === 'TESTNET';
  const isMainnet = currentNetwork === 'MAINNET';

  const value = {
    currentNetwork,
    networkConfig: getNetworkConfig(),
    isTestnet,
    isMainnet,
    switchNetwork,
    NETWORKS
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
