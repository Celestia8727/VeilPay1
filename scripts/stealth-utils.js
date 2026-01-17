const { ethers } = require("ethers");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

/**
 * Stealth Address Utilities (Proper EC Implementation)
 * 
 * Implements ECDH-based stealth addresses using proper elliptic curve operations.
 */

/**
 * Generate a new stealth key pair
 */
function generateStealthKeys() {
    // Generate spend key pair
    const spendKey = ec.genKeyPair();
    const spendPrivateKey = "0x" + spendKey.getPrivate("hex");
    const spendPublicKey = "0x" + spendKey.getPublic(false, "hex");

    // Generate view key pair
    const viewKey = ec.genKeyPair();
    const viewPrivateKey = "0x" + viewKey.getPrivate("hex");
    const viewPublicKey = "0x" + viewKey.getPublic(false, "hex");

    return {
        spendPrivateKey,    // s
        spendPublicKey,     // S = s·G
        viewPrivateKey,     // v
        viewPublicKey       // V = v·G
    };
}

/**
 * Generate a stealth address for a recipient
 */
function generateStealthAddress(spendPubKey, viewPubKey) {
    // Step 1: Generate ephemeral key pair
    const ephemeralKey = ec.genKeyPair();
    const ephemeralPrivateKey = "0x" + ephemeralKey.getPrivate("hex");
    const ephemeralPublicKey = "0x" + ephemeralKey.getPublic(false, "hex");

    // Step 2: Compute shared secret (ECDH)
    // shared = r · V
    const viewPubKeyPoint = ec.keyFromPublic(viewPubKey.slice(2), "hex");
    const sharedPoint = viewPubKeyPoint.getPublic().mul(ephemeralKey.getPrivate());
    const sharedSecret = "0x" + sharedPoint.encode("hex");

    // Step 3: Hash the shared secret
    const hashedSecret = ethers.keccak256(sharedSecret);

    // Step 4: Compute stealth public key
    // StealthPubKey = S + H(shared)·G
    const spendPubKeyPoint = ec.keyFromPublic(spendPubKey.slice(2), "hex").getPublic();
    const hashedSecretScalar = ec.keyFromPrivate(hashedSecret.slice(2), "hex");
    const hashedSecretPoint = hashedSecretScalar.getPublic();
    
    // Point addition
    const stealthPubKeyPoint = spendPubKeyPoint.add(hashedSecretPoint);
    const stealthPublicKey = "0x" + stealthPubKeyPoint.encode("hex", false);

    // Step 5: Derive address
    const stealthAddress = publicKeyToAddress(stealthPublicKey);

    return {
        stealthAddress,
        ephemeralPublicKey,
        sharedSecret,
        hashedSecret
    };
}

/**
 * Check if a payment belongs to the user
 */
function checkPayment(viewPrivateKey, spendPublicKey, ephemeralPublicKey, targetAddress) {
    try {
        // Step 1: Compute shared secret
        // shared' = v · R
        const viewPrivKey = ec.keyFromPrivate(viewPrivateKey.slice(2), "hex");
        const ephemeralPubKeyPoint = ec.keyFromPublic(ephemeralPublicKey.slice(2), "hex").getPublic();
        const sharedPoint = ephemeralPubKeyPoint.mul(viewPrivKey.getPrivate());
        const sharedSecret = "0x" + sharedPoint.encode("hex");

        // Step 2: Hash the shared secret
        const hashedSecret = ethers.keccak256(sharedSecret);

        // Step 3: Compute candidate stealth public key
        const spendPubKeyPoint = ec.keyFromPublic(spendPublicKey.slice(2), "hex").getPublic();
        const hashedSecretScalar = ec.keyFromPrivate(hashedSecret.slice(2), "hex");
        const hashedSecretPoint = hashedSecretScalar.getPublic();

        const candidatePubKeyPoint = spendPubKeyPoint.add(hashedSecretPoint);
        const candidatePublicKey = "0x" + candidatePubKeyPoint.encode("hex", false);

        // Step 4: Derive address
        const candidateAddress = publicKeyToAddress(candidatePublicKey);

        // Step 5: Check match
        return candidateAddress.toLowerCase() === targetAddress.toLowerCase();
    } catch (error) {
        console.error("Error checking payment:", error);
        return false;
    }
}

/**
 * Derive the private key for a stealth address
 */
function deriveStealthPrivateKey(spendPrivateKey, viewPrivateKey, ephemeralPublicKey) {
    // Step 1: Compute shared secret
    const viewPrivKey = ec.keyFromPrivate(viewPrivateKey.slice(2), "hex");
    const ephemeralPubKeyPoint = ec.keyFromPublic(ephemeralPublicKey.slice(2), "hex").getPublic();
    const sharedPoint = ephemeralPubKeyPoint.mul(viewPrivKey.getPrivate());
    const sharedSecret = "0x" + sharedPoint.encode("hex");

    // Step 2: Hash the shared secret
    const hashedSecret = ethers.keccak256(sharedSecret);

    // Step 3: Derive stealth private key
    // stealthPrivateKey = s + H(shared)
    const stealthPrivateKey = addPrivateKeys(spendPrivateKey, hashedSecret);

    return stealthPrivateKey;
}

/**
 * Add two private keys (modular addition)
 */
function addPrivateKeys(privKey1, privKey2) {
    const key1 = BigInt(privKey1);
    const key2 = BigInt(privKey2);

    // secp256k1 curve order
    const n = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

    // Add modulo n
    const result = (key1 + key2) % n;

    return "0x" + result.toString(16).padStart(64, "0");
}

/**
 * Convert public key to Ethereum address
 */
function publicKeyToAddress(publicKey) {
    // Remove 0x04 prefix if present (uncompressed key indicator)
    let pubKey = publicKey.slice(2);
    if (pubKey.startsWith("04")) {
        pubKey = pubKey.slice(2);
    }

    // Hash the public key
    const hash = ethers.keccak256("0x" + pubKey);

    // Take last 20 bytes as address
    const address = "0x" + hash.slice(-40);

    return ethers.getAddress(address);
}

module.exports = {
    generateStealthKeys,
    generateStealthAddress,
    checkPayment,
    deriveStealthPrivateKey,
    publicKeyToAddress
};
