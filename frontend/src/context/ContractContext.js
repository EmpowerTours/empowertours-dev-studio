import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';

const ContractContext = createContext();

export const useContract = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within ContractProvider');
  }
  return context;
};

const STUDIO_ABI = [
  "function credits(address user) view returns (uint256)",
  "function isWhitelisted(address user) view returns (bool)",
  "function whitelistCounter() view returns (uint16)",
  "function calculateCost(address user, uint256 numPrompts) view returns (uint256)",
  "function isWhitelistEligible(address user) view returns (bool)",
  "function buyCreditsWithMON(uint256 numPrompts) payable",
  "function buyCreditsWithTOURS(uint256 numPrompts)",
  "function mintWhitelistNFT(string memory appMetadata) returns (uint256)",
  "function getAppMetadata(uint256 tokenId) view returns (string memory)",
  "function PROMPT_COST() view returns (uint256)",
  "function WHITELIST_MAX() view returns (uint16)",
  "function WHITELIST_DISCOUNT() view returns (uint8)",
  "function TOURS_AIRDROP() view returns (uint256)",
  "event CreditsPurchased(address indexed user, uint256 amount, uint256 cost, bool usedMON)",
  "event PromptGenerated(address indexed user, uint256 indexed tokenId, string appType)",
  "event WhitelistMinted(address indexed user, uint256 indexed tokenId, uint256 timestamp)"
];

export const ContractProvider = ({ children }) => {
  const { signer, account } = useWallet();
  const [contract, setContract] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [isEligible, setIsEligible] = useState(false);

  const CONTRACT_ADDRESS = process.env.REACT_APP_STUDIO_CONTRACT_ADDRESS;

  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        STUDIO_ABI,
        signer
      );
      setContract(contractInstance);
    }
  }, [signer, CONTRACT_ADDRESS]);

  useEffect(() => {
    if (contract && account) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  const loadUserData = async () => {
    if (!contract || !account) return;

    try {
      const [userCredits, whitelisted, wlCount, eligible] = await Promise.all([
        contract.credits(account),
        contract.isWhitelisted(account),
        contract.whitelistCounter(),
        contract.isWhitelistEligible(account)
      ]);

      setCredits(Number(userCredits));
      setIsWhitelisted(whitelisted);
      setWhitelistCount(Number(wlCount));
      setIsEligible(eligible);

    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const buyCredits = async (numPrompts) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      const cost = await contract.calculateCost(account, numPrompts);

      const tx = await contract.buyCreditsWithMON(numPrompts, {
        value: cost
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // Reload data
      await loadUserData();

      return receipt;
    } catch (error) {
      console.error('Failed to buy credits:', error);
      throw error;
    }
  };

  const mintWhitelist = async () => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      const metadataURI = `ipfs://whitelist-${account}-${Date.now()}`;

      const tx = await contract.mintWhitelistNFT(metadataURI);

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Whitelist NFT minted:', receipt.hash);

      // Reload data
      await loadUserData();

      return receipt;
    } catch (error) {
      console.error('Failed to mint whitelist NFT:', error);
      throw error;
    }
  };

  const calculateCost = async (numPrompts) => {
    if (!contract || !account) return '0';

    try {
      const cost = await contract.calculateCost(account, numPrompts);
      return ethers.formatEther(cost);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      return '0';
    }
  };

  const value = {
    contract,
    credits,
    isWhitelisted,
    whitelistCount,
    isEligible,
    buyCredits,
    mintWhitelist,
    calculateCost,
    loadUserData,
    CONTRACT_ADDRESS
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};
