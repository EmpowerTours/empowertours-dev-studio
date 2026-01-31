import React, { createContext, useContext } from 'react';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};

export const NETWORKS = {
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
  const currentNetwork = 'MAINNET';
  const networkConfig = NETWORKS.MAINNET;

  const switchNetwork = () => {
    // Mainnet only — no-op
  };

  const value = {
    currentNetwork,
    networkConfig,
    isTestnet: false,
    isMainnet: true,
    switchNetwork,
    NETWORKS
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
