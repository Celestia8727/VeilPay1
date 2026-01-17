'use client'

/**
 * x402 Demo Page
 * 
 * Demonstrates the actual x402 payment protocol:
 * 1. User signs USDC TransferWithAuthorization (gasless!)
 * 2. Server executes the USDC transfer
 * 3. Service is provided instantly
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AnimatedBackground } from '@/components/animated-background'
import { ScanlineOverlay } from '@/components/scanline-overlay'
import { NavHeader } from '@/components/nav-header'
import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Shield, Loader2, Zap, Clock, CheckCircle, Search, Fuel, DollarSign } from 'lucide-react'
import { useX402 } from '@/hooks/use-x402'
import { PaywallModal } from '@/components/x402/PaywallModal'
import { toast } from 'sonner'
import { formatEther } from 'viem'
import { X402_CONFIG, formatUsdcAmount } from '@/lib/x402'

export default function X402DemoPage() {
    const { address, isConnected } = useAccount()
    const [isLoading, setIsLoading] = useState(false)
    const [activeService, setActiveService] = useState<'priorityScan' | 'gasRelay' | null>(null)
    const [result, setResult] = useState<any>(null)
    const [showPaywall, setShowPaywall] = useState(false)
    const [stealthAddress, setStealthAddress] = useState('')
    const [domainHash, setDomainHash] = useState('')
    const [pendingRequest, setPendingRequest] = useState<{
        url: string
        init: RequestInit
    } | null>(null)

    const {
        x402Fetch,
        signPaymentAuthorization,
        retryWithPayment,
        currentChallenge,
        selectedRequirements,
        isPaymentPending,
        setCurrentChallenge
    } = useX402({
        onPaymentSuccess: (signature) => {
            console.log('Payment authorization signed:', signature.slice(0, 20) + '...')
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
            const requestInit: RequestInit = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domainHash,
                    userAddress: address
                })
            }

            const { data, paid } = await x402Fetch('/api/x402/scan/priority', requestInit)

            if (!paid) {
                // Store the pending request for retry after payment
                setPendingRequest({
                    url: '/api/x402/scan/priority',
                    init: requestInit
                })
                setShowPaywall(true)
                console.log('Payment required - showing paywall')
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
            const requestInit: RequestInit = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stealthAddress,
                    userAddress: address,
                    relayType: 'sendGas'
                })
            }

            const { data, paid } = await x402Fetch('/api/x402/relay/gas', requestInit)

            if (!paid) {
                // Store the pending request for retry after payment
                setPendingRequest({
                    url: '/api/x402/relay/gas',
                    init: requestInit
                })
                setShowPaywall(true)
                console.log('Payment required - showing paywall')
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

    // Handle payment authorization from modal
    async function handleAuthorize() {
        const paymentHeader = await signPaymentAuthorization()

        if (paymentHeader && pendingRequest) {
            setShowPaywall(false)

            try {
                toast.loading('Executing payment and fetching data...')

                const data = await retryWithPayment(
                    pendingRequest.url,
                    paymentHeader,
                    pendingRequest.init
                )

                toast.dismiss()
                setResult(data)

                if (activeService === 'priorityScan') {
                    toast.success(`Found ${data.paymentsFound} payments!`)
                } else {
                    toast.success('Gas relay successful!')
                }

                setPendingRequest(null)
            } catch (error: any) {
                toast.dismiss()
                toast.error(error.message || 'Request failed after payment')
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
                                <span className="text-cyan-400 font-semibold"> Sign once, pay instantly with USDC - no gas required!</span>
                            </p>
                        </div>

                        {/* Info Banner */}
                        <GlassPanel className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-400">Gasless USDC Payments</p>
                                    <p className="text-sm text-muted-foreground">
                                        Pay with USDC using just a signature. The server handles the transaction - you pay zero gas!
                                    </p>
                                </div>
                            </div>
                        </GlassPanel>

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
                                        <p className="text-2xl font-bold text-cyan-400">
                                            {X402_CONFIG.services.priorityScan.displayAmount} USDC
                                        </p>
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
                                        <p className="text-2xl font-bold text-purple-400">
                                            {X402_CONFIG.services.gasRelay.displayAmount} USDC
                                        </p>
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

                                    {result.paymentTx && (
                                        <TerminalText prefix="usdc-tx">
                                            <a
                                                href={`https://testnet.monadexplorer.com/tx/${result.paymentTx}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-cyan-400 hover:underline"
                                            >
                                                {result.paymentTx.slice(0, 20)}...
                                            </a>
                                        </TerminalText>
                                    )}

                                    {result.payer && (
                                        <TerminalText prefix="payer">
                                            {result.payer.slice(0, 10)}...{result.payer.slice(-8)}
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
                                            <a
                                                href={`https://testnet.monadexplorer.com/tx/${result.relayTxHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-400 hover:underline"
                                            >
                                                {result.relayTxHash.slice(0, 20)}...
                                            </a>
                                        </TerminalText>
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
                                    <p className="text-xs text-muted-foreground">Payment requirements returned</p>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg border border-cyan-500/30">
                                    <div className="text-2xl mb-2">✍️</div>
                                    <p className="text-sm font-semibold text-cyan-400">Sign Authorization</p>
                                    <p className="text-xs text-muted-foreground">No gas, just sign!</p>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg">
                                    <div className="text-2xl mb-2">4️⃣</div>
                                    <p className="text-sm font-semibold">Get Service</p>
                                    <p className="text-xs text-muted-foreground">USDC transferred, instant delivery!</p>
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                </main>
            </div>

            {/* Paywall Modal */}
            <PaywallModal
                challenge={currentChallenge}
                selectedRequirements={selectedRequirements}
                isOpen={showPaywall}
                onClose={() => {
                    setShowPaywall(false)
                    setCurrentChallenge(null)
                    setPendingRequest(null)
                }}
                onAuthorize={handleAuthorize}
                isPaying={isPaymentPending}
            />
        </div>
    )
}
