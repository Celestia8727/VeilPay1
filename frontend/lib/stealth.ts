import { keccak256 } from 'ethers'
// @ts-ignore - elliptic doesn't have great TypeScript support
import { ec as EC } from 'elliptic'

const ec = new EC('secp256k1')

/**
 * Generate a stealth address for a recipient
 * Based on ECDH (Elliptic Curve Diffie-Hellman)
 * 
 * @param spendPubKey - Recipient's spend public key (65 bytes, uncompressed)
 * @param viewPubKey - Recipient's view public key (65 bytes, uncompressed)
 * @returns Stealth address and ephemeral public key
 */
export function generateStealthAddress(
    spendPubKey: string,
    viewPubKey: string
): {
    stealthAddress: string
    ephemeralPublicKey: string
    sharedSecret: string
} {
    // Step 1: Generate ephemeral key pair (random)
    const ephemeralKey = ec.genKeyPair()
    const ephemeralPublicKey = '0x' + ephemeralKey.getPublic(false, 'hex')

    // Step 2: Compute shared secret using ECDH
    // shared = r · V (ephemeral private key × recipient's view public key)
    const viewPubKeyPoint = ec.keyFromPublic(viewPubKey.slice(2), 'hex')
    const sharedPoint = viewPubKeyPoint.getPublic().mul(ephemeralKey.getPrivate())
    const sharedSecret = '0x' + sharedPoint.encode('hex')

    // Step 3: Hash the shared secret
    const hashedSecret = keccak256(sharedSecret)

    // Step 4: Compute stealth public key
    // StealthPubKey = S + H(shared)·G
    // Where S is recipient's spend public key, H(shared) is hashed secret
    const spendPubKeyPoint = ec.keyFromPublic(spendPubKey.slice(2), 'hex').getPublic()
    const hashedSecretScalar = ec.keyFromPrivate(hashedSecret.slice(2), 'hex')
    const hashedSecretPoint = hashedSecretScalar.getPublic()

    // Point addition on elliptic curve
    const stealthPubKeyPoint = spendPubKeyPoint.add(hashedSecretPoint)
    const stealthPublicKey = '0x' + stealthPubKeyPoint.encode('hex', false)

    // Step 5: Derive Ethereum address from stealth public key
    const stealthAddress = publicKeyToAddress(stealthPublicKey)

    return {
        stealthAddress,
        ephemeralPublicKey,
        sharedSecret
    }
}

/**
 * Convert an uncompressed public key to an Ethereum address
 * @param publicKey - Uncompressed public key (0x04 + 128 hex chars)
 * @returns Ethereum address
 */
export function publicKeyToAddress(publicKey: string): string {
    // Remove 0x prefix
    let pubKey = publicKey.slice(2)

    // Remove 04 prefix if present (uncompressed key indicator)
    if (pubKey.startsWith('04')) {
        pubKey = pubKey.slice(2)
    }

    // Hash the public key (x and y coordinates only, no prefix)
    const hash = keccak256('0x' + pubKey)

    // Take last 20 bytes as address
    const address = '0x' + hash.slice(-40)

    // Return checksummed address
    return address
}

/**
 * Validate that a public key is in the correct format
 * @param pubKey - Public key to validate
 * @returns true if valid
 */
export function isValidPublicKey(pubKey: string): boolean {
    // Must start with 0x
    if (!pubKey.startsWith('0x')) return false

    // Remove 0x prefix for length check
    const hexPart = pubKey.slice(2)

    // Should be either:
    // - 130 chars (0x + 04 + 128 hex chars for x,y coordinates)
    // - 128 chars (0x + 128 hex chars, missing 04 prefix)
    if (hexPart.length !== 130 && hexPart.length !== 128) {
        console.warn(`Invalid public key length: ${hexPart.length}, expected 128 or 130`)
        return false
    }

    // If it has the 04 prefix, validate it
    if (hexPart.length === 130 && !hexPart.startsWith('04')) {
        console.warn('Public key should start with 04 prefix')
        return false
    }

    // Must be valid hex
    const isHex = /^[0-9a-fA-F]+$/.test(hexPart)
    if (!isHex) {
        console.warn('Public key contains non-hex characters')
    }

    return isHex
}

/**
 * Check if a payment belongs to the user
 * @param viewPrivateKey - User's view private key
 * @param spendPublicKey - User's spend public key
 * @param ephemeralPublicKey - Ephemeral public key from the payment event
 * @param targetAddress - Stealth address to check
 * @returns true if the payment belongs to the user
 */
export function checkPayment(
    viewPrivateKey: string,
    spendPublicKey: string,
    ephemeralPublicKey: string,
    targetAddress: string
): boolean {
    try {
        // Step 1: Compute shared secret (v · R)
        const viewPrivKey = ec.keyFromPrivate(viewPrivateKey.slice(2), 'hex')
        const ephemeralPubKeyPoint = ec.keyFromPublic(ephemeralPublicKey.slice(2), 'hex').getPublic()
        const sharedPoint = ephemeralPubKeyPoint.mul(viewPrivKey.getPrivate())
        const sharedSecret = '0x' + sharedPoint.encode('hex', false)

        // Step 2: Hash the shared secret
        const hashedSecret = keccak256(sharedSecret)

        // Step 3: Compute candidate stealth public key
        const spendPubKeyPoint = ec.keyFromPublic(spendPublicKey.slice(2), 'hex').getPublic()
        const hashedSecretScalar = ec.keyFromPrivate(hashedSecret.slice(2), 'hex')
        const hashedSecretPoint = hashedSecretScalar.getPublic()

        const candidatePubKeyPoint = spendPubKeyPoint.add(hashedSecretPoint)
        const candidatePublicKey = '0x' + candidatePubKeyPoint.encode('hex', false)

        // Step 4: Derive address
        const candidateAddress = publicKeyToAddress(candidatePublicKey)

        // Step 5: Check match
        return candidateAddress.toLowerCase() === targetAddress.toLowerCase()
    } catch (error) {
        console.error('Error checking payment:', error)
        return false
    }
}

/**
 * Derive the private key for a stealth address
 * @param spendPrivateKey - User's spend private key
 * @param viewPrivateKey - User's view private key
 * @param ephemeralPublicKey - Ephemeral public key from the payment event
 * @returns Private key that can spend from the stealth address
 */
export function deriveStealthPrivateKey(
    spendPrivateKey: string,
    viewPrivateKey: string,
    ephemeralPublicKey: string
): string {
    // Step 1: Compute shared secret
    const viewPrivKey = ec.keyFromPrivate(viewPrivateKey.slice(2), 'hex')
    const ephemeralPubKeyPoint = ec.keyFromPublic(ephemeralPublicKey.slice(2), 'hex').getPublic()
    const sharedPoint = ephemeralPubKeyPoint.mul(viewPrivKey.getPrivate())
    const sharedSecret = '0x' + sharedPoint.encode('hex', false)

    // Step 2: Hash the shared secret
    const hashedSecret = keccak256(sharedSecret)

    // Step 3: Derive stealth private key (s + H(shared))
    const stealthPrivateKey = addPrivateKeys(spendPrivateKey, hashedSecret)

    return stealthPrivateKey
}

/**
 * Add two private keys (modular addition)
 */
function addPrivateKeys(privKey1: string, privKey2: string): string {
    const key1 = BigInt(privKey1)
    const key2 = BigInt(privKey2)

    // secp256k1 curve order
    const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')

    // Add modulo n
    const result = (key1 + key2) % n

    return '0x' + result.toString(16).padStart(64, '0')
}

