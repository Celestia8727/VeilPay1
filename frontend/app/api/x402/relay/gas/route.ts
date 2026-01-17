/**
 * x402 Gas Relay API Endpoint
 * 
 * POST /api/x402/relay/gas
 * 
 * Sends gas to a stealth address OR relays a claim transaction.
 * Enables private claiming without linking main wallet to stealth addresses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPaymentChallenge, verifyX402Payment, X402_CONFIG, recordX402Payment } from '@/lib/x402'
import { ethers } from 'ethers'

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
            // No payment - return 402 challenge
            const challenge = createPaymentChallenge(
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

        // Verify the x402 payment
        const verification = await verifyX402Payment(
            paymentHeader,
            X402_CONFIG.services.gasRelay.amount
        )

        if (!verification.valid) {
            return NextResponse.json(
                { error: 'Invalid payment', details: verification.error },
                { status: 402 }
            )
        }

        // Payment verified! Now perform gas relay
        console.log('🚀 x402 Gas Relay - Payment verified:', verification.paymentHash)
        console.log('   Stealth address:', stealthAddress)
        console.log('   Relay type:', relayType)

        // Check if we have a platform private key for relaying
        const platformPrivateKey = process.env.PLATFORM_PRIVATE_KEY

        if (!platformPrivateKey) {
            // No private key - return success but note that relay is simulated
            console.log('   ⚠️ No PLATFORM_PRIVATE_KEY - simulating relay')

            // Record the x402 payment
            if (verification.paymentHash) {
                await recordX402Payment(
                    verification.paymentHash,
                    'gasRelay',
                    X402_CONFIG.services.gasRelay.amount,
                    userAddress || 'unknown'
                )
            }

            return NextResponse.json({
                status: 'success',
                service: 'gasRelay',
                mode: 'simulated',
                message: 'Gas relay simulated (no PLATFORM_PRIVATE_KEY configured)',
                paymentHash: verification.paymentHash,
                stealthAddress,
                relayType,
                slaSeconds: X402_CONFIG.services.gasRelay.slaSeconds
            })
        }

        // Actually perform the relay
        try {
            const provider = new ethers.JsonRpcProvider(X402_CONFIG.rpcUrl)
            const platformWallet = new ethers.Wallet(platformPrivateKey, provider)

            let relayTxHash: string

            if (relayType === 'sendGas') {
                // Send gas to stealth address
                const gasAmount = ethers.parseEther('0.001') // 0.001 MON for gas

                console.log(`   Sending ${ethers.formatEther(gasAmount)} MON to ${stealthAddress}`)

                const tx = await platformWallet.sendTransaction({
                    to: stealthAddress,
                    value: gasAmount
                })

                await tx.wait()
                relayTxHash = tx.hash

                console.log('   ✅ Gas sent:', relayTxHash)
            } else {
                // relayType === 'relayTx' - Future: relay a signed transaction
                return NextResponse.json(
                    { error: 'relayTx not yet implemented' },
                    { status: 501 }
                )
            }

            // Record the x402 payment
            if (verification.paymentHash) {
                await recordX402Payment(
                    verification.paymentHash,
                    'gasRelay',
                    X402_CONFIG.services.gasRelay.amount,
                    userAddress || 'unknown'
                )
            }

            return NextResponse.json({
                status: 'success',
                service: 'gasRelay',
                mode: 'executed',
                paymentHash: verification.paymentHash,
                relayTxHash,
                stealthAddress,
                relayType,
                gasAmount: '0.001',
                slaSeconds: X402_CONFIG.services.gasRelay.slaSeconds
            })

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
            currency: X402_CONFIG.currency,
            network: X402_CONFIG.network,
            chainId: X402_CONFIG.chainId
        },
        sla: {
            relayTimeSeconds: X402_CONFIG.services.gasRelay.slaSeconds
        },
        paymentAddress: X402_CONFIG.platformAddress,
        relayTypes: ['sendGas', 'relayTx (coming soon)']
    })
}
