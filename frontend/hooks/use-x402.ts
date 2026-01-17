/**
 * x402 React Hook
 * 
 * Provides x402 payment handling for React components
 * Automatically detects 402 responses and triggers payment flow
 */

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { toast } from 'sonner'

interface X402Challenge {
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

interface UseX402Options {
    onPaymentSuccess?: (txHash: string) => void
    onPaymentError?: (error: Error) => void
}

export function useX402(options: UseX402Options = {}) {
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isPaymentPending, setIsPaymentPending] = useState(false)
    const [currentChallenge, setCurrentChallenge] = useState<X402Challenge | null>(null)

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
            // Payment required
            const challenge: X402Challenge = await response.json()
            setCurrentChallenge(challenge)

            return { data: challenge, paid: false }
        }

        // Success - payment was already made or not required
        const data = await response.json()
        return { data, paid: true }
    }, [])

    /**
     * Pay the current x402 challenge
     */
    const payChallenge = useCallback(async (): Promise<string | null> => {
        if (!currentChallenge) {
            toast.error('No payment challenge to pay')
            return null
        }

        if (!walletClient || !publicClient || !isConnected) {
            toast.error('Please connect your wallet first')
            return null
        }

        setIsPaymentPending(true)

        try {
            const amount = parseEther(currentChallenge.amount)

            toast.loading(`Sending ${currentChallenge.amount} ${currentChallenge.currency}...`)

            // Send payment to the platform address
            const hash = await walletClient.sendTransaction({
                to: currentChallenge.paymentAddress as `0x${string}`,
                value: amount
            })

            // Wait for confirmation
            await publicClient.waitForTransactionReceipt({ hash })

            toast.dismiss()
            toast.success(`Payment sent! Hash: ${hash.slice(0, 10)}...`)

            options.onPaymentSuccess?.(hash)

            return hash

        } catch (error: any) {
            toast.dismiss()
            toast.error(error.message || 'Payment failed')
            options.onPaymentError?.(error)
            return null
        } finally {
            setIsPaymentPending(false)
        }
    }, [currentChallenge, walletClient, publicClient, isConnected, options])

    /**
     * Retry the original request with payment proof
     */
    const retryWithPayment = useCallback(async (
        url: string,
        txHash: string,
        init?: RequestInit
    ): Promise<any> => {
        const headers = new Headers(init?.headers)
        headers.set('X-PAYMENT', `x402 ${txHash}`)

        const response = await fetch(url, {
            ...init,
            headers
        })

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`)
        }

        const data = await response.json()
        setCurrentChallenge(null) // Clear challenge after success
        return data
    }, [])

    /**
     * Full x402 flow: request -> pay if needed -> retry
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

        // Need to pay
        const txHash = await payChallenge()
        if (!txHash) {
            throw new Error('Payment was not completed')
        }

        // Retry with payment
        return retryWithPayment(url, txHash, init)
    }, [x402Fetch, payChallenge, retryWithPayment])

    return {
        x402Fetch,
        x402Request,
        payChallenge,
        retryWithPayment,
        isPaymentPending,
        currentChallenge,
        setCurrentChallenge
    }
}
