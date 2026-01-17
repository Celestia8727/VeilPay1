const { ethers } = require("ethers");
const { checkPayment } = require("../scripts/stealth-utils");
const { computeCommitment, generateSecret } = require("../scripts/commitment-utils");

/**
 * Subscription Indexer
 * 
 * Scans blockchain for PaymentReceived events, detects payments using view key,
 * builds subscription records, computes commitments, and posts them on-chain.
 * 
 * Privacy: Uses view key locally - learns nothing about user identity
 */

class SubscriptionIndexer {
    constructor(provider, vaultAddress, commitmentRegistryAddress, viewPrivateKey, spendPublicKey) {
        this.provider = provider;
        this.vaultAddress = vaultAddress;
        this.commitmentRegistryAddress = commitmentRegistryAddress;
        this.viewPrivateKey = viewPrivateKey;
        this.spendPublicKey = spendPublicKey;

        // Local database of discovered subscriptions
        this.subscriptions = [];
    }

    /**
     * Scan blockchain for payments
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block (or 'latest')
     */
    async scanPayments(fromBlock = 0, toBlock = 'latest') {
        console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

        // Get vault contract
        const vaultABI = [
            "event PaymentReceived(bytes32 indexed merchantId, uint256 indexed planId, address indexed stealthAddress, uint256 amount, uint256 duration, uint256 timestamp, bytes ephemeralPubKey)"
        ];
        const vault = new ethers.Contract(this.vaultAddress, vaultABI, this.provider);

        // Query PaymentReceived events
        const filter = vault.filters.PaymentReceived();
        const events = await vault.queryFilter(filter, fromBlock, toBlock);

        console.log(`Found ${events.length} payment events`);

        // Check each payment
        for (const event of events) {
            await this.processPaymentEvent(event);
        }

        console.log(`Discovered ${this.subscriptions.length} subscriptions for this user`);

        return this.subscriptions;
    }

    /**
     * Process a single payment event
     */
    async processPaymentEvent(event) {
        const { merchantId, planId, stealthAddress, amount, duration, timestamp, ephemeralPubKey } = event.args;

        // Convert ephemeralPubKey from bytes to hex string
        const ephemeralPubKeyHex = ethers.hexlify(ephemeralPubKey);

        // Check if this payment belongs to us
        const isMine = checkPayment(
            this.viewPrivateKey,
            this.spendPublicKey,
            ephemeralPubKeyHex,
            stealthAddress
        );

        if (isMine) {
            console.log(`✓ Found payment to stealth address ${stealthAddress}`);

            // Build subscription record
            const subscription = {
                merchantId: merchantId,
                planId: Number(planId),
                stealthAddress: stealthAddress,
                paidAt: Number(timestamp),
                expiresAt: Number(timestamp) + Number(duration),
                amount: amount.toString(),
                duration: Number(duration),
                ephemeralPubKey: ephemeralPubKeyHex,
                secret: generateSecret(), // Random secret for commitment
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            };

            // Compute commitment
            subscription.commitment = computeCommitment(subscription);

            // Add to local database
            this.subscriptions.push(subscription);

            console.log(`  Merchant: ${merchantId}`);
            console.log(`  Plan: ${planId}`);
            console.log(`  Expires: ${new Date(subscription.expiresAt * 1000).toISOString()}`);
            console.log(`  Commitment: ${subscription.commitment}`);
        }
    }

    /**
     * Post commitments to on-chain registry
     * @param {Object} signer - Ethers signer to send transactions
     */
    async postCommitments(signer) {
        console.log(`\nPosting ${this.subscriptions.length} commitments to registry...`);

        const registryABI = [
            "function registerCommitmentBatch(bytes32[] calldata commitments) external",
            "function isValidCommitment(bytes32 commitment) external view returns (bool)"
        ];
        const registry = new ethers.Contract(this.commitmentRegistryAddress, registryABI, signer);

        // Filter out commitments that already exist
        const newCommitments = [];
        for (const sub of this.subscriptions) {
            const exists = await registry.isValidCommitment(sub.commitment);
            if (!exists) {
                newCommitments.push(sub.commitment);
            } else {
                console.log(`  Commitment ${sub.commitment} already exists`);
            }
        }

        if (newCommitments.length === 0) {
            console.log("All commitments already posted");
            return;
        }

        // Post batch
        console.log(`Posting ${newCommitments.length} new commitments...`);
        const tx = await registry.registerCommitmentBatch(newCommitments);
        console.log(`Transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✓ Commitments posted in block ${receipt.blockNumber}`);

        return receipt;
    }

    /**
     * Get active subscriptions for a merchant/plan
     * @param {string} merchantId - Merchant identifier
     * @param {number} planId - Plan identifier
     * @returns {Array} active subscriptions
     */
    getActiveSubscriptions(merchantId, planId) {
        const now = Math.floor(Date.now() / 1000);

        return this.subscriptions.filter(sub =>
            sub.merchantId === merchantId &&
            sub.planId === planId &&
            sub.expiresAt > now
        );
    }

    /**
     * Get all subscriptions
     */
    getAllSubscriptions() {
        return this.subscriptions;
    }

    /**
     * Save subscriptions to file
     */
    async saveToFile(filename) {
        const fs = require('fs').promises;
        await fs.writeFile(filename, JSON.stringify(this.subscriptions, null, 2));
        console.log(`Saved ${this.subscriptions.length} subscriptions to ${filename}`);
    }

    /**
     * Load subscriptions from file
     */
    async loadFromFile(filename) {
        const fs = require('fs').promises;
        const data = await fs.readFile(filename, 'utf8');
        this.subscriptions = JSON.parse(data);
        console.log(`Loaded ${this.subscriptions.length} subscriptions from ${filename}`);
    }
}

module.exports = SubscriptionIndexer;
