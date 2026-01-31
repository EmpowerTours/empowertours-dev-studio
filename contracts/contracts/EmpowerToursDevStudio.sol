// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EmpowerToursDevStudio
 * @notice AI-powered dApp generation platform with Grok 4.1 integration
 * @dev Pay-per-prompt model with whitelist NFT perks
 *
 * Payment Model:
 * - MON only (TOURS payments removed for simplicity)
 * - 100 MON per generation (50 MON for whitelisted users)
 * - 1,000 whitelist spots available
 * - 2,000 TOURS airdrop for whitelist members
 *
 * Gas Estimates (at 100 gwei):
 * - Deploy: ~2,400,000 gas = 0.24 MON
 * - buyCreditsWithMON: ~65,000 gas = 0.0065 MON
 * - mintAppNFT: ~120,000 gas = 0.012 MON
 * - mintWhitelistNFT: ~180,000 gas = 0.018 MON
 */
contract EmpowerToursDevStudio is ERC721, Ownable, ReentrancyGuard {
    // ============================================
    // Constants & Immutables
    // ============================================

    /// @notice Cost per AI generation in MON (18 decimals)
    uint256 public constant PROMPT_COST = 100 ether; // 100 MON

    /// @notice Whitelist spots
    uint16 public constant WHITELIST_MAX = 1000;

    /// @notice Whitelist discount percentage
    uint8 public constant WHITELIST_DISCOUNT = 50; // 50% off

    /// @notice $TOURS airdrop for whitelist users
    uint256 public constant TOURS_AIRDROP = 2000 ether; // 2000 TOURS

    /// @notice $TOURS token contract
    IERC20 public immutable toursToken;

    // ============================================
    // State Variables
    // ============================================

    /// @notice NFT token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Whitelist counter
    uint16 public whitelistCounter;

    /// @notice Whitelist status
    bool public whitelistOpen = true;

    /// @notice User generation credits
    mapping(address => uint256) public credits;

    /// @notice Whitelist membership
    mapping(address => bool) public isWhitelisted;

    /// @notice Whitelist NFT marker (for soulbound check)
    mapping(uint256 => bool) private _isWhitelistToken;

    /// @notice App metadata (IPFS CID)
    mapping(uint256 => string) private _appMetadata;

    /// @notice Security scan score per NFT (0-100)
    mapping(uint256 => uint256) public securityScore;

    /// @notice DAO proposal ID reference (if dApp was built for a DAO-deployed contract)
    mapping(uint256 => uint256) public daoProposalId;

    /// @notice User's first generation timestamp (for whitelist tracking)
    mapping(address => uint256) public firstGeneration;

    // ============================================
    // Events
    // ============================================

    event CreditsPurchased(address indexed user, uint256 amount, uint256 cost);
    event PromptGenerated(address indexed user, uint256 indexed tokenId, string appType);
    event WhitelistMinted(address indexed user, uint256 indexed tokenId, uint256 timestamp);
    event ToursAirdropped(address indexed user, uint256 amount);
    event WhitelistClosed(uint256 finalCount, uint256 timestamp);

    // ============================================
    // Errors
    // ============================================

    error InvalidAmount();
    error InsufficientPayment();
    error NoCredits();
    error WhitelistNotOpen();
    error WhitelistFull();
    error AlreadyWhitelisted();
    error NeedPaidPrompt();
    error InvalidMetadata();
    error WhitelistSoulbound();

    // ============================================
    // Constructor
    // ============================================

    constructor(address _toursToken)
        ERC721("EmpowerTours Dev Studio", "ETDS")
        Ownable(msg.sender)
    {
        require(_toursToken != address(0), "Invalid TOURS address");
        toursToken = IERC20(_toursToken);
    }

    // ============================================
    // Credit Management
    // ============================================

    /**
     * @notice Buy generation credits with MON
     * @param numPrompts Number of credits to purchase
     * @dev Whitelisted users get 50% discount
     */
    function buyCreditsWithMON(uint256 numPrompts) external payable nonReentrant {
        if (numPrompts == 0) revert InvalidAmount();

        uint256 cost = PROMPT_COST * numPrompts;

        // Apply whitelist discount
        if (isWhitelisted[msg.sender]) {
            cost = (cost * WHITELIST_DISCOUNT) / 100;
        }

        if (msg.value < cost) revert InsufficientPayment();

        credits[msg.sender] += numPrompts;

        // Track first generation for whitelist eligibility
        if (firstGeneration[msg.sender] == 0) {
            firstGeneration[msg.sender] = block.timestamp;
        }

        // Refund excess
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit CreditsPurchased(msg.sender, numPrompts, cost);
    }

    /**
     * @notice Burn a credit after generation (backend only)
     * @param user User who used the credit
     */
    function burnCredit(address user) external onlyOwner {
        if (credits[user] == 0) revert NoCredits();
        credits[user]--;
    }

    // ============================================
    // NFT Minting
    // ============================================

    /**
     * @notice Mint NFT for generated app (backend only)
     * @param user User who generated the app
     * @param appMetadata IPFS CID of app code/metadata
     * @param appType Type of app generated
     * @return tokenId Minted token ID
     */
    function mintAppNFT(
        address user,
        string memory appMetadata,
        string memory appType
    ) external onlyOwner returns (uint256) {
        if (bytes(appMetadata).length == 0) revert InvalidMetadata();

        unchecked {
            _tokenIdCounter++;
        }

        uint256 tokenId = _tokenIdCounter;

        _safeMint(user, tokenId);
        _appMetadata[tokenId] = appMetadata;

        emit PromptGenerated(user, tokenId, appType);

        return tokenId;
    }

    /**
     * @notice Set security score for an app NFT (backend only)
     * @param tokenId NFT token ID
     * @param score Security score (0-100)
     */
    function setSecurityScore(uint256 tokenId, uint256 score) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        require(score <= 100, "Score exceeds 100");
        securityScore[tokenId] = score;
    }

    /**
     * @notice Set DAO proposal reference for an app NFT (backend only)
     * @param tokenId NFT token ID
     * @param proposalId DAO factory proposal ID
     */
    function setDaoProposalId(uint256 tokenId, uint256 proposalId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        daoProposalId[tokenId] = proposalId;
    }

    /**
     * @notice Mint whitelist NFT (first 1,000 paid users)
     * @param appMetadata IPFS CID for whitelist perks
     * @return tokenId Minted whitelist token ID
     */
    function mintWhitelistNFT(string memory appMetadata) external nonReentrant returns (uint256) {
        if (!whitelistOpen) revert WhitelistNotOpen();
        if (whitelistCounter >= WHITELIST_MAX) revert WhitelistFull();
        if (isWhitelisted[msg.sender]) revert AlreadyWhitelisted();
        if (firstGeneration[msg.sender] == 0) revert NeedPaidPrompt();

        unchecked {
            whitelistCounter++;
            _tokenIdCounter++;
        }

        uint256 tokenId = _tokenIdCounter;

        isWhitelisted[msg.sender] = true;
        _isWhitelistToken[tokenId] = true;

        _safeMint(msg.sender, tokenId);
        _appMetadata[tokenId] = appMetadata;

        // Airdrop $TOURS if contract has balance
        if (toursToken.balanceOf(address(this)) >= TOURS_AIRDROP) {
            toursToken.transfer(msg.sender, TOURS_AIRDROP);
            emit ToursAirdropped(msg.sender, TOURS_AIRDROP);
        }

        emit WhitelistMinted(msg.sender, tokenId, block.timestamp);

        return tokenId;
    }

    // ============================================
    // Admin Functions
    // ============================================

    /**
     * @notice Close whitelist permanently
     */
    function closeWhitelist() external onlyOwner {
        whitelistOpen = false;
        emit WhitelistClosed(whitelistCounter, block.timestamp);
    }

    // ============================================
    // View Functions
    // ============================================

    /**
     * @notice Get app metadata
     * @param tokenId NFT token ID
     * @return IPFS CID
     */
    function getAppMetadata(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return _appMetadata[tokenId];
    }

    /**
     * @notice Calculate cost for user
     * @param user User address
     * @param numPrompts Number of prompts
     * @return MON cost
     */
    function calculateCost(address user, uint256 numPrompts) external view returns (uint256) {
        uint256 cost = PROMPT_COST * numPrompts;
        if (isWhitelisted[user]) {
            cost = (cost * WHITELIST_DISCOUNT) / 100;
        }
        return cost;
    }

    /**
     * @notice Check whitelist eligibility
     * @param user User address
     * @return eligible True if user can mint whitelist NFT
     */
    function isWhitelistEligible(address user) external view returns (bool) {
        return whitelistOpen &&
               whitelistCounter < WHITELIST_MAX &&
               !isWhitelisted[user] &&
               firstGeneration[user] > 0;
    }

    // ============================================
    // Soulbound Logic
    // ============================================

    /**
     * @notice Prevent whitelist NFT transfers (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Prevent transfers of whitelist NFTs (except mint/burn)
        if (_isWhitelistToken[tokenId] && from != address(0) && to != address(0)) {
            revert WhitelistSoulbound();
        }

        return super._update(to, tokenId, auth);
    }

    // ============================================
    // Treasury
    // ============================================

    /**
     * @notice Withdraw MON to owner
     */
    function withdrawMON() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner()).transfer(balance);
    }

    /**
     * @notice Fund contract with $TOURS for airdrops
     * @dev Owner must approve this contract to spend TOURS first
     */
    function fundTOURS(uint256 amount) external onlyOwner {
        require(
            toursToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Withdraw $TOURS to owner (for emergency recovery)
     */
    function withdrawTOURS() external onlyOwner {
        uint256 balance = toursToken.balanceOf(address(this));
        require(balance > 0, "No TOURS");
        toursToken.transfer(owner(), balance);
    }

    receive() external payable {}
}
