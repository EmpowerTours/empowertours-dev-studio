require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz",
      chainId: 41454, // Monad testnet chain ID
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 100, // 100 gwei
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC || "https://rpc.monad.xyz",
      chainId: 143, // Monad mainnet chain ID
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 100, // 100 gwei
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  // Hardhat 3+ verification config
  chainDescriptors: {
    41454: { // Monad Testnet
      name: "monadTestnet",
      blockExplorers: {
        etherscan: {
          name: "Monad Testnet Explorer",
          url: "https://testnet.monadscan.com",
          apiUrl: "https://testnet.monadscan.com/api", // From foundry.toml
        },
      },
    },
    143: { // Monad Mainnet
      name: "monadMainnet",
      blockExplorers: {
        etherscan: {
          name: "Monad Explorer",
          url: "https://monadscan.com",
          apiUrl: "https://monadscan.com/api",
        },
      },
    },
  },
  // Legacy etherscan config (for Hardhat 2.x compatibility)
  etherscan: {
    apiKey: {
      monadTestnet: process.env.MONAD_SCAN_API_KEY || "abc123",
      monadMainnet: process.env.MONAD_SCAN_API_KEY || "abc123",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 41454,
        urls: {
          apiURL: "https://testnet.monadscan.com/api",
          browserURL: "https://testnet.monadscan.com"
        }
      },
      {
        network: "monadMainnet",
        chainId: 143,
        urls: {
          apiURL: "https://monadscan.com/api",
          browserURL: "https://monadscan.com"
        }
      }
    ]
  },
  sourcify: {
    enabled: false // Disable Sourcify for Monad
  }
};
