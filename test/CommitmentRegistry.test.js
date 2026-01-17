const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommitmentRegistry", function () {
    let commitmentRegistry;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const CommitmentRegistry = await ethers.getContractFactory("CommitmentRegistry");
        commitmentRegistry = await CommitmentRegistry.deploy();
        await commitmentRegistry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await commitmentRegistry.getAddress()).to.be.properAddress;
        });

        it("Should initialize with zero commitments", async function () {
            expect(await commitmentRegistry.totalCommitments()).to.equal(0);
        });
    });

    describe("Commitment Registration", function () {
        it("Should register a commitment successfully", async function () {
            const commitment = ethers.id("test-commitment-1");

            await expect(commitmentRegistry.registerCommitment(commitment))
                .to.emit(commitmentRegistry, "CommitmentRegistered")
                .withArgs(commitment, owner.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            expect(await commitmentRegistry.isValidCommitment(commitment)).to.be.true;
            expect(await commitmentRegistry.totalCommitments()).to.equal(1);
        });

        it("Should revert when registering zero commitment", async function () {
            const zeroCommitment = ethers.ZeroHash;

            await expect(
                commitmentRegistry.registerCommitment(zeroCommitment)
            ).to.be.revertedWithCustomError(commitmentRegistry, "InvalidCommitment");
        });

        it("Should revert when registering duplicate commitment", async function () {
            const commitment = ethers.id("test-commitment-2");

            await commitmentRegistry.registerCommitment(commitment);

            await expect(
                commitmentRegistry.registerCommitment(commitment)
            ).to.be.revertedWithCustomError(commitmentRegistry, "CommitmentAlreadyExists");
        });

        it("Should allow anyone to register commitments (permissionless)", async function () {
            const commitment1 = ethers.id("commitment-by-user1");
            const commitment2 = ethers.id("commitment-by-user2");

            await commitmentRegistry.connect(user1).registerCommitment(commitment1);
            await commitmentRegistry.connect(user2).registerCommitment(commitment2);

            expect(await commitmentRegistry.isValidCommitment(commitment1)).to.be.true;
            expect(await commitmentRegistry.isValidCommitment(commitment2)).to.be.true;
        });

        it("Should store commitment details correctly", async function () {
            const commitment = ethers.id("test-commitment-3");

            await commitmentRegistry.connect(user1).registerCommitment(commitment);

            const details = await commitmentRegistry.getCommitmentDetails(commitment);
            expect(details.exists).to.be.true;
            expect(details.poster).to.equal(user1.address);
            expect(details.timestamp).to.be.gt(0);
        });
    });

    describe("Batch Registration", function () {
        it("Should register multiple commitments in batch", async function () {
            const commitments = [
                ethers.id("batch-1"),
                ethers.id("batch-2"),
                ethers.id("batch-3")
            ];

            await commitmentRegistry.registerCommitmentBatch(commitments);

            for (const commitment of commitments) {
                expect(await commitmentRegistry.isValidCommitment(commitment)).to.be.true;
            }

            expect(await commitmentRegistry.totalCommitments()).to.equal(3);
        });

        it("Should skip duplicates in batch without reverting", async function () {
            const commitment1 = ethers.id("batch-dup-1");
            const commitment2 = ethers.id("batch-dup-2");

            // Register first commitment
            await commitmentRegistry.registerCommitment(commitment1);

            // Batch with duplicate should skip it
            await commitmentRegistry.registerCommitmentBatch([commitment1, commitment2]);

            expect(await commitmentRegistry.totalCommitments()).to.equal(2);
        });

        it("Should revert on zero commitment in batch", async function () {
            const commitments = [
                ethers.id("batch-3"),
                ethers.ZeroHash
            ];

            await expect(
                commitmentRegistry.registerCommitmentBatch(commitments)
            ).to.be.revertedWithCustomError(commitmentRegistry, "InvalidCommitment");
        });
    });

    describe("Commitment Queries", function () {
        it("Should return false for non-existent commitment", async function () {
            const nonExistent = ethers.id("does-not-exist");
            expect(await commitmentRegistry.isValidCommitment(nonExistent)).to.be.false;
        });

        it("Should return correct details for non-existent commitment", async function () {
            const nonExistent = ethers.id("does-not-exist");
            const details = await commitmentRegistry.getCommitmentDetails(nonExistent);

            expect(details.exists).to.be.false;
            expect(details.timestamp).to.equal(0);
            expect(details.poster).to.equal(ethers.ZeroAddress);
        });
    });

    describe("Immutability", function () {
        it("Should not allow commitment deletion (no delete function exists)", async function () {
            const commitment = ethers.id("immutable-test");
            await commitmentRegistry.registerCommitment(commitment);

            // Verify no delete function exists
            expect(commitmentRegistry.deleteCommitment).to.be.undefined;

            // Commitment should still exist
            expect(await commitmentRegistry.isValidCommitment(commitment)).to.be.true;
        });
    });

    describe("Gas Optimization", function () {
        it("Should be gas-efficient for single registration", async function () {
            const commitment = ethers.id("gas-test-single");
            const tx = await commitmentRegistry.registerCommitment(commitment);
            const receipt = await tx.wait();

            // Should use reasonable gas (adjust threshold as needed)
            expect(receipt.gasUsed).to.be.lt(100000);
        });

        it("Should be more efficient for batch registration", async function () {
            const commitments = Array.from({ length: 10 }, (_, i) =>
                ethers.id(`gas-batch-${i}`)
            );

            const tx = await commitmentRegistry.registerCommitmentBatch(commitments);
            const receipt = await tx.wait();

            // Batch should be more efficient than 10 individual calls
            const avgGasPerCommitment = receipt.gasUsed / BigInt(10);
            expect(avgGasPerCommitment).to.be.lt(50000);
        });
    });
});
