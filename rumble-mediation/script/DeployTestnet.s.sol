// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RumbleMediationTestnet.sol";

contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        RumbleMediationTestnet mediation = new RumbleMediationTestnet();

        vm.stopBroadcast();

        // Log deployment info
        console.log("========================================");
        console.log("RumbleMediationTestnet Deployed!");
        console.log("========================================");
        console.log("Contract Address:", address(mediation));
        console.log("Creator Address:", mediation.CREATOR());
        console.log("Partnership Bond:", mediation.PARTNERSHIP_BOND() / 1e18, "MON");
        console.log("Settlement Amount:", mediation.SETTLEMENT_AMOUNT() / 1e18, "MON");
        console.log("Equity Percentage:", mediation.PARTNERSHIP_EQUITY(), "basis points (5%)");
        console.log("========================================");
        console.log("\nUpdate app.js line 32-34 with:");
        console.log("CONTRACT_ADDRESS: '%s',", address(mediation));
        console.log("NETWORK_TYPE: 'testnet'");
        console.log("========================================");
    }
}
