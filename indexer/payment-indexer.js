/**
 * Payment Indexer Service
 * 
 * This service runs continuously to scan blockchain for payment events
 * and stores them in Supabase for the frontend to query.
 * 
 * Features:
 * - Tracks last scanned block for efficient resuming
 * - Handles RPC rate limits with block chunking
 * - Stores all payment events with claimed status tracking
 * 
 * Usage:
 * 1. Set environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)
 * 2. Run: node indexer/payment-indexer.js
 */

require('dotenv').config({ path: '.env' })

const { ethers } = require('ethers')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
    RPC_URL: process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    BLOCK_CHUNK_SIZE: 50, // Monad limit
    SCAN_INTERVAL_MS: 15000, // 15 seconds between scans
    MAX_BLOCKS_PER_SCAN: 1000 // Max blocks to scan in one cycle
}

// Load contract addresses from deployments
let VAULT_ADDRESS
try {
    const deploymentsPath = path.join(__dirname, '../deployments-monad.json')
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'))
    VAULT_ADDRESS = deployments.contracts?.StealthPaymentVault?.address
    console.log('📍 Vault address:', VAULT_ADDRESS)
} catch (error) {
    console.log('Could not load from deployments-monad.json, checking env...')
}

// Fallback to env var
if (!VAULT_ADDRESS) {
    VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x78023B7FDA8acf600e0EE866418755c95CDaa94F'
}

if (!VAULT_ADDRESS) {
    console.error('❌ No vault address found!')
    process.exit(1)
}

// Supabase setup
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY')
    process.exit(1)
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

// Provider setup
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)

// Vault ABI (only PaymentReceived event)
const VAULT_ABI = [
    'event PaymentReceived(bytes32 indexed merchantId, uint256 indexed planId, address indexed stealthAddress, uint256 amount, uint256 duration, uint256 timestamp, bytes ephemeralPubKey)'
]

const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider)

/**
 * Get the last scanned block from database
 */
async function getLastScannedBlock() {
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
async function updateLastScannedBlock(blockNumber) {
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
async function storePayment(event) {
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
        console.error(`  ❌ Failed to store payment ${event.transactionHash}:`, error.message)
        return false
    }

    console.log(`  ✓ Stored payment: ${event.transactionHash.slice(0, 10)}... (${ethers.formatEther(amount)} MON)`)
    return true
}

/**
 * Scan blockchain for payment events in chunks
 */
async function scanForPayments(fromBlock, toBlock) {
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
        } catch (error) {
            console.error(`  ⚠️ Error scanning blocks ${currentBlock}-${endBlock}:`, error.message)
            // Continue to next chunk
        }

        currentBlock = endBlock + 1

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return totalPayments
}

/**
 * Main indexing loop
 */
async function runIndexer() {
    console.log('\n🚀 Payment Indexer Starting...')
    console.log(`   RPC: ${CONFIG.RPC_URL}`)
    console.log(`   Vault: ${VAULT_ADDRESS}`)
    console.log(`   Scan interval: ${CONFIG.SCAN_INTERVAL_MS / 1000}s\n`)

    // Test Supabase connection
    const { error } = await supabase.from('indexer_state').select('id').limit(1)
    if (error) {
        console.error('❌ Supabase connection failed:', error.message)
        console.error('   Make sure you ran the schema.sql in Supabase SQL Editor!')
        process.exit(1)
    }
    console.log('✅ Supabase connected\n')

    // Main loop
    while (true) {
        try {
            const lastBlock = await getLastScannedBlock()
            const currentBlock = await provider.getBlockNumber()

            // Calculate scan range
            const fromBlock = Math.max(lastBlock + 1, currentBlock - CONFIG.MAX_BLOCKS_PER_SCAN)
            const toBlock = currentBlock

            if (fromBlock <= toBlock) {
                console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1} blocks)`)

                const paymentsFound = await scanForPayments(fromBlock, toBlock)

                await updateLastScannedBlock(toBlock)

                if (paymentsFound > 0) {
                    console.log(`✅ Indexed ${paymentsFound} new payment(s)\n`)
                } else {
                    console.log(`   No new payments\n`)
                }
            } else {
                console.log('💤 No new blocks to scan')
            }

        } catch (error) {
            console.error('❌ Scan error:', error.message)
        }

        // Wait before next scan
        console.log(`⏳ Next scan in ${CONFIG.SCAN_INTERVAL_MS / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, CONFIG.SCAN_INTERVAL_MS))
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down indexer...')
    process.exit(0)
})

// Run
runIndexer().catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
})
