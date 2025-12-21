// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestnetFaucet
 * @notice Simple faucet for Monad testnet MON tokens
 * @dev Dispenses testnet MON with rate limiting
 */
contract TestnetFaucet {
    address public owner;
    uint256 public dripAmount;
    uint256 public cooldownPeriod;

    mapping(address => uint256) public lastDripTime;

    event Drip(address indexed recipient, uint256 amount, uint256 timestamp);
    event FaucetFunded(address indexed funder, uint256 amount);
    event ConfigUpdated(uint256 newDripAmount, uint256 newCooldownPeriod);

    constructor(uint256 _dripAmount, uint256 _cooldownPeriod) {
        owner = msg.sender;
        dripAmount = _dripAmount;
        cooldownPeriod = _cooldownPeriod;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Request testnet MON from faucet
     * @dev Rate limited to once per cooldown period per address
     */
    function requestMON() external {
        require(
            block.timestamp >= lastDripTime[msg.sender] + cooldownPeriod,
            "Cooldown period not expired"
        );
        require(
            address(this).balance >= dripAmount,
            "Faucet is empty"
        );

        lastDripTime[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: dripAmount}("");
        require(success, "Transfer failed");

        emit Drip(msg.sender, dripAmount, block.timestamp);
    }

    /**
     * @notice Fund the faucet with MON
     */
    function fundFaucet() external payable {
        require(msg.value > 0, "Must send MON");
        emit FaucetFunded(msg.sender, msg.value);
    }

    /**
     * @notice Update faucet configuration
     * @param _dripAmount New amount to dispense per request
     * @param _cooldownPeriod New cooldown period in seconds
     */
    function updateConfig(uint256 _dripAmount, uint256 _cooldownPeriod) external onlyOwner {
        dripAmount = _dripAmount;
        cooldownPeriod = _cooldownPeriod;
        emit ConfigUpdated(_dripAmount, _cooldownPeriod);
    }

    /**
     * @notice Emergency withdraw for owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    /**
     * @notice Get time remaining until address can request again
     * @param _address Address to check
     * @return Time in seconds (0 if can request now)
     */
    function getTimeUntilNextDrip(address _address) external view returns (uint256) {
        uint256 nextAvailable = lastDripTime[_address] + cooldownPeriod;
        if (block.timestamp >= nextAvailable) {
            return 0;
        }
        return nextAvailable - block.timestamp;
    }

    /**
     * @notice Check if address can request MON now
     */
    function canRequestNow(address _address) external view returns (bool) {
        return block.timestamp >= lastDripTime[_address] + cooldownPeriod;
    }

    /**
     * @notice Get faucet balance
     */
    function getFaucetBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive MON
    receive() external payable {
        emit FaucetFunded(msg.sender, msg.value);
    }
}
