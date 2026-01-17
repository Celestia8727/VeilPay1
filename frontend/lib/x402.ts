/**
 * x402 Payment Protocol Utilities
 * 
 * x402 Services:
 * 1. Priority Scan - Instant payment detection for your stealth addresses
 * 2. Gas Relay - Pay for gas to relay claim transactions
 */

import { supabase } from './supabase'

// x402 Configuration for Monad
export const X402_CONFIG = {
    network: 'monad-testnet',
    chainId: 10143,
    currency: 'MON',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    // Platform wallet that receives x402 payments
    platformAddress: process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || '0x3319148cB4324b0fbBb358c93D52e0b7f3fe4bc9',
    // Pricing for services
    services: {
        priorityScan: {
            amount: '0.001', // 0.001 MON for priority scan
            slaSeconds: 5,
            description: 'Instant payment detection'
        },
        gasRelay: {
            amount: '0.002', // 0.002 MON for gas relay (covers gas + fee)
            slaSeconds: 30,
            description: 'Gas relay for private claiming'
        }
    }
}

export interface X402Challenge {
    error: string
    resource: string
    amount: string
    currency: string
    network: string
    chainId: number
    paymentAddress: string
    expiresIn: number
    metadata: Record<string, any>
}

/**
 * x402 Payment Challenge Response
 * Returns the 402 response body for unpaid requests
 */
export function createPaymentChallenge(
    service: keyof typeof X402_CONFIG.services,
    resourcePath: string,
    metadata?: Record<string, any>
): {
    status: number
    body: X402Challenge
} {
    const serviceConfig = X402_CONFIG.services[service]

    return {
        status: 402,
        body: {
            error: 'payment_required',
            resource: resourcePath,
            amount: serviceConfig.amount,
            currency: X402_CONFIG.currency,
            network: X402_CONFIG.network,
            chainId: X402_CONFIG.chainId,
            paymentAddress: X402_CONFIG.platformAddress,
            expiresIn: 300, // 5 minutes to pay
            metadata: {
                service: service,
                description: serviceConfig.description,
                slaSeconds: serviceConfig.slaSeconds,
                ...metadata
            }
        }
    }
}

/**
 * Verify x402 payment from X-PAYMENT header
 * Header format: x402 {txHash}
 */
export async function verifyX402Payment(
    paymentHeader: string | null,
    expectedAmount: string,
    maxAgeSeconds: number = 300
): Promise<{
    valid: boolean
    paymentHash?: string
    error?: string
}> {
    if (!paymentHeader) {
        return { valid: false, error: 'No X-PAYMENT header provided' }
    }

    // Parse header: "x402 {txHash}"
    const parts = paymentHeader.split(' ')
    if (parts.length < 2 || parts[0].toLowerCase() !== 'x402') {
        return { valid: false, error: 'Invalid X-PAYMENT header format' }
    }

    const txHash = parts[1]

    // For demo, accept the tx hash and trust it
    // In production, verify on-chain that:
    // 1. Transaction exists
    // 2. Amount >= expectedAmount
    // 3. Recipient is platform address
    // 4. Transaction is recent

    return { valid: true, paymentHash: txHash }
}

/**
 * Record a successful x402 payment
 */
export async function recordX402Payment(
    txHash: string,
    service: string,
    amount: string,
    payerAddress: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('x402_payments')
            .insert({
                tx_hash: txHash,
                service,
                amount,
                payer_address: payerAddress,
                recipient_address: X402_CONFIG.platformAddress,
                timestamp: Math.floor(Date.now() / 1000),
                status: 'completed'
            })

        return !error
    } catch {
        return false
    }
}
