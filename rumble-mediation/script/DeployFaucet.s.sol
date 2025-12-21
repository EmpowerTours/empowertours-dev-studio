// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/TestnetFaucet.sol";

contract DeployFaucet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Faucet configuration
        uint256 dripAmount = 0.1 ether; // 0.1 MON per request
        uint256 cooldownPeriod = 3600; // 1 hour

        console.log("Deploying TestnetFaucet...");
        console.log("Drip amount:", dripAmount);
        console.log("Cooldown period:", cooldownPeriod, "seconds");

        TestnetFaucet faucet = new TestnetFaucet(dripAmount, cooldownPeriod);

        console.log("TestnetFaucet deployed to:", address(faucet));
        console.log("Owner:", faucet.owner());

        vm.stopBroadcast();
    }
}
