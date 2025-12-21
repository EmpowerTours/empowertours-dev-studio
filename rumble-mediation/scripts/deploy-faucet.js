const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying TestnetFaucet to Monad testnet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "MON\n");

    // Faucet configuration
    const dripAmount = ethers.utils.parseEther("0.1"); // 0.1 MON per request
    const cooldownPeriod = 3600; // 1 hour cooldown

    console.log("Faucet Configuration:");
    console.log("- Drip amount:", ethers.utils.formatEther(dripAmount), "MON");
    console.log("- Cooldown period:", cooldownPeriod / 60, "minutes\n");

    // Deploy contract
    const TestnetFaucet = await ethers.getContractFactory("TestnetFaucet");
    const faucet = await TestnetFaucet.deploy(dripAmount, cooldownPeriod);
    await faucet.deployed();

    console.log("✅ TestnetFaucet deployed to:", faucet.address);
    console.log("Owner:", await faucet.owner());
    console.log("\n📋 Deployment Summary:");
    console.log("- Contract:", faucet.address);
    console.log("- Network: Monad Testnet (Chain ID 10143)");
    console.log("- Drip Amount:", ethers.utils.formatEther(dripAmount), "MON");
    console.log("- Cooldown:", cooldownPeriod / 60, "minutes");
    console.log("\n💰 Next step: Fund the faucet with:");
    console.log(`   cast send ${faucet.address} --value 5ether --private-key $PRIVATE_KEY --rpc-url https://testnet.monad.xyz`);
    console.log("\n🔍 Verify on Monadscan:");
    console.log(`   https://testnet.monad.xyz/address/${faucet.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
