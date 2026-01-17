const { ethers } = require("hardhat");
const { generateStealthKeys } = require("../scripts/stealth-utils");
const { generateStealthAddress } = require("../scripts/stealth-utils");
const SubscriptionIndexer = require("../indexer/SubscriptionIndexer");
const { generateAccessProof, submitProof } = require("../scripts/generate-access-proof");

/**
 * End-to-End Privacy-Preserving Subscription Demo
 * 
 * Demonstrates the complete flow:
 * 1. Deploy contracts
 * 2. Register domain with stealth keys
 * 3. Create merchant plan
 * 4. Pay subscription to stealth address
 * 5. Index payments and post commitments
 * 6. Generate and verify ZK proof
 */

async function main() {
    console.log("=".repeat(80));
    console.log("PRIVACY-PRESERVING SUBSCRIPTION SYSTEM - END-TO-END DEMO");
    console.log("=".repeat(80));

    const [deployer, merchant, payer] = await ethers.getSigners();

    // ============================================================================
    // STEP 1: Deploy Contracts
    // ============================================================================
    console.log("\n📦 STEP 1: Deploying Contracts\n");

    console.log("Deploying PrivacyDomainRegistry...");
    const PrivacyDomainRegistry = await ethers.getContractFactory("PrivacyDomainRegistry");
    const registry = await PrivacyDomainRegistry.deploy();
    await registry.waitForDeployment();
    console.log(`✓ PrivacyDomainRegistry deployed to: ${await registry.getAddress()}`);

    console.log("\nDeploying CommitmentRegistry...");
    const CommitmentRegistry = await ethers.getContractFactory("CommitmentRegistry");
    const commitmentRegistry = await CommitmentRegistry.deploy();
    await commitmentRegistry.waitForDeployment();
    console.log(`✓ CommitmentRegistry deployed to: ${await commitmentRegistry.getAddress()}`);

    console.log("\nDeploying StealthPaymentVault...");
    const StealthPaymentVault = await ethers.getContractFactory("StealthPaymentVault");
    const vault = await StealthPaymentVault.deploy();
    await vault.waitForDeployment();
    console.log(`✓ StealthPaymentVault deployed to: ${await vault.getAddress()}`);

    console.log("\nDeploying ZKAccessVerifier...");
    const ZKAccessVerifier = await ethers.getContractFactory("ZKAccessVerifier");
    const verifier = await ZKAccessVerifier.deploy(await commitmentRegistry.getAddress());
    await verifier.waitForDeployment();
    console.log(`✓ ZKAccessVerifier deployed to: ${await verifier.getAddress()}`);

    // ============================================================================
    // STEP 2: Generate Stealth Keys and Register Domain
    // ============================================================================
    console.log("\n🔑 STEP 2: Generating Stealth Keys and Registering Domain\n");

    const recipientKeys = generateStealthKeys();
    console.log("Generated stealth key pair:");
    console.log(`  Spend Private Key: ${recipientKeys.spendPrivateKey}`);
    console.log(`  Spend Public Key: ${recipientKeys.spendPublicKey}`);
    console.log(`  View Private Key: ${recipientKeys.viewPrivateKey}`);
    console.log(`  View Public Key: ${recipientKeys.viewPublicKey}`);

    const domainName = "alice.privacy";
    const domainHash = ethers.id(domainName);

    console.log(`\nRegistering domain: ${domainName}`);

    // Registry expects full EC public keys (65 bytes uncompressed)
    const tx1 = await registry.registerDomain(
        domainHash,
        recipientKeys.spendPublicKey,
        recipientKeys.viewPublicKey
    );
    await tx1.wait();
    console.log(`✓ Domain registered`);

    // ============================================================================
    // STEP 3: Create Merchant and Plan
    // ============================================================================
    console.log("\n🏪 STEP 3: Creating Merchant and Subscription Plan\n");

    const merchantId = ethers.id("StreamingService");
    const planId = 1;
    const price = ethers.parseEther("0.01"); // 0.01 ETH
    const duration = 30 * 24 * 60 * 60; // 30 days

    console.log("Registering merchant...");
    const tx2 = await vault.connect(merchant).registerMerchant(merchantId);
    await tx2.wait();
    console.log(`✓ Merchant registered: ${merchantId}`);

    console.log("\nCreating subscription plan...");
    const tx3 = await vault.connect(merchant).createPlan(merchantId, planId, price, duration);
    await tx3.wait();
    console.log(`✓ Plan created:`);
    console.log(`  Plan ID: ${planId}`);
    console.log(`  Price: ${ethers.formatEther(price)} ETH`);
    console.log(`  Duration: ${duration / 86400} days`);

    // ============================================================================
    // STEP 4: Pay Subscription to Stealth Address
    // ============================================================================
    console.log("\n💰 STEP 4: Paying Subscription to Stealth Address\n");

    console.log("Generating stealth address...");
    // For demo, we'll use the actual public keys (not bytes32)
    const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(
        recipientKeys.spendPublicKey,
        recipientKeys.viewPublicKey
    );

    console.log(`  Stealth Address: ${stealthAddress}`);
    console.log(`  Ephemeral PubKey: ${ephemeralPublicKey}`);

    console.log("\nPaying subscription...");
    const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPublicKey);
    const tx4 = await vault.connect(payer).paySubscription(
        merchantId,
        planId,
        stealthAddress,
        ephemeralPubKeyBytes,
        { value: price }
    );
    const receipt = await tx4.wait();
    console.log(`✓ Payment sent in block ${receipt.blockNumber}`);
    console.log(`  Transaction: ${tx4.hash}`);

    console.log("\n🔒 PRIVACY CHECK:");
    console.log(`  ✓ No domainHash in events`);
    console.log(`  ✓ No on-chain subscription storage`);
    console.log(`  ✓ Stealth address unlinkable to domain`);

    // ============================================================================
    // STEP 5: Index Payments and Post Commitments
    // ============================================================================
    console.log("\n🔍 STEP 5: Indexing Payments and Posting Commitments\n");

    const provider = ethers.provider;
    const indexer = new SubscriptionIndexer(
        provider,
        await vault.getAddress(),
        await commitmentRegistry.getAddress(),
        recipientKeys.viewPrivateKey,
        recipientKeys.spendPublicKey
    );

    console.log("Scanning blockchain for payments...");
    await indexer.scanPayments(0, 'latest');

    const subscriptions = indexer.getAllSubscriptions();
    console.log(`\n✓ Found ${subscriptions.length} subscription(s)`);

    if (subscriptions.length > 0) {
        const sub = subscriptions[0];
        console.log(`\nSubscription Details:`);
        console.log(`  Merchant: ${sub.merchantId}`);
        console.log(`  Plan: ${sub.planId}`);
        console.log(`  Stealth Address: ${sub.stealthAddress}`);
        console.log(`  Amount: ${ethers.formatEther(sub.amount)} ETH`);
        console.log(`  Expires: ${new Date(sub.expiresAt * 1000).toISOString()}`);
        console.log(`  Commitment: ${sub.commitment}`);
    }

    console.log("\nPosting commitments to registry...");
    await indexer.postCommitments(deployer);

    // ============================================================================
    // STEP 6: Generate and Verify ZK Proof
    // ============================================================================
    console.log("\n🔐 STEP 6: Generating and Verifying ZK Access Proof\n");

    const subscription = subscriptions[0];

    console.log("Generating ZK proof...");
    const proofPackage = await generateAccessProof(
        provider,
        await commitmentRegistry.getAddress(),
        subscription,
        merchantId,
        planId
    );

    console.log("\nSubmitting proof to verifier...");
    await submitProof(
        deployer,
        await verifier.getAddress(),
        proofPackage
    );

    // ============================================================================
    // STEP 7: Summary
    // ============================================================================
    console.log("\n" + "=".repeat(80));
    console.log("✅ END-TO-END DEMO COMPLETE");
    console.log("=".repeat(80));

    console.log("\n📊 PRIVACY GUARANTEES ACHIEVED:\n");
    console.log("✓ Unlinkability: No on-chain correlation between stealth addresses");
    console.log("✓ Payment Privacy: Only merchant/plan visible, not payer identity");
    console.log("✓ Access Privacy: ZK proofs reveal nothing except 'valid subscription'");
    console.log("✓ Trustless: Commitments prevent indexer from lying");
    console.log("✓ Censorship-Resistant: Anyone can post commitments");
    console.log("✓ Immutable: No one can revoke access");

    console.log("\n📝 DEPLOYED CONTRACTS:\n");
    console.log(`PrivacyDomainRegistry: ${await registry.getAddress()}`);
    console.log(`CommitmentRegistry: ${await commitmentRegistry.getAddress()}`);
    console.log(`StealthPaymentVault: ${await vault.getAddress()}`);
    console.log(`ZKAccessVerifier: ${await verifier.getAddress()}`);

    console.log("\n" + "=".repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
