// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TOURSToken
 * @notice EmpowerTours governance and utility token
 * @dev Total supply: 100 billion TOURS (matching MON supply)
 *
 * Tokenomics:
 * - Total Supply: 100,000,000,000 TOURS
 * - Whitelist Airdrops: 2,000 TOURS per whitelist user (1,000 users max = 2M TOURS)
 * - Treasury/Ecosystem: Remaining supply for governance, staking, rewards
 *
 * Use Cases:
 * - Governance voting on platform features
 * - Staking rewards for long-term holders
 * - Community treasury funding
 * - Partnership incentives
 *
 * Note: TOURS payments for credits have been removed. Only MON is accepted for payments.
 */
contract TOURSToken is ERC20, Ownable {
    /// @notice Total supply: 100 billion TOURS
    uint256 public constant TOTAL_SUPPLY = 100_000_000_000 ether;

    /// @notice Treasury address for ecosystem fund
    address public immutable treasury;

    /**
     * @notice Deploy TOURS token with initial supply to treasury
     * @param _treasury Treasury address receiving initial supply
     */
    constructor(address _treasury) ERC20("EmpowerTours Token", "TOURS") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");

        treasury = _treasury;

        // Mint entire supply to treasury
        _mint(_treasury, TOTAL_SUPPLY);
    }

    /**
     * @notice Burn tokens (for deflationary mechanics if needed)
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from another account (with allowance)
     * @param account Account to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}
