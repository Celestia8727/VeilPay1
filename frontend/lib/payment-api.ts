/**
 * Payment API - Functions to interact with payments stored in Supabase
 * 
 * These functions allow the frontend to:
 * - Get all payments for a merchant (domain)
 * - Mark payments as claimed
 * - Get unclaimed payments only
 */

import { supabase } from './supabase'

export interface StoredPayment {
    id: string
    merchant_id: string
    plan_id: number
    stealth_address: string
    amount: string
    duration: number
    timestamp: number
    ephemeral_pub_key: string
    block_number: number
    transaction_hash: string
    claimed: boolean
    claimed_at: string | null
    claimed_tx: string | null
    created_at: string
}

/**
 * Get all payments for a specific merchant (domain)
 * @param merchantId - The domain hash (merchant ID)
 * @param unclaimedOnly - If true, only return unclaimed payments
 */
export async function getPaymentsByMerchant(
    merchantId: string,
    unclaimedOnly: boolean = false
): Promise<StoredPayment[]> {
    let query = supabase
        .from('payments')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('block_number', { ascending: false })

    if (unclaimedOnly) {
        query = query.eq('claimed', false)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching payments:', error)
        throw new Error(error.message)
    }

    return data || []
}

/**
 * Mark a payment as claimed
 * @param stealthAddress - The stealth address that was claimed
 * @param claimTxHash - The transaction hash of the claim
 */
export async function markPaymentClaimed(
    stealthAddress: string,
    claimTxHash: string
): Promise<boolean> {
    const { error } = await supabase
        .from('payments')
        .update({
            claimed: true,
            claimed_at: new Date().toISOString(),
            claimed_tx: claimTxHash
        })
        .eq('stealth_address', stealthAddress)

    if (error) {
        console.error('Error marking payment claimed:', error)
        return false
    }

    return true
}

/**
 * Get a specific payment by stealth address
 * @param stealthAddress - The stealth address to look up
 */
export async function getPaymentByStealthAddress(
    stealthAddress: string
): Promise<StoredPayment | null> {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('stealth_address', stealthAddress)
        .single()

    if (error) {
        console.error('Error fetching payment:', error)
        return null
    }

    return data
}

/**
 * Get all unclaimed payments for all merchants
 * Useful for showing total pending claims
 */
export async function getAllUnclaimedPayments(): Promise<StoredPayment[]> {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('claimed', false)
        .order('block_number', { ascending: false })

    if (error) {
        console.error('Error fetching unclaimed payments:', error)
        return []
    }

    return data || []
}

/**
 * Get payment statistics for a merchant
 * @param merchantId - The domain hash
 */
export async function getPaymentStats(merchantId: string): Promise<{
    total: number
    claimed: number
    unclaimed: number
    totalAmount: bigint
    claimedAmount: bigint
}> {
    const { data, error } = await supabase
        .from('payments')
        .select('amount, claimed')
        .eq('merchant_id', merchantId)

    if (error || !data) {
        return {
            total: 0,
            claimed: 0,
            unclaimed: 0,
            totalAmount: BigInt(0),
            claimedAmount: BigInt(0)
        }
    }

    const stats = data.reduce(
        (acc, payment) => {
            acc.total++
            const amount = BigInt(payment.amount)
            acc.totalAmount += amount

            if (payment.claimed) {
                acc.claimed++
                acc.claimedAmount += amount
            } else {
                acc.unclaimed++
            }

            return acc
        },
        { total: 0, claimed: 0, unclaimed: 0, totalAmount: BigInt(0), claimedAmount: BigInt(0) }
    )

    return stats
}

/**
 * Check if the indexer has stored any data
 * Useful to verify the indexer is running
 */
export async function checkIndexerStatus(): Promise<{
    isRunning: boolean
    lastBlock: number
    lastUpdate: string | null
}> {
    const { data, error } = await supabase
        .from('indexer_state')
        .select('*')
        .eq('id', 1)
        .single()

    if (error || !data) {
        return {
            isRunning: false,
            lastBlock: 0,
            lastUpdate: null
        }
    }

    // Consider indexer running if updated in last 5 minutes
    const lastUpdate = new Date(data.updated_at)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    return {
        isRunning: lastUpdate > fiveMinutesAgo,
        lastBlock: data.last_block_payments || 0,
        lastUpdate: data.updated_at
    }
}
