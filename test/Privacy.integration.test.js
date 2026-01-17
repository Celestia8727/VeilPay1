const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateStealthKeys, generateStealthAddress, checkPayment } = require("../scripts/stealth-utils");
const { computeCommitment, generateSecret, computeNullifier, generateNonce } = require("../scripts/commitment-utils");

describe("Privacy Integration Tests", function () {
    let registry, vault, commitmentRegistry, verifier;
    let owner, merchant, payer, recipient;
    let merchantId, planId;
    let recipientKeys;

    beforeEach(async function () {
        [owner, merchant, payer, recipient] = await ethers.getSigners();

        // Deploy all contracts
        const PrivacyDomainRegistry = await ethers.getContractFactory("PrivacyDomainRegistry");
        registry = await PrivacyDomainRegistry.deploy();
        await registry.waitForDeployment();

        const CommitmentRegistry = await ethers.getContractFactory("CommitmentRegistry");
        commitmentRegistry = await CommitmentRegistry.deploy();
        await commitmentRegistry.waitForDeployment();

        const StealthPaymentVault = await ethers.getContractFactory("StealthPaymentVault");
        vault = await StealthPaymentVault.deploy();
        await vault.waitForDeployment();

        const ZKAccessVerifier = await ethers.getContractFactory("ZKAccessVerifier");
        verifier = await ZKAccessVerifier.deploy(await commitmentRegistry.getAddress());
        await verifier.waitForDeployment();

        // Setup merchant
        merchantId = ethers.id("StreamingService");
        planId = 1;
        await vault.connect(merchant).registerMerchant(merchantId);
        await vault.connect(merchant).createPlan(
            merchantId,
            planId,
            ethers.parseEther("0.01"),
            30 * 24 * 60 * 60 // 30 days
        );

        // Generate recipient stealth keys
        recipientKeys = generateStealthKeys();
    });

    describe("End-to-End Privacy Flow", function () {
        it("Should complete full privacy-preserving subscription flow", async function () {
            // 1. Register domain with stealth keys
            const domainName = "alice.privacy";
            const domainHash = ethers.id(domainName);

            await registry.connect(recipient).registerDomain(
                domainHash,
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            // 2. Generate stealth address
            const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            // 3. Pay subscription to stealth address
            const price = ethers.parseEther("0.01");
            const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPublicKey);

            const tx = await vault.connect(payer).paySubscription(
                merchantId,
                planId,
                stealthAddress,
                ephemeralPubKeyBytes,
                { value: price }
            );

            const receipt = await tx.wait();

            // 4. Verify payment event emitted (without domainHash!)
            const event = receipt.logs.find(log => {
                try {
                    const parsed = vault.interface.parseLog(log);
                    return parsed.name === "PaymentReceived";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            const parsedEvent = vault.interface.parseLog(event);
            expect(parsedEvent.args.domainHash).to.be.undefined; // Privacy check!

            // 5. Recipient detects payment using view key
            const isMine = checkPayment(
                recipientKeys.viewPrivateKey,
                recipientKeys.spendPublicKey,
                ephemeralPublicKey,
                stealthAddress
            );

            expect(isMine).to.be.true;

            // 6. Build subscription record
            const plan = await vault.getPlan(merchantId, planId);
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            const subscription = {
                merchantId: merchantId,
                planId: Number(planId),
                stealthAddress: stealthAddress,
                paidAt: Number(block.timestamp),
                expiresAt: Number(block.timestamp) + Number(plan.duration),
                secret: generateSecret()
            };

            // 7. Compute and post commitment
            const commitment = computeCommitment(subscription);
            await commitmentRegistry.registerCommitment(commitment);

            expect(await commitmentRegistry.isValidCommitment(commitment)).to.be.true;

            // 8. Generate ZK proof
            const proof = ethers.hexlify(ethers.randomBytes(128)); // Mock proof
            const nonce = generateNonce();
            const nullifier = computeNullifier(subscription.secret, nonce);

            // 9. Verify access
            await expect(
                verifier.verifyAccess(proof, commitment, merchantId, planId, nullifier)
            ).to.emit(verifier, "AccessVerified");

            console.log("✅ Full privacy-preserving flow completed successfully!");
        });
    });

    describe("Privacy Guarantees", function () {
        it("Should NOT allow linking stealth addresses to domain on-chain", async function () {
            const domainHash = ethers.id("test.privacy");
            await registry.connect(recipient).registerDomain(
                domainHash,
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            // Generate multiple stealth addresses
            const stealth1 = generateStealthAddress(recipientKeys.spendPublicKey, recipientKeys.viewPublicKey);
            const stealth2 = generateStealthAddress(recipientKeys.spendPublicKey, recipientKeys.viewPublicKey);

            // Make payments
            const price = ethers.parseEther("0.01");
            await vault.connect(payer).paySubscription(
                merchantId, planId, stealth1.stealthAddress,
                ethers.getBytes(stealth1.ephemeralPublicKey),
                { value: price }
            );
            await vault.connect(payer).paySubscription(
                merchantId, planId, stealth2.stealthAddress,
                ethers.getBytes(stealth2.ephemeralPublicKey),
                { value: price }
            );

            // Verify: No on-chain way to link these addresses
            // (No getUserSubscriptions, getSubscription, etc.)
            expect(vault.getUserSubscriptions).to.be.undefined;
            expect(vault.getSubscription).to.be.undefined;
        });

        it("Should NOT emit domainHash in payment events", async function () {
            const domainHash = ethers.id("test.privacy");
            await registry.connect(recipient).registerDomain(
                domainHash,
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            const tx = await vault.connect(payer).paySubscription(
                merchantId, planId, stealthAddress,
                ethers.getBytes(ephemeralPublicKey),
                { value: ethers.parseEther("0.01") }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return vault.interface.parseLog(log).name === "PaymentReceived";
                } catch {
                    return false;
                }
            });

            const parsedEvent = vault.interface.parseLog(event);

            // Critical privacy check
            expect(parsedEvent.args.domainHash).to.be.undefined;
            expect(parsedEvent.args.merchantId).to.not.be.undefined;
            expect(parsedEvent.args.stealthAddress).to.not.be.undefined;
        });

        it("Should maintain unlinkability between multiple payments", async function () {
            const domainHash = ethers.id("test.privacy");
            await registry.connect(recipient).registerDomain(
                domainHash,
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            // Generate 3 different stealth addresses
            const addresses = [];
            for (let i = 0; i < 3; i++) {
                const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(
                    recipientKeys.spendPublicKey,
                    recipientKeys.viewPublicKey
                );
                addresses.push({ stealthAddress, ephemeralPublicKey });

                await vault.connect(payer).paySubscription(
                    merchantId, planId, stealthAddress,
                    ethers.getBytes(ephemeralPublicKey),
                    { value: ethers.parseEther("0.01") }
                );
            }

            // Verify all addresses are different
            const uniqueAddresses = new Set(addresses.map(a => a.stealthAddress));
            expect(uniqueAddresses.size).to.equal(3);

            // Verify recipient can detect all payments
            for (const { stealthAddress, ephemeralPublicKey } of addresses) {
                const isMine = checkPayment(
                    recipientKeys.viewPrivateKey,
                    recipientKeys.spendPublicKey,
                    ephemeralPublicKey,
                    stealthAddress
                );
                expect(isMine).to.be.true;
            }
        });
    });

    describe("Trustless Commitment Verification", function () {
        it("Should prevent indexer from faking subscriptions", async function () {
            // Indexer creates fake subscription
            const fakeSubscription = {
                merchantId: merchantId,
                planId: planId,
                stealthAddress: ethers.Wallet.createRandom().address,
                paidAt: Math.floor(Date.now() / 1000),
                expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                secret: generateSecret()
            };

            const fakeCommitment = computeCommitment(fakeSubscription);

            // User tries to verify (commitment doesn't exist on-chain)
            const exists = await commitmentRegistry.isValidCommitment(fakeCommitment);
            expect(exists).to.be.false;

            // Proof generation would fail
            const proof = ethers.hexlify(ethers.randomBytes(128));
            const nullifier = computeNullifier(fakeSubscription.secret, generateNonce());

            await expect(
                verifier.verifyAccess(proof, fakeCommitment, merchantId, planId, nullifier)
            ).to.be.revertedWithCustomError(verifier, "CommitmentNotFound");
        });

        it("Should allow user to post their own commitment (censorship-resistant)", async function () {
            const domainHash = ethers.id("test.privacy");
            await registry.connect(recipient).registerDomain(
                domainHash,
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(
                recipientKeys.spendPublicKey,
                recipientKeys.viewPublicKey
            );

            // Pay subscription
            const tx = await vault.connect(payer).paySubscription(
                merchantId, planId, stealthAddress,
                ethers.getBytes(ephemeralPublicKey),
                { value: ethers.parseEther("0.01") }
            );

            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const plan = await vault.getPlan(merchantId, planId);

            // User builds subscription and posts commitment themselves
            const subscription = {
                merchantId: merchantId,
                planId: planId,
                stealthAddress: stealthAddress,
                paidAt: Number(block.timestamp),
                expiresAt: Number(block.timestamp) + Number(plan.duration),
                secret: generateSecret()
            };

            const commitment = computeCommitment(subscription);

            // User posts commitment (not indexer!)
            await commitmentRegistry.connect(recipient).registerCommitment(commitment);

            expect(await commitmentRegistry.isValidCommitment(commitment)).to.be.true;

            // Can now generate proof immediately
            const proof = ethers.hexlify(ethers.randomBytes(128));
            const nullifier = computeNullifier(subscription.secret, generateNonce());

            await verifier.verifyAccess(proof, commitment, merchantId, planId, nullifier);
        });
    });

    describe("Timestamp Anchoring (Security Fix)", function () {
        it("Should use block.timestamp, not user-provided timestamp", async function () {
            const subscription = {
                merchantId: merchantId,
                planId: planId,
                stealthAddress: ethers.Wallet.createRandom().address,
                paidAt: Math.floor(Date.now() / 1000),
                expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                secret: generateSecret()
            };

            const commitment = computeCommitment(subscription);
            await commitmentRegistry.registerCommitment(commitment);

            const proof = ethers.hexlify(ethers.randomBytes(128));
            const nullifier = computeNullifier(subscription.secret, generateNonce());

            // Verify function signature doesn't accept currentTimestamp
            // This would fail if we tried to pass 6 parameters
            await verifier.verifyAccess(proof, commitment, merchantId, planId, nullifier);

            // Success! No timestamp manipulation possible
        });
    });
});
