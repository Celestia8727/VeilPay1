const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Deploy contracts to Monad Testnet
 * Saves deployment addresses to deployments-monad.json
 */

async function main() {
    console.log("=".repeat(80));
    console.log("DEPLOYING VEIL402 CONTRACTS TO MONAD TESTNET");
    console.log("=".repeat(80));

    const [deployer] = await ethers.getSigners();
    console.log(`\nDeploying contracts with account: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.error("\n❌ ERROR: Account has no balance!");
        console.log("Please fund your account with Monad testnet ETH");
        console.log("Faucet: https://faucet.testnet.monad.xyz");
        process.exit(1);
    }

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const deployments = {
        network: "monad-testnet",
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {}
    };

    // ============================================================================
    // Deploy PrivacyDomainRegistry
    // ============================================================================
    console.log("📦 Deploying PrivacyDomainRegistry...");
    const PrivacyDomainRegistry = await ethers.getContractFactory("PrivacyDomainRegistry");
    const registry = await PrivacyDomainRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log(`✓ PrivacyDomainRegistry deployed to: ${registryAddress}`);
    console.log(`  Explorer: ${process.env.MONAD_EXPLORER_URL}/address/${registryAddress}\n`);

    deployments.contracts.PrivacyDomainRegistry = {
        address: registryAddress,
        deployedAt: new Date().toISOString()
    };

    // ============================================================================
    // Deploy StealthPaymentVault
    // ============================================================================
    console.log("📦 Deploying StealthPaymentVault...");
    const StealthPaymentVault = await ethers.getContractFactory("StealthPaymentVault");
    const vault = await StealthPaymentVault.deploy();
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`✓ StealthPaymentVault deployed to: ${vaultAddress}`);
    console.log(`  Explorer: ${process.env.MONAD_EXPLORER_URL}/address/${vaultAddress}\n`);

    deployments.contracts.StealthPaymentVault = {
        address: vaultAddress,
        deployedAt: new Date().toISOString()
    };

    // ============================================================================
    // Save Deployment Info
    // ============================================================================
    const deploymentsPath = path.join(__dirname, "..", "deployments-monad.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`✓ Deployment info saved to: ${deploymentsPath}\n`);

    // ============================================================================
    // Summary
    // ============================================================================
    console.log("=".repeat(80));
    console.log("✅ DEPLOYMENT TO MONAD TESTNET COMPLETE");
    console.log("=".repeat(80));
    console.log("\n📝 Deployed Contracts:\n");
    console.log(`PrivacyDomainRegistry:  ${registryAddress}`);
    console.log(`StealthPaymentVault:    ${vaultAddress}`);
    console.log("\n🔗 Explorer Links:\n");
    console.log(`${process.env.MONAD_EXPLORER_URL}/address/${registryAddress}`);
    console.log(`${process.env.MONAD_EXPLORER_URL}/address/${vaultAddress}`);
    console.log("\n" + "=".repeat(80));
    console.log("\n💡 Update your .env file with these addresses for the frontend!\n");
    console.log("=".repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
