const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy all contracts to local Hardhat network
 * Saves deployment addresses to deployments.json
 */

async function main() {
    console.log("=".repeat(80));
    console.log("DEPLOYING VEIL402 CONTRACTS TO LOCAL NETWORK");
    console.log("=".repeat(80));

    const [deployer] = await ethers.getSigners();
    console.log(`\nDeploying contracts with account: ${deployer.address}`);
    console.log(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

    const deployments = {
        network: "localhost",
        chainId: 31337,
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
    console.log(`✓ PrivacyDomainRegistry deployed to: ${registryAddress}\n`);

    deployments.contracts.PrivacyDomainRegistry = {
        address: registryAddress,
        deployedAt: new Date().toISOString()
    };

    // ============================================================================
    // Deploy CommitmentRegistry
    // ============================================================================
    console.log("📦 Deploying CommitmentRegistry...");
    const CommitmentRegistry = await ethers.getContractFactory("CommitmentRegistry");
    const commitmentRegistry = await CommitmentRegistry.deploy();
    await commitmentRegistry.waitForDeployment();
    const commitmentRegistryAddress = await commitmentRegistry.getAddress();
    console.log(`✓ CommitmentRegistry deployed to: ${commitmentRegistryAddress}\n`);

    deployments.contracts.CommitmentRegistry = {
        address: commitmentRegistryAddress,
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
    console.log(`✓ StealthPaymentVault deployed to: ${vaultAddress}\n`);

    deployments.contracts.StealthPaymentVault = {
        address: vaultAddress,
        deployedAt: new Date().toISOString()
    };

    // ============================================================================
    // Deploy ZKAccessVerifier
    // ============================================================================
    console.log("📦 Deploying ZKAccessVerifier...");
    const ZKAccessVerifier = await ethers.getContractFactory("ZKAccessVerifier");
    const verifier = await ZKAccessVerifier.deploy(commitmentRegistryAddress);
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log(`✓ ZKAccessVerifier deployed to: ${verifierAddress}\n`);

    deployments.contracts.ZKAccessVerifier = {
        address: verifierAddress,
        deployedAt: new Date().toISOString(),
        constructorArgs: [commitmentRegistryAddress]
    };

    // ============================================================================
    // Save Deployment Info
    // ============================================================================
    const deploymentsPath = path.join(__dirname, "..", "deployments.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`✓ Deployment info saved to: ${deploymentsPath}\n`);

    // ============================================================================
    // Summary
    // ============================================================================
    console.log("=".repeat(80));
    console.log("✅ DEPLOYMENT COMPLETE");
    console.log("=".repeat(80));
    console.log("\n📝 Deployed Contracts:\n");
    console.log(`PrivacyDomainRegistry:  ${registryAddress}`);
    console.log(`CommitmentRegistry:     ${commitmentRegistryAddress}`);
    console.log(`StealthPaymentVault:    ${vaultAddress}`);
    console.log(`ZKAccessVerifier:       ${verifierAddress}`);
    console.log("\n" + "=".repeat(80));
    console.log("\n💡 Next Steps:\n");
    console.log("1. Register a domain:");
    console.log("   node scripts/register-domain.js <domain-name>\n");
    console.log("2. Create a merchant and plan:");
    console.log("   node scripts/create-merchant.js\n");
    console.log("3. Pay a subscription:");
    console.log("   node scripts/pay-subscription.js <domain> <merchantId> <planId>\n");
    console.log("=".repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
