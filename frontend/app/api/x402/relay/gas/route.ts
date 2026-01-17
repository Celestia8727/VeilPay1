/**
 * x402 Gas Relay API Endpoint
 * 
 * POST /api/x402/relay/gas
 * 
 * Actual x402 implementation:
 * 1. Returns 402 with payment requirements if no X-PAYMENT header
 * 2. Verifies USDC TransferWithAuthorization signature  
 * 3. Settles payment (executes USDC transfer)
 * 4. Sends gas to stealth address
 */

import { NextRequest, NextResponse } from 'next/server'
import { X402_CONFIG, createPaymentRequirements, recordX402Payment, PaymentRequirements } from '@/lib/x402'
import {
    decodePaymentHeader,
    settleX402Payment,
    encodeSettlementResponse,
    getFacilitatorWallet,
    getPublicClient
} from '@/lib/x402-server'
import { parseEther, formatEther } from 'viem'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            stealthAddress,
            destinationAddress,
            userAddress,
            relayType = 'sendGas' // 'sendGas' or 'relayTx'
        } = body

        // Validate required fields
        if (!stealthAddress) {
            return NextResponse.json(
                { error: 'Missing required field: stealthAddress' },
                { status: 400 }
            )
        }

        // Check for x402 payment header
        const paymentHeader = request.headers.get('X-PAYMENT')

        if (!paymentHeader) {
            // No payment - return 402 with payment requirements
            console.log('📋 x402: No payment header, returning 402')
            const challenge = createPaymentRequirements(
                'gasRelay',
                '/api/x402/relay/gas',
                {
                    stealthAddress,
                    relayType,
                    description: 'Gas relay for private claiming'
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
            maxAmountRequired: X402_CONFIG.services.gasRelay.amount,
            asset: X402_CONFIG.asset,
            payTo: X402_CONFIG.platformAddress,
            maxTimeoutSeconds: X402_CONFIG.services.gasRelay.maxTimeoutSeconds,
            description: X402_CONFIG.services.gasRelay.description,
            resource: '/api/x402/relay/gas',
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
            'gasRelay'
        )

        if (!settlement.success) {
            console.log('❌ x402: Payment settlement failed:', settlement.errorReason)
            return NextResponse.json(
                {
                    error: 'Payment settlement failed',
                    reason: settlement.errorReason
                },
                { status: 402 }
            )
        }

        console.log('✅ x402: Payment settled successfully!')
        console.log('   Transaction:', settlement.transaction)

        // Payment verified and settled! Now perform gas relay
        console.log('🚀 x402 Gas Relay - Processing...')
        console.log('   Stealth address:', stealthAddress)
        console.log('   Relay type:', relayType)

        try {
            const walletClient = getFacilitatorWallet()
            const publicClient = getPublicClient()

            let relayTxHash: string

            if (relayType === 'sendGas') {
                // Send gas to stealth address
                const gasAmount = parseEther('0.001') // 0.001 MON for gas

                console.log(`   Sending ${formatEther(gasAmount)} MON to ${stealthAddress}`)

                const tx = await walletClient.sendTransaction({
                    to: stealthAddress as `0x${string}`,
                    value: gasAmount
                })

                await publicClient.waitForTransactionReceipt({ hash: tx })
                relayTxHash = tx

                console.log('   ✅ Gas sent:', relayTxHash)
            } else {
                // relayType === 'relayTx' - Future: relay a signed transaction
                return NextResponse.json(
                    { error: 'relayTx not yet implemented' },
                    { status: 501 }
                )
            }

            const responseBody = {
                status: 'success',
                service: 'gasRelay',
                mode: 'executed',
                paymentTx: settlement.transaction,
                payer: settlement.payer,
                relayTxHash,
                stealthAddress,
                relayType,
                gasAmount: '0.001',
                slaSeconds: X402_CONFIG.services.gasRelay.slaSeconds
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

        } catch (relayError: any) {
            console.error('Relay error:', relayError)
            return NextResponse.json(
                { error: 'Relay failed', details: relayError.message },
                { status: 500 }
            )
        }

    } catch (error: any) {
        console.error('x402 gas relay error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}

// GET endpoint to check service pricing
export async function GET() {
    return NextResponse.json({
        service: 'gas_relay',
        description: X402_CONFIG.services.gasRelay.description,
        pricing: {
            amount: X402_CONFIG.services.gasRelay.amount,
            displayAmount: X402_CONFIG.services.gasRelay.displayAmount,
            currency: X402_CONFIG.currency,
            asset: X402_CONFIG.asset,
            network: X402_CONFIG.network,
            chainId: X402_CONFIG.chainId
        },
        sla: {
            relayTimeSeconds: X402_CONFIG.services.gasRelay.slaSeconds
        },
        paymentAddress: X402_CONFIG.platformAddress,
        x402Version: X402_CONFIG.x402Version,
        relayTypes: ['sendGas', 'relayTx (coming soon)']
    })
}
