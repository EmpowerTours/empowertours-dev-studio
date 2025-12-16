const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n🚀 Deploying EmpowerTours Dev Studio...");
  console.log("Deployer:", deployer);

  // Get $TOURS token address from env or use placeholder for testnet
  const TOURS_TOKEN = process.env.TOURS_TOKEN_ADDRESS || ethers.ZeroAddress;

  if (TOURS_TOKEN === ethers.ZeroAddress) {
    console.warn("⚠️  WARNING: No TOURS token address set, using zero address");
  }

  const studio = await deploy("EmpowerToursDevStudio", {
    from: deployer,
    args: [TOURS_TOKEN],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  console.log("\n✅ Contract deployed to:", studio.address);
  console.log("📊 Gas used:", studio.receipt.gasUsed.toString());
  console.log("💰 Deployment cost:", ethers.formatEther(studio.receipt.gasUsed * 100n), "MON (at 100 gwei)");

  // Fund contract with some MON for initial operations if mainnet
  if (network.name === "monadMainnet") {
    console.log("\n💵 Funding contract with 10 MON...");
    const signer = await ethers.getSigner(deployer);
    const tx = await signer.sendTransaction({
      to: studio.address,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    console.log("✅ Contract funded");
  }

  console.log("\n📝 Next steps:");
  console.log("1. Verify contract: npx hardhat verify --network", network.name, studio.address, TOURS_TOKEN);
  console.log("2. Update .env with: STUDIO_CONTRACT_ADDRESS=" + studio.address);
  console.log("3. Fund with TOURS for airdrops: Call fundTOURS() with 100,000 TOURS");

  return true;
};

module.exports.tags = ["EmpowerToursDevStudio", "main"];
