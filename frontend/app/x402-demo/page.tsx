'use client'

/**
 * x402 Demo Page
 * 
 * Demonstrates the x402 payment protocol for:
 * 1. Priority Scan - Instant payment detection
 * 2. Gas Relay - Private claiming with gas relay
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AnimatedBackground } from '@/components/animated-background'
import { ScanlineOverlay } from '@/components/scanline-overlay'
import { NavHeader } from '@/components/nav-header'
import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Shield, Loader2, Zap, Clock, CheckCircle, Search, Fuel } from 'lucide-react'
import { useX402 } from '@/hooks/use-x402'
import { PaywallModal } from '@/components/x402/PaywallModal'
import { toast } from 'sonner'
import { formatEther } from 'viem'

export default function X402DemoPage() {
    const { address, isConnected } = useAccount()
    const [isLoading, setIsLoading] = useState(false)
    const [activeService, setActiveService] = useState<'priorityScan' | 'gasRelay' | null>(null)
    const [result, setResult] = useState<any>(null)
    const [showPaywall, setShowPaywall] = useState(false)
    const [stealthAddress, setStealthAddress] = useState('')
    const [domainHash, setDomainHash] = useState('')

    const {
        x402Fetch,
        payChallenge,
        retryWithPayment,
        currentChallenge,
        isPaymentPending,
        setCurrentChallenge
    } = useX402({
        onPaymentSuccess: (txHash) => {
            console.log('Payment successful:', txHash)
        }
    })

    // Request Priority Scan
    async function requestPriorityScan() {
        if (!isConnected) {
            toast.error('Please connect your wallet first')
            return
        }

        if (!domainHash) {
            toast.error('Please enter a domain hash')
            return
        }

        setIsLoading(true)
        setActiveService('priorityScan')
        setResult(null)

        try {
            const { data, paid } = await x402Fetch('/api/x402/scan/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domainHash,
                    userAddress: address
                })
            })

            if (!paid) {
                setShowPaywall(true)
                console.log('Payment required:', data)
            } else {
                setResult(data)
                toast.success(`Found ${data.paymentsFound} payments!`)
            }

        } catch (error: any) {
            console.error('Error:', error)
            toast.error(error.message || 'Request failed')
        } finally {
            setIsLoading(false)
        }
    }

    // Request Gas Relay
    async function requestGasRelay() {
        if (!isConnected) {
            toast.error('Please connect your wallet first')
            return
        }

        if (!stealthAddress) {
            toast.error('Please enter a stealth address')
            return
        }

        setIsLoading(true)
        setActiveService('gasRelay')
        setResult(null)

        try {
            const { data, paid } = await x402Fetch('/api/x402/relay/gas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stealthAddress,
                    userAddress: address,
                    relayType: 'sendGas'
                })
            })

            if (!paid) {
                setShowPaywall(true)
                console.log('Payment required:', data)
            } else {
                setResult(data)
                toast.success('Gas relay successful!')
            }

        } catch (error: any) {
            console.error('Error:', error)
            toast.error(error.message || 'Request failed')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle payment from modal
    async function handlePay() {
        const txHash = await payChallenge()

        if (txHash) {
            setShowPaywall(false)

            try {
                const endpoint = activeService === 'priorityScan'
                    ? '/api/x402/scan/priority'
                    : '/api/x402/relay/gas'

                const bodyData = activeService === 'priorityScan'
                    ? { domainHash, userAddress: address }
                    : { stealthAddress, userAddress: address, relayType: 'sendGas' }

                const data = await retryWithPayment(endpoint, txHash, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                })

                setResult(data)
                toast.success(activeService === 'priorityScan'
                    ? `Found ${data.paymentsFound} payments!`
                    : 'Gas relay successful!'
                )
            } catch (error: any) {
                toast.error('Request failed after payment')
            }
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <AnimatedBackground />
            <ScanlineOverlay />

            <div className="relative z-10">
                <NavHeader />

                <main className="container mx-auto px-4 py-8 max-w-4xl pt-24">
                    <div className="space-y-8">
                        {/* Header */}
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 font-mono text-sm">x402 Protocol</span>
                            </div>

                            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                Premium Services
                            </h1>

                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Pay-per-use services using the x402 payment protocol.
                                Instant payment, instant service.
                            </p>
                        </div>

                        {/* Services Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Priority Scan Service */}
                            <GlassPanel className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-cyan-500/20 rounded-lg">
                                            <Search className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">Priority Scan</h2>
                                            <p className="text-sm text-muted-foreground">Instant payment detection</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-secondary/30 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-cyan-400">0.001 MON</p>
                                        <p className="text-xs text-muted-foreground">5 second SLA</p>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Domain hash (0x...)"
                                        value={domainHash}
                                        onChange={(e) => setDomainHash(e.target.value)}
                                        className="w-full p-3 bg-secondary/50 border border-border rounded-lg font-mono text-sm"
                                    />

                                    <NeonButton
                                        variant="cyan"
                                        className="w-full"
                                        onClick={requestPriorityScan}
                                        disabled={isLoading || !isConnected}
                                    >
                                        {isLoading && activeService === 'priorityScan' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Scan Now
                                            </>
                                        )}
                                    </NeonButton>
                                </div>
                            </GlassPanel>

                            {/* Gas Relay Service */}
                            <GlassPanel className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-500/20 rounded-lg">
                                            <Fuel className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">Gas Relay</h2>
                                            <p className="text-sm text-muted-foreground">Private claim assistance</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-secondary/30 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-purple-400">0.002 MON</p>
                                        <p className="text-xs text-muted-foreground">30 second SLA</p>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Stealth address (0x...)"
                                        value={stealthAddress}
                                        onChange={(e) => setStealthAddress(e.target.value)}
                                        className="w-full p-3 bg-secondary/50 border border-border rounded-lg font-mono text-sm"
                                    />

                                    <NeonButton
                                        variant="purple"
                                        className="w-full"
                                        onClick={requestGasRelay}
                                        disabled={isLoading || !isConnected}
                                    >
                                        {isLoading && activeService === 'gasRelay' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Relaying...
                                            </>
                                        ) : (
                                            <>
                                                <Fuel className="w-4 h-4 mr-2" />
                                                Send Gas
                                            </>
                                        )}
                                    </NeonButton>
                                </div>
                            </GlassPanel>
                        </div>

                        {/* Result */}
                        {result && (
                            <GlassPanel className="p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-green-400">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-semibold">Success!</span>
                                    </div>

                                    <TerminalText prefix="service">{result.service}</TerminalText>
                                    <TerminalText prefix="status">{result.status}</TerminalText>

                                    {result.paymentHash && (
                                        <TerminalText prefix="payment">
                                            {result.paymentHash.slice(0, 20)}...
                                        </TerminalText>
                                    )}

                                    {result.paymentsFound !== undefined && (
                                        <TerminalText prefix="found">
                                            {result.paymentsFound} payment(s)
                                        </TerminalText>
                                    )}

                                    {result.payments && result.payments.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-sm font-semibold">Payments Found:</p>
                                            {result.payments.slice(0, 5).map((p: any, i: number) => (
                                                <div key={i} className="p-2 bg-secondary/30 rounded text-xs font-mono">
                                                    <p>Stealth: {p.stealthAddress?.slice(0, 20)}...</p>
                                                    <p>Amount: {formatEther(BigInt(p.amount))} MON</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {result.relayTxHash && (
                                        <TerminalText prefix="relay-tx">
                                            {result.relayTxHash.slice(0, 20)}...
                                        </TerminalText>
                                    )}

                                    {result.mode === 'simulated' && (
                                        <p className="text-yellow-400 text-xs mt-2">
                                            ⚠️ {result.message}
                                        </p>
                                    )}
                                </div>
                            </GlassPanel>
                        )}

                        {/* How It Works */}
                        <GlassPanel className="p-6">
                            <h2 className="text-xl font-bold mb-4">How x402 Works</h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-secondary/20 rounded-lg">
                                    <div className="text-2xl mb-2">1️⃣</div>
                                    <p className="text-sm font-semibold">Request Service</p>
                                    <p className="text-xs text-muted-foreground">Call the API endpoint</p>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg">
                                    <div className="text-2xl mb-2">2️⃣</div>
                                    <p className="text-sm font-semibold">Get 402</p>
                                    <p className="text-xs text-muted-foreground">Payment details returned</p>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg">
                                    <div className="text-2xl mb-2">3️⃣</div>
                                    <p className="text-sm font-semibold">Pay Fee</p>
                                    <p className="text-xs text-muted-foreground">Send crypto payment</p>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg">
                                    <div className="text-2xl mb-2">4️⃣</div>
                                    <p className="text-sm font-semibold">Get Service</p>
                                    <p className="text-xs text-muted-foreground">Instant delivery!</p>
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                </main>
            </div>

            {/* Paywall Modal */}
            <PaywallModal
                challenge={currentChallenge || {
                    error: 'payment_required',
                    resource: activeService === 'priorityScan' ? '/api/x402/scan/priority' : '/api/x402/relay/gas',
                    amount: activeService === 'priorityScan' ? '0.001' : '0.002',
                    currency: 'MON',
                    network: 'monad-testnet',
                    chainId: 10143,
                    paymentAddress: '0x3319148cB4324b0fbBb358c93D52e0b7f3fe4bc9',
                    expiresIn: 300,
                    metadata: {
                        service: activeService || 'priorityScan',
                        description: activeService === 'priorityScan' ? 'Instant payment detection' : 'Gas relay for private claiming',
                        slaSeconds: activeService === 'priorityScan' ? 5 : 30
                    }
                }}
                isOpen={showPaywall}
                onClose={() => {
                    setShowPaywall(false)
                    setCurrentChallenge(null)
                }}
                onPay={handlePay}
                isPaying={isPaymentPending}
            />
        </div>
    )
}
