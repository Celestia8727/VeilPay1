/**
 * x402 React Hook
 * 
 * Provides actual x402 payment handling for React components.
 * Uses EIP-712 signed TransferWithAuthorization for gasless USDC payments.
 */

'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { getAddress, toHex } from 'viem'
import { toast } from 'sonner'
import { X402_CONFIG, PaymentRequirements, X402Response, formatUsdcAmount } from '@/lib/x402'

// EIP-712 types for TransferWithAuthorization
const authorizationTypes = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
    ]
} as const

interface PaymentPayload {
    x402Version: number
    scheme: 'exact'
    network: string
    payload: {
        signature: string
        authorization: {
            from: string
            to: string
            value: string
            validAfter: string
            validBefore: string
            nonce: string
        }
    }
}

interface UseX402Options {
    onPaymentSuccess?: (txHash: string) => void
    onPaymentError?: (error: Error) => void
}

/**
 * Generate a random nonce for the authorization
 */
function createNonce(): `0x${string}` {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    return toHex(randomBytes)
}

/**
 * Encode payment payload to base64 for X-PAYMENT header
 */
function encodePaymentHeader(payload: PaymentPayload): string {
    return btoa(JSON.stringify(payload))
}

export function useX402(options: UseX402Options = {}) {
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isPaymentPending, setIsPaymentPending] = useState(false)
    const [currentChallenge, setCurrentChallenge] = useState<X402Response | null>(null)
    const [selectedRequirements, setSelectedRequirements] = useState<PaymentRequirements | null>(null)

    /**
     * Make an x402 fetch request
     * Automatically handles 402 responses
     */
    const x402Fetch = useCallback(async (
        url: string,
        init?: RequestInit
    ): Promise<{ data: any; paid: boolean; txHash?: string }> => {
        // First, try the request without payment
        const response = await fetch(url, init)

        if (response.status === 402) {
            // Payment required - parse x402 response
            const challenge: X402Response = await response.json()
            setCurrentChallenge(challenge)

            // Select the first payment requirement (USDC)
            if (challenge.accepts && challenge.accepts.length > 0) {
                setSelectedRequirements(challenge.accepts[0])
            }

            return { data: challenge, paid: false }
        }

        // Success - payment was already made or not required
        const data = await response.json()
        return { data, paid: true }
    }, [])

    /**
     * Sign the payment authorization (EIP-712)
     * This creates a TransferWithAuthorization signature for USDC
     */
    const signPaymentAuthorization = useCallback(async (): Promise<string | null> => {
        if (!selectedRequirements) {
            toast.error('No payment requirements available')
            return null
        }

        if (!walletClient || !address) {
            toast.error('Please connect your wallet first')
            return null
        }

        setIsPaymentPending(true)

        try {
            // Create authorization parameters
            const nonce = createNonce()
            const now = Math.floor(Date.now() / 1000)
            const validAfter = BigInt(now - 600) // Valid from 10 minutes ago
            const validBefore = BigInt(now + selectedRequirements.maxTimeoutSeconds)

            const authorization = {
                from: getAddress(address),
                to: getAddress(selectedRequirements.payTo),
                value: BigInt(selectedRequirements.maxAmountRequired),
                validAfter,
                validBefore,
                nonce
            }

            // EIP-712 domain for USDC
            const domain = {
                name: selectedRequirements.extra?.name || X402_CONFIG.assetName,
                version: selectedRequirements.extra?.version || X402_CONFIG.assetVersion,
                chainId: X402_CONFIG.chainId,
                verifyingContract: selectedRequirements.asset as `0x${string}`
            }

            const displayAmount = formatUsdcAmount(selectedRequirements.maxAmountRequired)
            toast.loading(`Authorizing ${displayAmount} USDC payment...`)

            // Sign the typed data (EIP-712) - this is just a signature, no transaction!
            const signature = await walletClient.signTypedData({
                domain,
                types: authorizationTypes,
                primaryType: 'TransferWithAuthorization',
                message: authorization
            })

            toast.dismiss()
            toast.success('Payment authorized!')

            // Create the payment payload
            const paymentPayload: PaymentPayload = {
                x402Version: X402_CONFIG.x402Version,
                scheme: 'exact',
                network: X402_CONFIG.network,
                payload: {
                    signature,
                    authorization: {
                        from: authorization.from,
                        to: authorization.to,
                        value: authorization.value.toString(),
                        validAfter: authorization.validAfter.toString(),
                        validBefore: authorization.validBefore.toString(),
                        nonce
                    }
                }
            }

            // Encode as base64 for the X-PAYMENT header
            const paymentHeader = encodePaymentHeader(paymentPayload)

            options.onPaymentSuccess?.(signature)

            return paymentHeader

        } catch (error: any) {
            toast.dismiss()

            if (error.message?.includes('rejected')) {
                toast.error('Payment authorization rejected')
            } else {
                toast.error(error.message || 'Failed to authorize payment')
            }

            options.onPaymentError?.(error)
            return null
        } finally {
            setIsPaymentPending(false)
        }
    }, [selectedRequirements, walletClient, address, options])

    /**
     * Retry the original request with payment header
     */
    const retryWithPayment = useCallback(async (
        url: string,
        paymentHeader: string,
        init?: RequestInit
    ): Promise<any> => {
        const headers = new Headers(init?.headers)
        headers.set('X-PAYMENT', paymentHeader)

        const response = await fetch(url, {
            ...init,
            headers
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.error || `Request failed: ${response.status}`)
        }

        const data = await response.json()
        setCurrentChallenge(null) // Clear challenge after success
        setSelectedRequirements(null)
        return data
    }, [])

    /**
     * Full x402 flow: request -> sign authorization if needed -> retry
     */
    const x402Request = useCallback(async (
        url: string,
        init?: RequestInit
    ): Promise<any> => {
        // First attempt
        const { data, paid } = await x402Fetch(url, init)

        if (paid) {
            return data
        }

        // Need to sign payment authorization
        const paymentHeader = await signPaymentAuthorization()
        if (!paymentHeader) {
            throw new Error('Payment authorization was not completed')
        }

        // Retry with payment header
        return retryWithPayment(url, paymentHeader, init)
    }, [x402Fetch, signPaymentAuthorization, retryWithPayment])

    /**
     * Get the display amount for the current challenge
     */
    const getDisplayAmount = useCallback((): string => {
        if (!selectedRequirements) return '0.00'
        return formatUsdcAmount(selectedRequirements.maxAmountRequired)
    }, [selectedRequirements])

    return {
        // Core functions
        x402Fetch,
        x402Request,
        signPaymentAuthorization,
        retryWithPayment,

        // State
        isPaymentPending,
        currentChallenge,
        selectedRequirements,
        setCurrentChallenge,

        // Helpers
        getDisplayAmount
    }
}
