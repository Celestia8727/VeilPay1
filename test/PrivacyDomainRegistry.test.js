const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivacyDomainRegistry", function () {
    let registry;
    let owner;
    let user1;
    let user2;

    const domainHash = ethers.keccak256(ethers.toUtf8Bytes("alice.veil"));
    const spendPubKey = ethers.keccak256(ethers.toUtf8Bytes("spend_pub_key"));
    const viewPubKey = ethers.keccak256(ethers.toUtf8Bytes("view_pub_key"));

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const PrivacyDomainRegistry = await ethers.getContractFactory("PrivacyDomainRegistry");
        registry = await PrivacyDomainRegistry.deploy();
        await registry.waitForDeployment();
    });

    describe("Domain Registration", function () {
        it("Should register a new domain", async function () {
            await expect(
                registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey)
            )
                .to.emit(registry, "DomainRegistered");

            const domain = await registry.getDomain(domainHash);
            expect(domain.owner).to.equal(user1.address);
            expect(domain.spendPubKey).to.equal(spendPubKey);
            expect(domain.viewPubKey).to.equal(viewPubKey);
            expect(domain.exists).to.be.true;
        });

        it("Should not allow registering the same domain twice", async function () {
            await registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey);

            await expect(
                registry.connect(user2).registerDomain(domainHash, spendPubKey, viewPubKey)
            ).to.be.revertedWithCustomError(registry, "DomainAlreadyExists");
        });

        it("Should not allow invalid public keys", async function () {
            const zeroPubKey = ethers.ZeroHash;

            await expect(
                registry.connect(user1).registerDomain(domainHash, zeroPubKey, viewPubKey)
            ).to.be.revertedWithCustomError(registry, "InvalidPublicKey");

            await expect(
                registry.connect(user1).registerDomain(domainHash, spendPubKey, zeroPubKey)
            ).to.be.revertedWithCustomError(registry, "InvalidPublicKey");
        });
    });

    describe("Domain Key Updates", function () {
        beforeEach(async function () {
            await registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey);
        });

        it("Should allow owner to update keys", async function () {
            const newSpendPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_spend_key"));
            const newViewPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_view_key"));

            await expect(
                registry.connect(user1).updateDomainKeys(domainHash, newSpendPubKey, newViewPubKey)
            )
                .to.emit(registry, "DomainKeysUpdated");

            const domain = await registry.getDomain(domainHash);
            expect(domain.spendPubKey).to.equal(newSpendPubKey);
            expect(domain.viewPubKey).to.equal(newViewPubKey);
        });

        it("Should not allow non-owner to update keys", async function () {
            const newSpendPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_spend_key"));
            const newViewPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_view_key"));

            await expect(
                registry.connect(user2).updateDomainKeys(domainHash, newSpendPubKey, newViewPubKey)
            ).to.be.revertedWithCustomError(registry, "NotDomainOwner");
        });

        it("Should not allow updating non-existent domain", async function () {
            const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("nonexistent.veil"));
            const newSpendPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_spend_key"));
            const newViewPubKey = ethers.keccak256(ethers.toUtf8Bytes("new_view_key"));

            await expect(
                registry.connect(user1).updateDomainKeys(nonExistentHash, newSpendPubKey, newViewPubKey)
            ).to.be.revertedWithCustomError(registry, "DomainDoesNotExist");
        });
    });

    describe("Domain Transfer", function () {
        beforeEach(async function () {
            await registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey);
        });

        it("Should allow owner to transfer domain", async function () {
            await expect(
                registry.connect(user1).transferDomain(domainHash, user2.address)
            )
                .to.emit(registry, "DomainTransferred");

            const domain = await registry.getDomain(domainHash);
            expect(domain.owner).to.equal(user2.address);
        });

        it("Should not allow non-owner to transfer domain", async function () {
            await expect(
                registry.connect(user2).transferDomain(domainHash, user2.address)
            ).to.be.revertedWithCustomError(registry, "NotDomainOwner");
        });

        it("Should not allow transfer to zero address", async function () {
            await expect(
                registry.connect(user1).transferDomain(domainHash, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(registry, "InvalidAddress");
        });
    });

    describe("Domain Queries", function () {
        it("Should return correct domain existence", async function () {
            expect(await registry.domainExists(domainHash)).to.be.false;

            await registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey);

            expect(await registry.domainExists(domainHash)).to.be.true;
        });

        it("Should return correct domain owner", async function () {
            await registry.connect(user1).registerDomain(domainHash, spendPubKey, viewPubKey);

            expect(await registry.getDomainOwner(domainHash)).to.equal(user1.address);
        });

        it("Should return zero address for non-existent domain owner", async function () {
            expect(await registry.getDomainOwner(domainHash)).to.equal(ethers.ZeroAddress);
        });
    });
});
