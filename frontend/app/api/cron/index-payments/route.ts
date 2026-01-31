/**
 * Vercel Cron Job - Payment Indexer
 * 
 * This API route runs on a schedule (configured in vercel.json)
 * to scan blockchain for payment events and store them in Supabase.
 * 
 * Scheduled to run every 5 minutes via Vercel Cron Jobs.
 * 
 * Endpoint: /api/cron/index-payments
 * Method: GET (triggered by Vercel Cron)
 */

import { ethers } from 'ethers'
import { createClient } from '@supabase/supabase-js'

// Configuration
const CONFIG = {
    RPC_URL: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    VAULT_ADDRESS: process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x78023B7FDA8acf600e0EE866418755c95CDaa94F',
    BLOCK_CHUNK_SIZE: 50, // Monad limit
    MAX_BLOCKS_PER_SCAN: 500, // Limit for cron execution time
}

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

// Vault ABI (only PaymentReceived event)
const VAULT_ABI = [
    'event PaymentReceived(bytes32 indexed merchantId, uint256 indexed planId, address indexed stealthAddress, uint256 amount, uint256 duration, uint256 timestamp, bytes ephemeralPubKey)'
]

/**
 * Get the last scanned block from database
 */
async function getLastScannedBlock(): Promise<number> {
    const { data, error } = await supabase
        .from('indexer_state')
        .select('last_block_payments')
        .eq('id', 1)
        .single()

    if (error) {
        console.warn('⚠️ Could not get last block, starting from 0:', error.message)
        return 0
    }

    return data?.last_block_payments || 0
}

/**
 * Update the last scanned block in database
 */
async function updateLastScannedBlock(blockNumber: number): Promise<void> {
    const { error } = await supabase
        .from('indexer_state')
        .upsert({
            id: 1,
            last_block_payments: blockNumber,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('❌ Failed to update last block:', error.message)
    }
}

/**
 * Store a payment event in database
 */
async function storePayment(event: any): Promise<boolean> {
    const { merchantId, planId, stealthAddress, amount, duration, timestamp, ephemeralPubKey } = event.args

    const payment = {
        merchant_id: merchantId,
        plan_id: Number(planId),
        stealth_address: stealthAddress,
        amount: amount.toString(),
        duration: Number(duration),
        timestamp: Number(timestamp),
        ephemeral_pub_key: ethers.hexlify(ephemeralPubKey),
        block_number: event.blockNumber,
        transaction_hash: event.transactionHash,
        claimed: false
    }

    const { error } = await supabase
        .from('payments')
        .upsert(payment, { onConflict: 'transaction_hash' })

    if (error) {
        console.error(`❌ Failed to store payment ${event.transactionHash}:`, error.message)
        return false
    }

    console.log(`✓ Stored payment: ${event.transactionHash.slice(0, 10)}... (${ethers.formatEther(amount)} MON)`)
    return true
}

/**
 * Scan blockchain for payment events in chunks
 */
async function scanForPayments(provider: ethers.JsonRpcProvider, vaultContract: ethers.Contract, fromBlock: number, toBlock: number): Promise<number> {
    let currentBlock = fromBlock
    let totalPayments = 0

    while (currentBlock < toBlock) {
        const endBlock = Math.min(currentBlock + CONFIG.BLOCK_CHUNK_SIZE, toBlock)

        try {
            const filter = vaultContract.filters.PaymentReceived()
            const events = await vaultContract.queryFilter(filter, currentBlock, endBlock)

            if (events.length > 0) {
                console.log(`📦 Found ${events.length} payment(s) in blocks ${currentBlock}-${endBlock}`)

                for (const event of events) {
                    await storePayment(event)
                    totalPayments++
                }
            }
        } catch (error: any) {
            console.error(`⚠️ Error scanning blocks ${currentBlock}-${endBlock}:`, error.message)
            // Continue to next chunk
        }

        currentBlock = endBlock + 1

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return totalPayments
}

/**
 * Main cron handler
 */
export async function GET(request: Request) {
    const startTime = Date.now()

    try {
        // Verify cron secret (optional security measure)
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('🚀 Cron job started - Payment Indexer')

        // Setup provider and contract
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)
        const vaultContract = new ethers.Contract(CONFIG.VAULT_ADDRESS, VAULT_ABI, provider)

        // Get scan range
        const lastBlock = await getLastScannedBlock()
        const currentBlock = await provider.getBlockNumber()

        // Calculate scan range (limit to prevent timeout)
        const fromBlock = Math.max(lastBlock + 1, currentBlock - CONFIG.MAX_BLOCKS_PER_SCAN)
        const toBlock = currentBlock

        if (fromBlock <= toBlock) {
            console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1} blocks)`)

            const paymentsFound = await scanForPayments(provider, vaultContract, fromBlock, toBlock)

            await updateLastScannedBlock(toBlock)

            const duration = Date.now() - startTime

            return Response.json({
                success: true,
                blocksScanned: toBlock - fromBlock + 1,
                paymentsFound,
                fromBlock,
                toBlock,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            })
        } else {
            console.log('💤 No new blocks to scan')
            return Response.json({
                success: true,
                message: 'No new blocks to scan',
                currentBlock,
                lastBlock,
                timestamp: new Date().toISOString()
            })
        }

    } catch (error: any) {
        console.error('❌ Cron job error:', error)
        return Response.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
