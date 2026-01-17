/**
 * x402 Priority Scan API Endpoint
 * 
 * POST /api/x402/scan/priority
 * 
 * Actual x402 implementation:
 * 1. Returns 402 with payment requirements if no X-PAYMENT header
 * 2. Verifies USDC TransferWithAuthorization signature
 * 3. Settles payment (executes USDC transfer)
 * 4. Returns scan results
 */

import { NextRequest, NextResponse } from 'next/server'
import { X402_CONFIG, createPaymentRequirements, recordX402Payment, PaymentRequirements } from '@/lib/x402'
import {
    decodePaymentHeader,
    verifyX402Payment,
    settleX402Payment,
    encodeSettlementResponse
} from '@/lib/x402-server'
import { supabase } from '@/lib/supabase'
import { ethers } from 'ethers'

// Vault ABI for scanning new events
const VAULT_ABI = [
    'event PaymentReceived(bytes32 indexed merchantId, uint256 indexed planId, address indexed stealthAddress, uint256 amount, uint256 duration, uint256 timestamp, bytes ephemeralPubKey)'
]

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            domainHash,
            userAddress
        } = body

        // Validate required fields
        if (!domainHash) {
            return NextResponse.json(
                { error: 'Missing required field: domainHash' },
                { status: 400 }
            )
        }

        // Check for x402 payment header
        const paymentHeader = request.headers.get('X-PAYMENT')

        if (!paymentHeader) {
            // No payment - return 402 with payment requirements
            console.log('📋 x402: No payment header, returning 402')
            const challenge = createPaymentRequirements(
                'priorityScan',
                '/api/x402/scan/priority',
                {
                    domainHash,
                    description: 'Instant payment scan + fresh blockchain check'
                }
            )

            return NextResponse.json(challenge.body, { status: 402 })
        }

        // Decode the payment header
        let paymentPayload
        try {
            paymentPayload = decodePaymentHeader(paymentHeader)
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid X-PAYMENT header format' },
                { status: 400 }
            )
        }

        console.log('🔐 x402: Verifying payment authorization...')
        console.log('   Payer:', paymentPayload.payload.authorization.from)

        // Create payment requirements for verification
        const paymentRequirements: PaymentRequirements = {
            scheme: 'exact',
            network: X402_CONFIG.network,
            maxAmountRequired: X402_CONFIG.services.priorityScan.amount,
            asset: X402_CONFIG.asset,
            payTo: X402_CONFIG.platformAddress,
            maxTimeoutSeconds: X402_CONFIG.services.priorityScan.maxTimeoutSeconds,
            description: X402_CONFIG.services.priorityScan.description,
            resource: '/api/x402/scan/priority',
            mimeType: 'application/json',
            extra: {
                name: X402_CONFIG.assetName,
                version: X402_CONFIG.assetVersion
            }
        }

        // Settle the payment (verify + execute USDC transfer)
        const settlement = await settleX402Payment(
            paymentPayload,
            paymentRequirements,
            'priorityScan'
        )

        if (!settlement.success) {
            console.log('❌ x402: Payment settlement failed:', settlement.errorReason)
            console.log('   Full settlement result:', JSON.stringify(settlement, null, 2))
            return NextResponse.json(
                {
                    error: 'Payment settlement failed',
                    reason: settlement.errorReason,
                    payer: settlement.payer,
                    details: `Settlement failed: ${settlement.errorReason}`
                },
                { status: 402 }
            )
        }

        console.log('✅ x402: Payment settled successfully!')
        console.log('   Transaction:', settlement.transaction)

        // Payment verified and settled! Now provide the service
        try {
            // STEP 1: Get last indexed block
            const { data: indexerState } = await supabase
                .from('indexer_state')
                .select('last_block_payments')
                .eq('id', 1)
                .single()

            const lastIndexedBlock = indexerState?.last_block_payments || 0

            // STEP 2: Scan any NEW blocks since last indexed
            const provider = new ethers.JsonRpcProvider(X402_CONFIG.rpcUrl)
            const currentBlock = await provider.getBlockNumber()

            let newPaymentsFound = 0

            if (currentBlock > lastIndexedBlock) {
                console.log(`   Scanning new blocks: ${lastIndexedBlock + 1} to ${currentBlock}`)

                const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS
                if (vaultAddress) {
                    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider)
                    const filter = vault.filters.PaymentReceived()

                    // Scan new blocks in small chunks
                    const CHUNK_SIZE = 50
                    for (let from = lastIndexedBlock + 1; from <= currentBlock; from += CHUNK_SIZE) {
                        const to = Math.min(from + CHUNK_SIZE - 1, currentBlock)

                        try {
                            const events = await vault.queryFilter(filter, from, to)

                            for (const event of events) {
                                const log = event as ethers.EventLog

                                // Store in database
                                const payment = {
                                    merchant_id: log.args[0],
                                    plan_id: Number(log.args[1]),
                                    stealth_address: log.args[2],
                                    amount: log.args[3].toString(),
                                    duration: Number(log.args[4]),
                                    timestamp: Number(log.args[5]),
                                    ephemeral_pub_key: ethers.hexlify(log.args[6]),
                                    block_number: log.blockNumber,
                                    transaction_hash: log.transactionHash,
                                    claimed: false
                                }

                                await supabase
                                    .from('payments')
                                    .upsert(payment, { onConflict: 'transaction_hash' })

                                newPaymentsFound++
                            }
                        } catch (err: any) {
                            console.warn(`   Error scanning ${from}-${to}:`, err.message)
                        }
                    }

                    // Update indexer state
                    await supabase
                        .from('indexer_state')
                        .upsert({
                            id: 1,
                            last_block_payments: currentBlock,
                            updated_at: new Date().toISOString()
                        })

                    console.log(`   Indexed ${newPaymentsFound} new payment(s)`)
                }
            } else {
                console.log('   No new blocks to scan')
            }

            // STEP 3: Query database for ALL payments (now including any new ones)
            const { data: payments, error } = await supabase
                .from('payments')
                .select('*')
                .eq('merchant_id', domainHash)
                .order('timestamp', { ascending: false })

            if (error) {
                throw new Error(`Database query failed: ${error.message}`)
            }

            console.log(`   Total payments for domain: ${payments?.length || 0}`)

            // Transform to match expected format
            const formattedPayments = (payments || []).map(p => ({
                merchantId: p.merchant_id,
                planId: p.plan_id,
                stealthAddress: p.stealth_address,
                amount: p.amount,
                duration: p.duration,
                timestamp: p.timestamp,
                ephemeralPubKey: p.ephemeral_pub_key,
                blockNumber: p.block_number,
                transactionHash: p.transaction_hash,
                claimed: p.claimed
            }))

            // Create response with X-PAYMENT-RESPONSE header
            const responseBody = {
                status: 'success',
                service: 'priorityScan',
                paymentTx: settlement.transaction,
                payer: settlement.payer,
                source: 'database+freshScan',
                newBlocksScanned: Math.max(0, currentBlock - lastIndexedBlock),
                newPaymentsIndexed: newPaymentsFound,
                paymentsFound: formattedPayments.length,
                payments: formattedPayments,
                slaSeconds: X402_CONFIG.services.priorityScan.slaSeconds
            }

            const response = NextResponse.json(responseBody)

            // Add X-PAYMENT-RESPONSE header
            response.headers.set('X-PAYMENT-RESPONSE', encodeSettlementResponse({
                success: true,
                transaction: settlement.transaction,
                network: X402_CONFIG.network,
                payer: settlement.payer
            }))

            return response

        } catch (scanError: any) {
            console.error('Scan error:', scanError)
            return NextResponse.json(
                { error: 'Scan failed', details: scanError.message },
                { status: 500 }
            )
        }

    } catch (error: any) {
        console.error('x402 priority scan error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}

// GET endpoint to check service pricing
export async function GET() {
    return NextResponse.json({
        service: 'priority_scan',
        description: 'Instant database query + fresh blockchain scan',
        pricing: {
            amount: X402_CONFIG.services.priorityScan.amount,
            displayAmount: X402_CONFIG.services.priorityScan.displayAmount,
            currency: X402_CONFIG.currency,
            asset: X402_CONFIG.asset,
            network: X402_CONFIG.network,
            chainId: X402_CONFIG.chainId
        },
        sla: {
            scanTimeSeconds: X402_CONFIG.services.priorityScan.slaSeconds
        },
        paymentAddress: X402_CONFIG.platformAddress,
        x402Version: X402_CONFIG.x402Version
    })
}
