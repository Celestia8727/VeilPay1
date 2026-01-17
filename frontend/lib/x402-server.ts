/**
 * x402 Server-Side Utilities
 * 
 * Handles payment verification and settlement using USDC's TransferWithAuthorization
 */

import { createPublicClient, createWalletClient, http, getAddress, parseSignature } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { X402_CONFIG, PaymentRequirements, recordX402Payment } from './x402'

// Monad Testnet chain definition
export const monadTestnet = {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: [X402_CONFIG.rpcUrl]
        }
    }
} as const

// USDC ABI for TransferWithAuthorization
const USDC_ABI = [
    {
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' }
        ],
        name: 'transferWithAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'signature', type: 'bytes' }
        ],
        name: 'transferWithAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'authorizer', type: 'address' },
            { name: 'nonce', type: 'bytes32' }
        ],
        name: 'authorizationState',
        outputs: [{ type: 'bool' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const

// EIP-712 types for TransferWithAuthorization
export const authorizationTypes = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
    ]
}

// Payment payload types
export interface ExactEvmPayloadAuthorization {
    from: string
    to: string
    value: string
    validAfter: string
    validBefore: string
    nonce: string
}

export interface ExactEvmPayload {
    signature: string
    authorization: ExactEvmPayloadAuthorization
}

export interface PaymentPayload {
    x402Version: number
    scheme: 'exact'
    network: string
    payload: ExactEvmPayload
}

/**
 * Get the facilitator wallet client
 * Uses the PRIVATE_KEY from environment
 */
export function getFacilitatorWallet() {
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('PRIVATE_KEY not set in environment')
    }

    // Ensure private key has 0x prefix
    const formattedKey = privateKey.startsWith('0x')
        ? privateKey as `0x${string}`
        : `0x${privateKey}` as `0x${string}`

    const account = privateKeyToAccount(formattedKey)

    return createWalletClient({
        account,
        chain: monadTestnet,
        transport: http(X402_CONFIG.rpcUrl)
    })
}

/**
 * Get a public client for reading blockchain state
 */
export function getPublicClient() {
    return createPublicClient({
        chain: monadTestnet,
        transport: http(X402_CONFIG.rpcUrl)
    })
}

/**
 * Decode base64 payment header
 */
export function decodePaymentHeader(paymentHeader: string): PaymentPayload {
    try {
        const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8')
        return JSON.parse(decoded)
    } catch (error) {
        throw new Error('Invalid payment header format')
    }
}

/**
 * Encode payment payload to base64 header
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Verify x402 payment signature
 * Checks that the signature is valid and user has sufficient balance
 */
export async function verifyX402Payment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
): Promise<{
    isValid: boolean
    invalidReason?: string
    payer?: string
}> {
    const publicClient = getPublicClient()
    const { payload } = paymentPayload
    const { authorization } = payload

    try {
        // 1. Check scheme and network
        if (paymentPayload.scheme !== 'exact') {
            return { isValid: false, invalidReason: 'unsupported_scheme', payer: authorization.from }
        }

        // 2. Check recipient matches
        if (getAddress(authorization.to) !== getAddress(paymentRequirements.payTo)) {
            return { isValid: false, invalidReason: 'recipient_mismatch', payer: authorization.from }
        }

        // 3. Check amount is sufficient
        if (BigInt(authorization.value) < BigInt(paymentRequirements.maxAmountRequired)) {
            return { isValid: false, invalidReason: 'insufficient_amount', payer: authorization.from }
        }

        // 4. Check timing
        const now = BigInt(Math.floor(Date.now() / 1000))
        if (BigInt(authorization.validAfter) > now) {
            return { isValid: false, invalidReason: 'not_yet_valid', payer: authorization.from }
        }
        if (BigInt(authorization.validBefore) < now + BigInt(6)) {
            return { isValid: false, invalidReason: 'expired', payer: authorization.from }
        }

        // 5. Check user's USDC balance
        const balance = await publicClient.readContract({
            address: X402_CONFIG.asset as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [authorization.from as `0x${string}`]
        }) as bigint

        if (balance < BigInt(paymentRequirements.maxAmountRequired)) {
            return { isValid: false, invalidReason: 'insufficient_funds', payer: authorization.from }
        }

        // 6. Check nonce hasn't been used
        const nonceUsed = await publicClient.readContract({
            address: X402_CONFIG.asset as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'authorizationState',
            args: [authorization.from as `0x${string}`, authorization.nonce as `0x${string}`]
        }) as boolean

        if (nonceUsed) {
            return { isValid: false, invalidReason: 'nonce_already_used', payer: authorization.from }
        }

        // 7. Verify signature by recovering signer
        const domain = {
            name: X402_CONFIG.assetName,
            version: X402_CONFIG.assetVersion,
            chainId: X402_CONFIG.chainId,
            verifyingContract: X402_CONFIG.asset as `0x${string}`
        }

        const signatureValid = await publicClient.verifyTypedData({
            address: authorization.from as `0x${string}`,
            domain,
            types: authorizationTypes,
            primaryType: 'TransferWithAuthorization',
            message: {
                from: getAddress(authorization.from),
                to: getAddress(authorization.to),
                value: BigInt(authorization.value),
                validAfter: BigInt(authorization.validAfter),
                validBefore: BigInt(authorization.validBefore),
                nonce: authorization.nonce as `0x${string}`
            },
            signature: payload.signature as `0x${string}`
        })

        if (!signatureValid) {
            return { isValid: false, invalidReason: 'invalid_signature', payer: authorization.from }
        }

        return { isValid: true, payer: authorization.from }

    } catch (error: any) {
        console.error('Verification error:', error)
        return { isValid: false, invalidReason: error.message, payer: authorization.from }
    }
}

/**
 * Settle x402 payment - execute the USDC transfer
 * Calls transferWithAuthorization on the USDC contract
 * The contract itself validates the signature
 */
export async function settleX402Payment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
    service: string
): Promise<{
    success: boolean
    transaction?: string
    errorReason?: string
    payer?: string
}> {
    const { payload } = paymentPayload
    const { authorization } = payload

    try {
        console.log('🔄 Settling x402 payment...')
        console.log('   Payload:', JSON.stringify(paymentPayload, null, 2))

        // Basic validation only - let the contract validate the signature
        if (paymentPayload.scheme !== 'exact') {
            return { success: false, errorReason: 'unsupported_scheme', payer: authorization.from }
        }

        // Check recipient matches
        if (getAddress(authorization.to) !== getAddress(paymentRequirements.payTo)) {
            return { success: false, errorReason: 'recipient_mismatch', payer: authorization.from }
        }

        // Check amount is sufficient
        if (BigInt(authorization.value) < BigInt(paymentRequirements.maxAmountRequired)) {
            return { success: false, errorReason: 'insufficient_amount', payer: authorization.from }
        }

        // Get facilitator wallet
        const walletClient = getFacilitatorWallet()
        const publicClient = getPublicClient()

        console.log('   From:', authorization.from)
        console.log('   To:', authorization.to)
        console.log('   Amount:', authorization.value)
        console.log('   Nonce:', authorization.nonce)

        // Parse the signature
        const parsedSig = parseSignature(payload.signature as `0x${string}`)
        const v = parsedSig.v !== undefined ? Number(parsedSig.v) : 27 + parsedSig.yParity!

        console.log('   Signature v:', v)
        console.log('   Signature r:', parsedSig.r)
        console.log('   Signature s:', parsedSig.s)

        // Execute transferWithAuthorization - the contract validates the signature
        const tx = await walletClient.writeContract({
            address: X402_CONFIG.asset as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
            args: [
                authorization.from as `0x${string}`,
                authorization.to as `0x${string}`,
                BigInt(authorization.value),
                BigInt(authorization.validAfter),
                BigInt(authorization.validBefore),
                authorization.nonce as `0x${string}`,
                v,
                parsedSig.r,
                parsedSig.s
            ]
        })

        console.log('   Transaction submitted:', tx)

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

        if (receipt.status !== 'success') {
            return {
                success: false,
                transaction: tx,
                errorReason: 'transaction_failed',
                payer: authorization.from
            }
        }

        console.log('✅ x402 Payment settled:', tx)

        // Record the payment
        await recordX402Payment(
            tx,
            service,
            authorization.value,
            authorization.from
        )

        return {
            success: true,
            transaction: tx,
            payer: authorization.from
        }

    } catch (error: any) {
        console.error('Settlement error:', error)
        return {
            success: false,
            errorReason: error.message || 'settlement_failed',
            payer: authorization.from
        }
    }
}

/**
 * Encode settlement response for X-PAYMENT-RESPONSE header
 */
export function encodeSettlementResponse(response: {
    success: boolean
    transaction?: string
    network: string
    payer?: string
}): string {
    return Buffer.from(JSON.stringify(response)).toString('base64')
}
