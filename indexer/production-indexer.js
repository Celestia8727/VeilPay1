require('dotenv').config()
const { ethers } = require('ethers')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')




// Load deployed contract addresses
const deploymentsPath = path.join(__dirname, '../deployments.json')
let deployments
try {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'))
} catch (error) {
    console.error('❌ Error: deployments.json not found. Please deploy contracts first.')
    process.exit(1)
}


// Setup
const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz')

// Validate Supabase credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase credentials')
    console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET')
    console.error('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET')
    console.error('   Please check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)


// Contract ABIs
const REGISTRY_ABI = [
    'event DomainRegistered(bytes32 indexed domainHash, address indexed owner, bytes spendPubKey, bytes viewPubKey, uint256 timestamp)'
]

const VAULT_ABI = [
    'event PaymentReceived(bytes32 indexed merchantId, uint256 indexed planId, address indexed stealthAddress, uint256 amount, uint256 duration, uint256 timestamp, bytes ephemeralPubKey)',
    'event MerchantRegistered(bytes32 indexed merchantId, address indexed owner, uint256 timestamp)',
    'event PlanCreated(bytes32 indexed merchantId, uint256 indexed planId, uint256 price, uint256 duration)'
]

const COMMITMENT_ABI = [
    'event CommitmentRegistered(bytes32 indexed commitment, uint256 timestamp)'
]

// Indexer class
class ProductionIndexer {
    constructor() {
        const network = deployments.monad ? 'monad' : (deployments.localhost ? 'localhost' : null)

        if (!network) {
            console.error('❌ No deployment found in deployments.json')
            process.exit(1)
        }

        console.log(`📡 Connecting to ${network} network...`)

        this.registry = new ethers.Contract(
            deployments[network].PrivacyDomainRegistry,
            REGISTRY_ABI,
            provider
        )

        this.vault = new ethers.Contract(
            deployments[network].StealthPaymentVault,
            VAULT_ABI,
            provider
        )

        this.commitmentRegistry = new ethers.Contract(
            deployments[network].CommitmentRegistry,
            COMMITMENT_ABI,
            provider
        )

        console.log('✓ Contracts loaded')
        console.log(`  Registry: ${this.registry.target}`)
        console.log(`  Vault: ${this.vault.target}`)
        console.log(`  Commitment Registry: ${this.commitmentRegistry.target}`)
    }

    async indexDomains(fromBlock = 0) {
        console.log('\n📋 Indexing domain registrations...')

        try {
            const filter = this.registry.filters.DomainRegistered()
            const events = await this.registry.queryFilter(filter, fromBlock, 'latest')

            console.log(`Found ${events.length} domain events`)

            for (const event of events) {
                const { domainHash, owner, spendPubKey, viewPubKey, timestamp } = event.args

                const { error } = await supabase.from('domains').upsert({
                    domain_hash: domainHash,
                    domain_name: 'unknown', // Would need reverse lookup or event parameter
                    owner_address: owner.toLowerCase(),
                    spend_pub_key: ethers.hexlify(spendPubKey),
                    view_pub_key: ethers.hexlify(viewPubKey),
                    registered_at: new Date(Number(timestamp) * 1000).toISOString()
                }, { onConflict: 'domain_hash' })

                if (error) {
                    console.error(`  ❌ Error indexing domain ${domainHash}:`, error.message)
                } else {
                    console.log(`  ✓ Indexed domain ${domainHash.slice(0, 10)}...`)
                }
            }
        } catch (error) {
            console.error('❌ Error indexing domains:', error.message)
        }
    }

    async indexPayments(fromBlock = 0) {
        console.log('\n💰 Indexing payments...')

        try {
            const filter = this.vault.filters.PaymentReceived()
            const events = await this.vault.queryFilter(filter, fromBlock, 'latest')

            console.log(`Found ${events.length} payment events`)

            for (const event of events) {
                const { merchantId, planId, stealthAddress, amount, duration, timestamp, ephemeralPubKey } = event.args

                const { error } = await supabase.from('payments').upsert({
                    merchant_id: merchantId,
                    plan_id: Number(planId),
                    stealth_address: stealthAddress,
                    amount: amount.toString(),
                    duration: Number(duration),
                    timestamp: Number(timestamp),
                    ephemeral_pub_key: ethers.hexlify(ephemeralPubKey),
                    block_number: event.blockNumber,
                    transaction_hash: event.transactionHash
                }, { onConflict: 'transaction_hash' })

                if (error) {
                    console.error(`  ❌ Error indexing payment ${event.transactionHash}:`, error.message)
                } else {
                    console.log(`  ✓ Indexed payment ${event.transactionHash.slice(0, 10)}...`)
                }
            }
        } catch (error) {
            console.error('❌ Error indexing payments:', error.message)
        }
    }

    async indexCommitments(fromBlock = 0) {
        console.log('\n🔒 Indexing commitments...')

        try {
            const filter = this.commitmentRegistry.filters.CommitmentRegistered()
            const events = await this.commitmentRegistry.queryFilter(filter, fromBlock, 'latest')

            console.log(`Found ${events.length} commitment events`)

            for (const event of events) {
                const { commitment, timestamp } = event.args

                const { error } = await supabase.from('commitments').upsert({
                    commitment_hash: commitment,
                    posted_at: Number(timestamp),
                    block_number: event.blockNumber,
                    transaction_hash: event.transactionHash
                }, { onConflict: 'commitment_hash' })

                if (error) {
                    console.error(`  ❌ Error indexing commitment ${commitment}:`, error.message)
                } else {
                    console.log(`  ✓ Indexed commitment ${commitment.slice(0, 10)}...`)
                }
            }
        } catch (error) {
            console.error('❌ Error indexing commitments:', error.message)
        }
    }

    async startLiveIndexing() {
        console.log('\n🔴 Starting live event indexing...')

        // Listen for new events
        this.registry.on('DomainRegistered', async (...args) => {
            const event = args[args.length - 1]
            console.log(`\n🆕 New domain registered: ${event.args.domainHash.slice(0, 10)}...`)
            await this.indexDomains(event.blockNumber)
        })

        this.vault.on('PaymentReceived', async (...args) => {
            const event = args[args.length - 1]
            console.log(`\n🆕 New payment received: ${event.transactionHash.slice(0, 10)}...`)
            await this.indexPayments(event.blockNumber)
        })

        this.commitmentRegistry.on('CommitmentRegistered', async (...args) => {
            const event = args[args.length - 1]
            console.log(`\n🆕 New commitment registered: ${event.args.commitment.slice(0, 10)}...`)
            await this.indexCommitments(event.blockNumber)
        })

        console.log('✓ Listening for new events...')
    }

    async run() {
        console.log('\n🚀 Veil Production Indexer Starting...\n')

        // Check Supabase connection
        const { error } = await supabase.from('domains').select('count').limit(1)
        if (error) {
            console.error('❌ Supabase connection failed:', error.message)
            console.error('   Please check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env')
            process.exit(1)
        }
        console.log('✓ Supabase connected\n')

        // Index historical events
        await this.indexDomains()
        await this.indexPayments()
        await this.indexCommitments()

        // Start listening for new events
        await this.startLiveIndexing()

        console.log('\n✅ Indexer running. Press Ctrl+C to stop.\n')
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down indexer...')
    process.exit(0)
})

// Run
const indexer = new ProductionIndexer()
indexer.run().catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
})
