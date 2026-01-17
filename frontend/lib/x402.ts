/**
 * x402 Payment Protocol - Configuration
 * 
 * Uses USDC with EIP-3009 TransferWithAuthorization for gasless payments.
 * User signs authorization, server executes USDC transfer.
 */

import { supabase } from './supabase'

// USDC on Monad Testnet (EIP-3009 compatible)
export const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3'
export const USDC_DECIMALS = 6

// x402 Configuration for Monad
export const X402_CONFIG = {
    // x402 protocol version
    x402Version: 1,

    // Network configuration
    network: 'monad-testnet' as const,
    chainId: 10143,

    // Asset configuration (USDC)
    currency: 'USDC',
    asset: USDC_ADDRESS,
    decimals: USDC_DECIMALS,

    // USDC EIP-712 domain info (queried from contract: name() returns 'USDC')
    assetName: 'USDC',
    assetVersion: '2',

    // RPC endpoint
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',

    // Platform wallet that receives x402 payments
    platformAddress: process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || '0x3319148cB4324b0fbBb358c93D52e0b7f3fe4bc9',

    // Pricing for services (in USDC atomic units - 6 decimals)
    services: {
        priorityScan: {
            amount: '10000', // 0.01 USDC
            displayAmount: '0.01',
            slaSeconds: 5,
            description: 'Instant payment detection',
            maxTimeoutSeconds: 300 // 5 minutes
        },
        gasRelay: {
            amount: '20000', // 0.02 USDC
            displayAmount: '0.02',
            slaSeconds: 30,
            description: 'Gas relay for private claiming',
            maxTimeoutSeconds: 300
        }
    }
}

// Payment Requirements type (x402 spec)
export interface PaymentRequirements {
    scheme: 'exact'
    network: string
    maxAmountRequired: string
    asset: string
    payTo: string
    maxTimeoutSeconds: number
    description: string
    resource: string
    mimeType: string
    extra?: {
        name?: string
        version?: string
    }
}

// x402 Challenge Response (402 response body)
export interface X402Response {
    x402Version: number
    accepts: PaymentRequirements[]
    error?: string
}

/**
 * Create x402 Payment Requirements (402 response body)
 * Returns the proper x402 format with accepts array
 */
export function createPaymentRequirements(
    service: keyof typeof X402_CONFIG.services,
    resourcePath: string,
    metadata?: Record<string, any>
): {
    status: number
    body: X402Response
} {
    const serviceConfig = X402_CONFIG.services[service]

    const paymentRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: X402_CONFIG.network,
        maxAmountRequired: serviceConfig.amount,
        asset: X402_CONFIG.asset,
        payTo: X402_CONFIG.platformAddress,
        maxTimeoutSeconds: serviceConfig.maxTimeoutSeconds,
        description: serviceConfig.description,
        resource: resourcePath,
        mimeType: 'application/json',
        extra: {
            name: X402_CONFIG.assetName,
            version: X402_CONFIG.assetVersion
        }
    }

    return {
        status: 402,
        body: {
            x402Version: X402_CONFIG.x402Version,
            accepts: [paymentRequirements],
            error: 'payment_required'
        }
    }
}

// Legacy function for backwards compatibility
export function createPaymentChallenge(
    service: keyof typeof X402_CONFIG.services,
    resourcePath: string,
    metadata?: Record<string, any>
) {
    return createPaymentRequirements(service, resourcePath, metadata)
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

/**
 * Format USDC amount for display
 */
export function formatUsdcAmount(atomicAmount: string): string {
    const amount = BigInt(atomicAmount)
    const divisor = BigInt(10 ** USDC_DECIMALS)
    const whole = amount / divisor
    const fraction = amount % divisor
    const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').slice(0, 2)
    return `${whole}.${fractionStr}`
}

/**
 * Parse USDC amount from display format
 */
export function parseUsdcAmount(displayAmount: string): string {
    const [whole, fraction = ''] = displayAmount.split('.')
    const paddedFraction = fraction.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS)
    return BigInt(whole + paddedFraction).toString()
}
