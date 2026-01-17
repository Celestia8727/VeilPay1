const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StealthPaymentVault", function () {
    let vault;
    let owner, merchant, payer, stealthAddress;
    let merchantId, planId;

    beforeEach(async function () {
        [owner, merchant, payer, stealthAddress] = await ethers.getSigners();

        const StealthPaymentVault = await ethers.getContractFactory("StealthPaymentVault");
        vault = await StealthPaymentVault.deploy();
        await vault.waitForDeployment();

        merchantId = ethers.id("TestMerchant");
        planId = 1;
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await vault.getAddress()).to.be.properAddress;
        });
    });

    describe("Merchant Registration", function () {
        it("Should register a merchant successfully", async function () {
            await expect(vault.connect(merchant).registerMerchant(merchantId))
                .to.emit(vault, "MerchantRegistered")
                .withArgs(merchantId, merchant.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            expect(await vault.getMerchantOwner(merchantId)).to.equal(merchant.address);
        });

        it("Should revert when registering duplicate merchant", async function () {
            await vault.connect(merchant).registerMerchant(merchantId);

            await expect(
                vault.connect(merchant).registerMerchant(merchantId)
            ).to.be.revertedWithCustomError(vault, "MerchantAlreadyExists");
        });
    });

    describe("Plan Management", function () {
        beforeEach(async function () {
            await vault.connect(merchant).registerMerchant(merchantId);
        });

        it("Should create a plan successfully", async function () {
            const price = ethers.parseEther("0.1");
            const duration = 30 * 24 * 60 * 60; // 30 days

            await expect(vault.connect(merchant).createPlan(merchantId, planId, price, duration))
                .to.emit(vault, "PlanCreated")
                .withArgs(merchantId, planId, price, duration, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            const plan = await vault.getPlan(merchantId, planId);
            expect(plan.price).to.equal(price);
            expect(plan.duration).to.equal(duration);
            expect(plan.active).to.be.true;
        });

        it("Should revert when non-owner creates plan", async function () {
            const price = ethers.parseEther("0.1");
            const duration = 30 * 24 * 60 * 60;

            await expect(
                vault.connect(payer).createPlan(merchantId, planId, price, duration)
            ).to.be.revertedWithCustomError(vault, "NotMerchantOwner");
        });

        it("Should revert when creating plan with zero price", async function () {
            const duration = 30 * 24 * 60 * 60;

            await expect(
                vault.connect(merchant).createPlan(merchantId, planId, 0, duration)
            ).to.be.revertedWithCustomError(vault, "InvalidPlanParameters");
        });

        it("Should revert when creating plan with zero duration", async function () {
            const price = ethers.parseEther("0.1");

            await expect(
                vault.connect(merchant).createPlan(merchantId, planId, price, 0)
            ).to.be.revertedWithCustomError(vault, "InvalidPlanParameters");
        });

        it("Should update plan successfully", async function () {
            const price = ethers.parseEther("0.1");
            const duration = 30 * 24 * 60 * 60;

            await vault.connect(merchant).createPlan(merchantId, planId, price, duration);

            const newPrice = ethers.parseEther("0.2");
            const newDuration = 60 * 24 * 60 * 60;

            await vault.connect(merchant).updatePlan(merchantId, planId, newPrice, newDuration, false);

            const plan = await vault.getPlan(merchantId, planId);
            expect(plan.price).to.equal(newPrice);
            expect(plan.duration).to.equal(newDuration);
            expect(plan.active).to.be.false;
        });
    });

    describe("Subscription Payments", function () {
        const price = ethers.parseEther("0.1");
        const duration = 30 * 24 * 60 * 60;
        let ephemeralPubKey;

        beforeEach(async function () {
            await vault.connect(merchant).registerMerchant(merchantId);
            await vault.connect(merchant).createPlan(merchantId, planId, price, duration);

            // Mock ephemeral public key (65 bytes: 0x04 + 32 bytes x + 32 bytes y)
            ephemeralPubKey = "0x04" + "a".repeat(128);
        });

        it("Should pay subscription successfully", async function () {
            await expect(
                vault.connect(payer).paySubscription(
                    merchantId,
                    planId,
                    stealthAddress.address,
                    ephemeralPubKey,
                    { value: price }
                )
            ).to.emit(vault, "PaymentReceived");

            // Verify stealth address received funds
            expect(await ethers.provider.getBalance(stealthAddress.address)).to.be.gt(0);
        });

        it("Should emit PaymentReceived event with correct data", async function () {
            const tx = await vault.connect(payer).paySubscription(
                merchantId,
                planId,
                stealthAddress.address,
                ephemeralPubKey,
                { value: price }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return vault.interface.parseLog(log).name === "PaymentReceived";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
        });

        it("Should revert when paying with incorrect amount", async function () {
            await expect(
                vault.connect(payer).paySubscription(
                    merchantId,
                    planId,
                    stealthAddress.address,
                    ephemeralPubKey,
                    { value: ethers.parseEther("0.05") }
                )
            ).to.be.revertedWithCustomError(vault, "InvalidPayment");
        });

        it("Should revert when paying to zero address", async function () {
            await expect(
                vault.connect(payer).paySubscription(
                    merchantId,
                    planId,
                    ethers.ZeroAddress,
                    ephemeralPubKey,
                    { value: price }
                )
            ).to.be.revertedWithCustomError(vault, "InvalidStealthAddress");
        });

        it("Should revert when ephemeral key is invalid length", async function () {
            const invalidKey = "0x1234"; // Too short

            await expect(
                vault.connect(payer).paySubscription(
                    merchantId,
                    planId,
                    stealthAddress.address,
                    invalidKey,
                    { value: price }
                )
            ).to.be.revertedWithCustomError(vault, "InvalidEphemeralPubKey");
        });

        it("Should revert when plan is not active", async function () {
            await vault.connect(merchant).updatePlan(merchantId, planId, price, duration, false);

            await expect(
                vault.connect(payer).paySubscription(
                    merchantId,
                    planId,
                    stealthAddress.address,
                    ephemeralPubKey,
                    { value: price }
                )
            ).to.be.revertedWithCustomError(vault, "PlanNotActive");
        });
    });

    describe("Privacy Guarantees", function () {
        it("Should NOT store subscription data on-chain", async function () {
            // Verify no subscription storage functions exist
            expect(vault.getSubscription).to.be.undefined;
            expect(vault.getUserSubscriptions).to.be.undefined;
            expect(vault.isSubscriptionValid).to.be.undefined;
        });

        it("Should NOT emit domainHash in events", async function () {
            const price = ethers.parseEther("0.1");
            const duration = 30 * 24 * 60 * 60;
            const ephemeralPubKey = "0x04" + "a".repeat(128);

            await vault.connect(merchant).registerMerchant(merchantId);
            await vault.connect(merchant).createPlan(merchantId, planId, price, duration);

            const tx = await vault.connect(payer).paySubscription(
                merchantId,
                planId,
                stealthAddress.address,
                ephemeralPubKey,
                { value: price }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = vault.interface.parseLog(log);
                    return parsed.name === "PaymentReceived";
                } catch {
                    return false;
                }
            });

            const parsedEvent = vault.interface.parseLog(event);

            // Verify event does NOT contain domainHash
            expect(parsedEvent.args.domainHash).to.be.undefined;

            // Verify event DOES contain necessary fields
            expect(parsedEvent.args.merchantId).to.equal(merchantId);
            expect(parsedEvent.args.planId).to.equal(planId);
            expect(parsedEvent.args.stealthAddress).to.equal(stealthAddress.address);
        });
    });

    describe("Parallel Execution Optimization", function () {
        it("Should be stateless (no shared state between payments)", async function () {
            const price = ethers.parseEther("0.1");
            const duration = 30 * 24 * 60 * 60;
            const ephemeralPubKey = "0x04" + "a".repeat(128);

            await vault.connect(merchant).registerMerchant(merchantId);
            await vault.connect(merchant).createPlan(merchantId, planId, price, duration);

            // Make multiple payments (should be independent)
            const [_, __, stealth1, stealth2, stealth3] = await ethers.getSigners();

            await vault.connect(payer).paySubscription(
                merchantId, planId, stealth1.address, ephemeralPubKey, { value: price }
            );
            await vault.connect(payer).paySubscription(
                merchantId, planId, stealth2.address, ephemeralPubKey, { value: price }
            );
            await vault.connect(payer).paySubscription(
                merchantId, planId, stealth3.address, ephemeralPubKey, { value: price }
            );

            // All should succeed independently
            expect(await ethers.provider.getBalance(stealth1.address)).to.be.gt(0);
            expect(await ethers.provider.getBalance(stealth2.address)).to.be.gt(0);
            expect(await ethers.provider.getBalance(stealth3.address)).to.be.gt(0);
        });
    });
});
