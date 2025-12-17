// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RumbleMediationTestnet
 * @notice TESTNET VERSION - Ultra-secure mediation contract enforcing 5% fully diluted equity
 * @dev Partnership: 0.05 MON + 5% equity | Settlement: 0.025 MON (TESTNET AMOUNTS ONLY)
 * @custom:security-contact security@empowertours.com
 * @custom:beneficiary 0x5635e21B1EA43B65b3Bf96283B09D094478e2793
 * @custom:testnet-warning THIS IS A TESTNET CONTRACT WITH LOW AMOUNTS FOR TESTING ONLY
 */
contract RumbleMediationTestnet {

    // ============ Constants ============

    address public constant CREATOR = 0x5635e21B1EA43B65b3Bf96283B09D094478e2793;

    // TESTNET AMOUNTS (For testing withdrawal flow)
    uint256 public constant PARTNERSHIP_BOND = 0.05 ether; // 0.05 MON (testnet)
    uint256 public constant SETTLEMENT_AMOUNT = 0.025 ether;  // 0.025 MON (testnet)

    // Equity Terms (same as mainnet)
    uint256 public constant PARTNERSHIP_EQUITY = 500; // 5.00% in basis points
    string public constant EQUITY_CLASS = "Fully diluted, same class as founders/common";
    string public constant EQUITY_RIGHTS = "Non-forfeitable, no repurchase, no clawback, no drag-along without consent";

    // Security Timelocks (reduced for testing)
    uint256 public constant ACCEPTANCE_TIMELOCK = 5 minutes;   // 5min for testnet
    uint256 public constant WITHDRAWAL_TIMELOCK = 10 minutes;  // 10min for testnet

    // ============ Enums ============

    enum AgreementType { NONE, PARTNERSHIP, SETTLEMENT }
    enum AgreementStatus { NONE, PENDING, ACTIVE, TERMINATED }

    // ============ Structs ============

    struct Agreement {
        AgreementType agreementType;
        AgreementStatus status;
        address rumbleAddress;
        uint256 amount;
        uint256 proposalTimestamp;
        uint256 acceptanceTimestamp;
        string termsHash;
        bool creatorAccepted;
        bool fundsLocked;
    }

    struct EquityGrant {
        uint256 percentage;
        string documentHash;
        uint256 grantedAt;
        bool active;
        bool nonForfeitable;
    }

    // ============ State Variables ============

    Agreement public currentAgreement;
    EquityGrant public equityGrant;
    uint256 private locked = 1;
    bool public paused = false;
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public agreementNonce;

    struct EquityRecord {
        uint256 nonce;
        uint256 percentage;
        uint256 grantedAt;
        uint256 terminatedAt;
        bool wasActive;
        string terminationReason;
    }
    EquityRecord[] public equityHistory;

    // ============ Events ============

    event AgreementProposed(uint256 indexed nonce, AgreementType agreementType, address indexed rumbleAddress, uint256 amount, string termsHash, uint256 timestamp);
    event PartnershipProposed(uint256 indexed nonce, address indexed rumbleAddress, uint256 bondAmount, uint256 equityPercentage, string equityDocument, string equityRights, uint256 timestamp);
    event AgreementAccepted(uint256 indexed nonce, AgreementType agreementType, address indexed rumbleAddress, uint256 acceptanceTimestamp);
    event EquityGranted(uint256 indexed nonce, address indexed beneficiary, uint256 equityPercentage, bool nonForfeitable, string equityClass, string equityRights, uint256 timestamp);
    event AgreementTerminated(uint256 indexed nonce, address indexed terminatedBy, uint256 timestamp, string reason);
    event WithdrawalReady(address indexed beneficiary, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event EmergencyPause(uint256 timestamp);
    event EmergencyUnpause(uint256 timestamp);

    // ============ Errors ============

    error OnlyCreator();
    error OnlyRumble();
    error InvalidAmount();
    error InvalidAddress();
    error AgreementAlreadyExists();
    error NoActiveAgreement();
    error TimelockNotExpired();
    error NoWithdrawalAvailable();
    error TransferFailed();
    error ContractPaused();
    error ReentrancyDetected();
    error InvalidAgreementStatus();
    error FundsAlreadyUnlocked();
    error InvalidTermsHash();

    // ============ Modifiers ============

    modifier onlyCreator() {
        if (msg.sender != CREATOR) revert OnlyCreator();
        _;
    }

    modifier onlyRumble() {
        if (currentAgreement.rumbleAddress == address(0)) revert InvalidAddress();
        if (msg.sender != currentAgreement.rumbleAddress) revert OnlyRumble();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert ReentrancyDetected();
        locked = 2;
        _;
        locked = 1;
    }

    modifier validAmount(uint256 expected) {
        if (msg.value != expected) revert InvalidAmount();
        _;
    }

    // ============ Constructor ============

    constructor() {
        agreementNonce = 0;
    }

    // ============ Core Functions ============

    function proposePartnership(string memory _termsHash, string memory _equityDocumentHash)
        external payable whenNotPaused nonReentrant validAmount(PARTNERSHIP_BOND)
    {
        _validateNoActiveAgreement();
        _validateTermsHash(_termsHash);
        _validateTermsHash(_equityDocumentHash);

        agreementNonce++;

        currentAgreement = Agreement({
            agreementType: AgreementType.PARTNERSHIP,
            status: AgreementStatus.PENDING,
            rumbleAddress: msg.sender,
            amount: msg.value,
            proposalTimestamp: block.timestamp,
            acceptanceTimestamp: 0,
            termsHash: _termsHash,
            creatorAccepted: false,
            fundsLocked: true
        });

        equityGrant = EquityGrant({
            percentage: PARTNERSHIP_EQUITY,
            documentHash: _equityDocumentHash,
            grantedAt: 0,
            active: false,
            nonForfeitable: true
        });

        emit AgreementProposed(agreementNonce, AgreementType.PARTNERSHIP, msg.sender, msg.value, _termsHash, block.timestamp);
        emit PartnershipProposed(agreementNonce, msg.sender, msg.value, PARTNERSHIP_EQUITY, _equityDocumentHash, EQUITY_RIGHTS, block.timestamp);
    }

    function proposeSettlement(string memory _termsHash)
        external payable whenNotPaused nonReentrant validAmount(SETTLEMENT_AMOUNT)
    {
        _validateNoActiveAgreement();
        _validateTermsHash(_termsHash);

        agreementNonce++;

        currentAgreement = Agreement({
            agreementType: AgreementType.SETTLEMENT,
            status: AgreementStatus.PENDING,
            rumbleAddress: msg.sender,
            amount: msg.value,
            proposalTimestamp: block.timestamp,
            acceptanceTimestamp: 0,
            termsHash: _termsHash,
            creatorAccepted: false,
            fundsLocked: true
        });

        emit AgreementProposed(agreementNonce, AgreementType.SETTLEMENT, msg.sender, msg.value, _termsHash, block.timestamp);
    }

    function acceptAgreement() external onlyCreator whenNotPaused nonReentrant {
        if (currentAgreement.status != AgreementStatus.PENDING) revert InvalidAgreementStatus();
        if (block.timestamp < currentAgreement.proposalTimestamp + ACCEPTANCE_TIMELOCK) revert TimelockNotExpired();

        currentAgreement.status = AgreementStatus.ACTIVE;
        currentAgreement.creatorAccepted = true;
        currentAgreement.acceptanceTimestamp = block.timestamp;

        if (currentAgreement.agreementType == AgreementType.PARTNERSHIP) {
            equityGrant.active = true;
            equityGrant.grantedAt = block.timestamp;

            equityHistory.push(EquityRecord({
                nonce: agreementNonce,
                percentage: PARTNERSHIP_EQUITY,
                grantedAt: block.timestamp,
                terminatedAt: 0,
                wasActive: true,
                terminationReason: ""
            }));

            emit EquityGranted(agreementNonce, CREATOR, PARTNERSHIP_EQUITY, true, EQUITY_CLASS, EQUITY_RIGHTS, block.timestamp);
        }

        emit AgreementAccepted(agreementNonce, currentAgreement.agreementType, currentAgreement.rumbleAddress, block.timestamp);
    }

    function terminateAgreement(string memory _reason) external onlyCreator nonReentrant {
        if (currentAgreement.status != AgreementStatus.ACTIVE) revert InvalidAgreementStatus();

        currentAgreement.status = AgreementStatus.TERMINATED;
        emit AgreementTerminated(agreementNonce, msg.sender, block.timestamp, _reason);

        if (currentAgreement.agreementType == AgreementType.PARTNERSHIP && currentAgreement.amount > 0) {
            uint256 refundAmount = currentAgreement.amount;
            currentAgreement.amount = 0;
            currentAgreement.fundsLocked = false;
            equityGrant.active = false;

            for (uint256 i = 0; i < equityHistory.length; i++) {
                if (equityHistory[i].nonce == agreementNonce && equityHistory[i].wasActive) {
                    equityHistory[i].terminatedAt = block.timestamp;
                    equityHistory[i].terminationReason = _reason;
                    break;
                }
            }

            pendingWithdrawals[currentAgreement.rumbleAddress] += refundAmount;
            emit WithdrawalReady(currentAgreement.rumbleAddress, refundAmount, block.timestamp);
        }
    }

    function initiateSettlementWithdrawal() external onlyCreator nonReentrant {
        if (currentAgreement.status != AgreementStatus.ACTIVE) revert InvalidAgreementStatus();
        if (currentAgreement.agreementType != AgreementType.SETTLEMENT) revert InvalidAgreementStatus();
        if (!currentAgreement.fundsLocked) revert FundsAlreadyUnlocked();

        uint256 withdrawalUnlocksAt = currentAgreement.acceptanceTimestamp + WITHDRAWAL_TIMELOCK;
        if (block.timestamp < withdrawalUnlocksAt) revert TimelockNotExpired();

        uint256 withdrawAmount = currentAgreement.amount;
        currentAgreement.amount = 0;
        currentAgreement.fundsLocked = false;

        pendingWithdrawals[CREATOR] += withdrawAmount;
        emit WithdrawalReady(CREATOR, withdrawAmount, block.timestamp);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoWithdrawalAvailable();

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            pendingWithdrawals[msg.sender] = amount;
            revert TransferFailed();
        }

        emit FundsWithdrawn(msg.sender, amount, block.timestamp);
    }

    function cancelProposal() external onlyRumble nonReentrant {
        if (currentAgreement.status != AgreementStatus.PENDING) revert InvalidAgreementStatus();

        uint256 refundAmount = currentAgreement.amount;
        currentAgreement.status = AgreementStatus.TERMINATED;
        currentAgreement.amount = 0;
        currentAgreement.fundsLocked = false;

        pendingWithdrawals[msg.sender] += refundAmount;
        emit WithdrawalReady(msg.sender, refundAmount, block.timestamp);
    }

    // ============ Emergency Functions ============

    function emergencyPause() external onlyCreator {
        paused = true;
        emit EmergencyPause(block.timestamp);
    }

    function emergencyUnpause() external onlyCreator {
        paused = false;
        emit EmergencyUnpause(block.timestamp);
    }

    // ============ View Functions ============

    function getAgreementDetails() external view returns (
        uint256 nonce, AgreementType agreementType, AgreementStatus status, address rumbleAddress,
        uint256 amount, uint256 proposalTimestamp, uint256 acceptanceTimestamp, string memory termsHash, bool fundsLocked
    ) {
        return (agreementNonce, currentAgreement.agreementType, currentAgreement.status, currentAgreement.rumbleAddress,
                currentAgreement.amount, currentAgreement.proposalTimestamp, currentAgreement.acceptanceTimestamp,
                currentAgreement.termsHash, currentAgreement.fundsLocked);
    }

    function getEquityDetails() external view returns (
        uint256 percentage, string memory documentHash, uint256 grantedAt, bool active, bool nonForfeitable, string memory equityClass, string memory equityRights
    ) {
        return (equityGrant.percentage, equityGrant.documentHash, equityGrant.grantedAt, equityGrant.active, equityGrant.nonForfeitable, EQUITY_CLASS, EQUITY_RIGHTS);
    }

    function getEquityHistoryCount() external view returns (uint256) {
        return equityHistory.length;
    }

    function hasActiveEquity() external view returns (bool) {
        return equityGrant.active;
    }

    function isAgreementActive() external view returns (bool) {
        return currentAgreement.status == AgreementStatus.ACTIVE;
    }

    function getWithdrawalTimelock() external view returns (uint256) {
        if (currentAgreement.acceptanceTimestamp == 0) return type(uint256).max;
        uint256 unlockTime = currentAgreement.acceptanceTimestamp + WITHDRAWAL_TIMELOCK;
        return block.timestamp >= unlockTime ? 0 : unlockTime - block.timestamp;
    }

    function getPendingWithdrawal(address account) external view returns (uint256) {
        return pendingWithdrawals[account];
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ Internal Helpers ============

    function _validateNoActiveAgreement() private view {
        if (currentAgreement.status == AgreementStatus.PENDING || currentAgreement.status == AgreementStatus.ACTIVE) {
            revert AgreementAlreadyExists();
        }
    }

    function _validateTermsHash(string memory _termsHash) private pure {
        if (bytes(_termsHash).length == 0) revert InvalidTermsHash();
    }

    // ============ Fallback Protection ============

    receive() external payable {
        revert("Use proposePartnership() or proposeSettlement()");
    }

    fallback() external payable {
        revert("Invalid function call");
    }
}
