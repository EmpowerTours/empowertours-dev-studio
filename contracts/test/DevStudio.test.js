const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EmpowerToursDevStudio", function () {
  let studio, toursToken;
  let owner, user1, user2;
  const PROMPT_COST = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock TOURS token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    toursToken = await MockERC20.deploy("TOURS Token", "TOURS");
    await toursToken.waitForDeployment();

    // Deploy studio
    const Studio = await ethers.getContractFactory("EmpowerToursDevStudio");
    studio = await Studio.deploy(await toursToken.getAddress());
    await studio.waitForDeployment();

    // Mint TOURS to users
    await toursToken.mint(user1.address, ethers.parseEther("10000"));
    await toursToken.mint(await studio.getAddress(), ethers.parseEther("100000"));
  });

  describe("Credit Purchase", function () {
    it("Should allow buying credits with MON", async function () {
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      expect(await studio.credits(user1.address)).to.equal(1);
    });

    it("Should refund excess MON", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST + ethers.parseEther("10") });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter).to.be.closeTo(balanceBefore - PROMPT_COST - gasCost, ethers.parseEther("0.01"));
    });

    it("Should allow buying credits with TOURS", async function () {
      await toursToken.connect(user1).approve(await studio.getAddress(), ethers.parseEther("1000"));
      await studio.connect(user1).buyCreditsWithTOURS(1);
      expect(await studio.credits(user1.address)).to.equal(1);
    });

    it("Should apply whitelist discount", async function () {
      // Buy first credit
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });

      // Mint whitelist NFT
      await studio.connect(user1).mintWhitelistNFT("ipfs://whitelist");

      // Second purchase should be 50% off
      const discountedCost = PROMPT_COST / 2n;
      await studio.connect(user1).buyCreditsWithMON(1, { value: discountedCost });
      expect(await studio.credits(user1.address)).to.equal(1); // 1 remaining (1 bought, 1 burned for whitelist)
    });
  });

  describe("Whitelist NFT", function () {
    it("Should mint whitelist NFT for eligible users", async function () {
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      await studio.connect(user1).mintWhitelistNFT("ipfs://whitelist");

      expect(await studio.isWhitelisted(user1.address)).to.be.true;
      expect(await studio.whitelistCounter()).to.equal(1);
    });

    it("Should airdrop TOURS to whitelist members", async function () {
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      const balanceBefore = await toursToken.balanceOf(user1.address);

      await studio.connect(user1).mintWhitelistNFT("ipfs://whitelist");

      const balanceAfter = await toursToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2000"));
    });

    it("Should prevent whitelist NFT transfers (soulbound)", async function () {
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      const tx = await studio.connect(user1).mintWhitelistNFT("ipfs://whitelist");
      const receipt = await tx.wait();

      // Get token ID from event
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === "WhitelistMinted");
      const tokenId = event.args.tokenId;

      await expect(
        studio.connect(user1).transferFrom(user1.address, user2.address, tokenId)
      ).to.be.revertedWithCustomError(studio, "WhitelistSoulbound");
    });

    it("Should close whitelist at 50 members", async function () {
      // Simulate 50 users
      for (let i = 0; i < 50; i++) {
        const signer = await ethers.getImpersonatedSigner(ethers.Wallet.createRandom().address);
        await owner.sendTransaction({ to: signer.address, value: ethers.parseEther("200") });
        await studio.connect(signer).buyCreditsWithMON(1, { value: PROMPT_COST });
        await studio.connect(signer).mintWhitelistNFT(`ipfs://whitelist-${i}`);
      }

      expect(await studio.whitelistCounter()).to.equal(50);

      // 51st user should fail
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      await expect(
        studio.connect(user1).mintWhitelistNFT("ipfs://whitelist-51")
      ).to.be.revertedWithCustomError(studio, "WhitelistFull");
    });
  });

  describe("App NFT Minting", function () {
    it("Should mint app NFT (owner only)", async function () {
      await studio.mintAppNFT(user1.address, "ipfs://app-metadata", "VRF Game");
      expect(await studio.balanceOf(user1.address)).to.equal(1);
    });

    it("Should prevent non-owners from minting", async function () {
      await expect(
        studio.connect(user1).mintAppNFT(user2.address, "ipfs://app", "Game")
      ).to.be.revertedWithCustomError(studio, "OwnableUnauthorizedAccount");
    });
  });

  describe("Treasury Management", function () {
    it("Should allow owner to withdraw MON", async function () {
      await studio.connect(user1).buyCreditsWithMON(1, { value: PROMPT_COST });
      const balanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await studio.withdrawMON();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.closeTo(balanceBefore + PROMPT_COST - gasCost, ethers.parseEther("0.01"));
    });

    it("Should allow owner to withdraw TOURS", async function () {
      const initialBalance = await toursToken.balanceOf(await studio.getAddress());
      await studio.withdrawTOURS();
      expect(await toursToken.balanceOf(owner.address)).to.equal(initialBalance);
    });
  });
});

// Mock ERC20 for testing
const MockERC20Code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockERC20 is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
  function mint(address to, uint256 amount) external { _mint(to, amount); }
}
`;
