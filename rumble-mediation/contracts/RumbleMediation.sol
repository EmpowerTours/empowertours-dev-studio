// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RumbleMediation
 * @notice Ultra-secure mediation contract enforcing 5% fully diluted equity
 * @dev Partnership: 100M MON + 5% equity (non-forfeitable, no clawback)
 *      Settlement: 50M MON (one-time, final)
 * @custom:security-contact security@empowertours.com
 * @custom:beneficiary 0x5635e21B1EA43B65b3Bf96283B09D094478e2793
 * @custom:equity-terms 5% fully diluted, same class as founders/common, non-forfeitable,
 *                      no forced repurchase, no drag-along without consent, no clawback
 */
contract RumbleMediation {

    // ============ Constants ============

    address public constant CREATOR = 0x5635e21B1EA43B65b3Bf96283B09D094478e2793;

    // MON Amounts (non-negotiable)
    uint256 public constant PARTNERSHIP_BOND = 100_000_000 ether; // 100M MON - Performance bond
    uint256 public constant SETTLEMENT_AMOUNT = 50_000_000 ether;  // 50M MON - Final settlement

    // Equity Terms (immutable, cannot be changed post-deployment)
    uint256 public constant PARTNERSHIP_EQUITY = 500; // 5.00% in basis points
    string public constant EQUITY_CLASS = "Fully diluted, same class as founders/common";
    string public constant EQUITY_RIGHTS = "Non-forfeitable, no repurchase, no clawback, no drag-along without consent";

    // Security Timelocks
    uint256 public constant ACCEPTANCE_TIMELOCK = 24 hours;   // 24h review before acceptance
    uint256 public constant WITHDRAWAL_TIMELOCK = 48 hours;   // 48h security delay before withdrawal

    // ============ Enums ============

    enum AgreementType { NONE, PARTNERSHIP, SETTLEMENT }
    enum AgreementStatus { NONE, PENDING, ACTIVE, TERMINATED }

    // ============ Structs ============

    struct Agreement {
        AgreementType agreementType;
        AgreementStatus status;
        address rumbleAddress;
        uint256 amount;              // MON amount locked
        uint256 proposalTimestamp;
        uint256 acceptanceTimestamp;
        string termsHash;            // IPFS: Full legal agreement
        bool creatorAccepted;
        bool fundsLocked;
    }

    struct EquityGrant {
        uint256 percentage;          // 500 basis points = 5%
        string documentHash;         // IPFS: Equity certificate
        uint256 grantedAt;
        bool active;
        bool nonForfeitable;         // True = cannot be revoked except by creator termination
    }

    // ============ State Variables ============

    Agreement public currentAgreement;
    EquityGrant public equityGrant;

    // Reentrancy guard
    uint256 private locked = 1;

    // Emergency pause (creator only)
    bool public paused = false;

    // Pull pattern withdrawals
    mapping(address => uint256) public pendingWithdrawals;

    // Agreement nonce (replay protection)
    uint256 public agreementNonce;

    // Equity history for audit trail
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

    event AgreementProposed(
        uint256 indexed nonce,
        AgreementType agreementType,
        address indexed rumbleAddress,
        uint256 amount,
        string termsHash,
        uint256 timestamp
    );

    event PartnershipProposed(
        uint256 indexed nonce,
        address indexed rumbleAddress,
        uint256 bondAmount,
        uint256 equityPercentage,
        string equityDocument,
        string equityRights,
        uint256 timestamp
    );

    event AgreementAccepted(
        uint256 indexed nonce,
        AgreementType agreementType,
        address indexed rumbleAddress,
        uint256 acceptanceTimestamp
    );

    event EquityGranted(
        uint256 indexed nonce,
        address indexed beneficiary,
        uint256 equityPercentage,
        bool nonForfeitable,
        string equityClass,
        string equityRights,
        uint256 timestamp
    );

    event AgreementTerminated(
        uint256 indexed nonce,
        address indexed terminatedBy,
        uint256 timestamp,
        string reason
    );

    event WithdrawalReady(
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

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

    /**
     * @notice Rumble proposes PARTNERSHIP: 100M MON + 5% fully diluted equity
     * @param _termsHash IPFS hash of complete partnership agreement
     * @param _equityDocumentHash IPFS hash of equity certificate with full terms
     * @dev This function enforces:
     *      - Exactly 100M MON payment (performance bond)
     *      - 5% fully diluted equity (non-forfeitable)
     *      - No clawback, no repurchase, no drag-along
     *      - Creator has final termination authority
     */
    function proposePartnership(
        string memory _termsHash,
        string memory _equityDocumentHash
    )
        external
        payable
        whenNotPaused
        nonReentrant
        validAmount(PARTNERSHIP_BOND)
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

        // Prepare equity grant (becomes active upon creator acceptance)
        equityGrant = EquityGrant({
            percentage: PARTNERSHIP_EQUITY,
            documentHash: _equityDocumentHash,
            grantedAt: 0, // Set upon acceptance
            active: false,
            nonForfeitable: true // Cannot be clawed back
        });

        emit AgreementProposed(
            agreementNonce,
            AgreementType.PARTNERSHIP,
            msg.sender,
            msg.value,
            _termsHash,
            block.timestamp
        );

        emit PartnershipProposed(
            agreementNonce,
            msg.sender,
            msg.value,
            PARTNERSHIP_EQUITY,
            _equityDocumentHash,
            EQUITY_RIGHTS,
            block.timestamp
        );
    }

    /**
     * @notice Rumble proposes SETTLEMENT: 50M MON (one-time, final, no equity)
     * @param _termsHash IPFS hash of settlement agreement
     * @dev This is a clean break option:
     *      - 50M MON payment (non-refundable upon acceptance)
     *      - No equity, no ongoing relationship
     *      - Creator withdraws after 48h timelock
     */
    function proposeSettlement(string memory _termsHash)
        external
        payable
        whenNotPaused
        nonReentrant
        validAmount(SETTLEMENT_AMOUNT)
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

        emit AgreementProposed(
            agreementNonce,
            AgreementType.SETTLEMENT,
            msg.sender,
            msg.value,
            _termsHash,
            block.timestamp
        );
    }

    /**
     * @notice Creator accepts proposed agreement after 24h review period
     * @dev For Partnership: Activates 5% equity grant (non-forfeitable)
     *      For Settlement: Starts 48h withdrawal timelock
     */
    function acceptAgreement()
        external
        onlyCreator
        whenNotPaused
        nonReentrant
    {
        if (currentAgreement.status != AgreementStatus.PENDING) {
            revert InvalidAgreementStatus();
        }

        // Enforce 24h review period (prevents rush decisions)
        if (block.timestamp < currentAgreement.proposalTimestamp + ACCEPTANCE_TIMELOCK) {
            revert TimelockNotExpired();
        }

        currentAgreement.status = AgreementStatus.ACTIVE;
        currentAgreement.creatorAccepted = true;
        currentAgreement.acceptanceTimestamp = block.timestamp;

        // Activate 5% equity grant for partnerships
        if (currentAgreement.agreementType == AgreementType.PARTNERSHIP) {
            equityGrant.active = true;
            equityGrant.grantedAt = block.timestamp;

            // Record in audit trail
            equityHistory.push(EquityRecord({
                nonce: agreementNonce,
                percentage: PARTNERSHIP_EQUITY,
                grantedAt: block.timestamp,
                terminatedAt: 0,
                wasActive: true,
                terminationReason: ""
            }));

            emit EquityGranted(
                agreementNonce,
                CREATOR,
                PARTNERSHIP_EQUITY,
                true, // nonForfeitable
                EQUITY_CLASS,
                EQUITY_RIGHTS,
                block.timestamp
            );
        }

        emit AgreementAccepted(
            agreementNonce,
            currentAgreement.agreementType,
            currentAgreement.rumbleAddress,
            block.timestamp
        );
    }

    /**
     * @notice Creator terminates partnership (creator-only authority)
     * @param _reason Explanation for termination
     * @dev Partnership bond returned to Rumble via pull pattern
     *      Note: This is the ONLY way partnership can be terminated
     */
    function terminateAgreement(string memory _reason)
        external
        onlyCreator
        nonReentrant
    {
        if (currentAgreement.status != AgreementStatus.ACTIVE) {
            revert InvalidAgreementStatus();
        }

        currentAgreement.status = AgreementStatus.TERMINATED;

        emit AgreementTerminated(
            agreementNonce,
            msg.sender,
            block.timestamp,
            _reason
        );

        // Handle partnership termination
        if (currentAgreement.agreementType == AgreementType.PARTNERSHIP && currentAgreement.amount > 0) {
            uint256 refundAmount = currentAgreement.amount;
            currentAgreement.amount = 0;
            currentAgreement.fundsLocked = false;

            // Deactivate equity (partnership ended)
            equityGrant.active = false;

            // Update audit trail
            for (uint256 i = 0; i < equityHistory.length; i++) {
                if (equityHistory[i].nonce == agreementNonce && equityHistory[i].wasActive) {
                    equityHistory[i].terminatedAt = block.timestamp;
                    equityHistory[i].terminationReason = _reason;
                    break;
                }
            }

            // Queue refund for Rumble (pull pattern)
            pendingWithdrawals[currentAgreement.rumbleAddress] += refundAmount;

            emit WithdrawalReady(
                currentAgreement.rumbleAddress,
                refundAmount,
                block.timestamp
            );
        }
    }

    /**
     * @notice Creator initiates settlement withdrawal after 48h timelock
     * @dev Funds move to pending withdrawals, then creator calls withdraw()
     */
    function initiateSettlementWithdrawal()
        external
        onlyCreator
        nonReentrant
    {
        if (currentAgreement.status != AgreementStatus.ACTIVE) {
            revert InvalidAgreementStatus();
        }
        if (currentAgreement.agreementType != AgreementType.SETTLEMENT) {
            revert InvalidAgreementStatus();
        }
        if (!currentAgreement.fundsLocked) {
            revert FundsAlreadyUnlocked();
        }

        // Enforce 48h withdrawal timelock (security measure)
        uint256 withdrawalUnlocksAt = currentAgreement.acceptanceTimestamp + WITHDRAWAL_TIMELOCK;
        if (block.timestamp < withdrawalUnlocksAt) {
            revert TimelockNotExpired();
        }

        uint256 withdrawAmount = currentAgreement.amount;
        currentAgreement.amount = 0;
        currentAgreement.fundsLocked = false;

        // Queue withdrawal (pull pattern)
        pendingWithdrawals[CREATOR] += withdrawAmount;

        emit WithdrawalReady(CREATOR, withdrawAmount, block.timestamp);
    }

    /**
     * @notice Pull pattern withdrawal - most secure method
     * @dev Anyone with pending withdrawals can pull their funds
     *      Prevents reentrancy, ensures atomicity
     */
    function withdraw()
        external
        nonReentrant
    {
        uint256 amount = pendingWithdrawals[msg.sender];

        if (amount == 0) {
            revert NoWithdrawalAvailable();
        }

        // Checks-Effects-Interactions pattern
        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            // Rollback on failure
            pendingWithdrawals[msg.sender] = amount;
            revert TransferFailed();
        }

        emit FundsWithdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Rumble cancels proposal before creator accepts
     * @dev Full refund via pull pattern
     */
    function cancelProposal()
        external
        onlyRumble
        nonReentrant
    {
        if (currentAgreement.status != AgreementStatus.PENDING) {
            revert InvalidAgreementStatus();
        }

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
        uint256 nonce,
        AgreementType agreementType,
        AgreementStatus status,
        address rumbleAddress,
        uint256 amount,
        uint256 proposalTimestamp,
        uint256 acceptanceTimestamp,
        string memory termsHash,
        bool fundsLocked
    ) {
        return (
            agreementNonce,
            currentAgreement.agreementType,
            currentAgreement.status,
            currentAgreement.rumbleAddress,
            currentAgreement.amount,
            currentAgreement.proposalTimestamp,
            currentAgreement.acceptanceTimestamp,
            currentAgreement.termsHash,
            currentAgreement.fundsLocked
        );
    }

    function getEquityDetails() external view returns (
        uint256 percentage,
        string memory documentHash,
        uint256 grantedAt,
        bool active,
        bool nonForfeitable,
        string memory equityClass,
        string memory equityRights
    ) {
        return (
            equityGrant.percentage,
            equityGrant.documentHash,
            equityGrant.grantedAt,
            equityGrant.active,
            equityGrant.nonForfeitable,
            EQUITY_CLASS,
            EQUITY_RIGHTS
        );
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
        if (currentAgreement.acceptanceTimestamp == 0) {
            return type(uint256).max;
        }

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
        if (currentAgreement.status == AgreementStatus.PENDING ||
            currentAgreement.status == AgreementStatus.ACTIVE) {
            revert AgreementAlreadyExists();
        }
    }

    function _validateTermsHash(string memory _termsHash) private pure {
        if (bytes(_termsHash).length == 0) {
            revert InvalidTermsHash();
        }
    }

    // ============ Fallback Protection ============

    receive() external payable {
        revert("Use proposePartnership() or proposeSettlement()");
    }

    fallback() external payable {
        revert("Invalid function call");
    }
}
