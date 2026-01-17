'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { AnimatedBackground } from '@/components/animated-background'
import { ScanlineOverlay } from '@/components/scanline-overlay'
import { NavHeader } from '@/components/nav-header'
import { GlassPanel } from '@/components/ui/glass-panel'
import { TerminalText } from '@/components/ui/terminal-text'
import { NeonButton } from '@/components/ui/neon-button'
import { Shield, Loader2, Copy, CheckCircle2, Key, Eye, EyeOff } from 'lucide-react'
import { getUserDomains, getUserSubscription, type Domain, type UserSubscription } from '@/lib/storage'
import { formatHash } from '@/lib/crypto'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function MyDomainsPage() {
    const { address, isConnected } = useAccount()
    const [domains, setDomains] = useState<Domain[]>([])
    const [subscription, setSubscription] = useState<UserSubscription | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        if (address) {
            loadData()
        }
    }, [address])

    async function loadData() {
        if (!address) return

        setIsLoading(true)
        try {
            const [domainsData, subData] = await Promise.all([
                getUserDomains(address),
                getUserSubscription(address)
            ])
            setDomains(domainsData)
            setSubscription(subData)
        } catch (error) {
            console.error('Error loading domains:', error)
            toast.error('Failed to load domains')
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard!`)
    }

    const toggleShowKeys = (domainId: string) => {
        setShowKeys(prev => ({ ...prev, [domainId]: !prev[domainId] }))
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />
                <main className="pt-32 px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel glow="cyan" className="p-12">
                            <Shield className="w-16 h-16 text-neon-cyan mx-auto mb-6" />
                            <h2 className="font-mono text-3xl tracking-wider text-foreground mb-4">
                                Connect Your Wallet
                            </h2>
                            <p className="font-mono text-sm text-muted-foreground">
                                Please connect your wallet to view your domains
                            </p>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <AnimatedBackground />
            <ScanlineOverlay />
            <NavHeader />

            <main className="pt-32 px-4 pb-20">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="font-mono text-4xl font-bold tracking-[0.2em] mb-4 animate-flicker">
                            <span className="neon-text-cyan">MY DOMAINS</span>
                        </h1>
                        <TerminalText prefix="$">Your registered privacy domains</TerminalText>
                    </div>

                    {/* Subscription Info */}
                    {subscription && (
                        <GlassPanel glow="green" className="p-6 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <TerminalText prefix="#">Subscription: {subscription.tier?.tier_name}</TerminalText>
                                    <TerminalText prefix="limit">
                                        {domains.length} / {subscription.tier?.domain_limit} domains used
                                    </TerminalText>
                                </div>
                                <Link href="/register-domain">
                                    <NeonButton variant="cyan" size="sm">
                                        Register New Domain
                                    </NeonButton>
                                </Link>
                            </div>
                        </GlassPanel>
                    )}

                    {/* Domains List */}
                    {isLoading ? (
                        <GlassPanel className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan mx-auto mb-4" />
                            <TerminalText>Loading domains...</TerminalText>
                        </GlassPanel>
                    ) : domains.length === 0 ? (
                        <GlassPanel className="p-12 text-center">
                            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                            <h3 className="font-mono text-xl text-foreground mb-2">No Domains Yet</h3>
                            <TerminalText className="mb-6">Register your first privacy domain to get started</TerminalText>
                            <Link href="/register-domain">
                                <NeonButton variant="cyan">
                                    Register Domain
                                </NeonButton>
                            </Link>
                        </GlassPanel>
                    ) : (
                        <div className="space-y-4">
                            {domains.map((domain) => (
                                <GlassPanel key={domain.id} glow="cyan" className="p-6">
                                    <div className="space-y-4">
                                        {/* Domain Name */}
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-mono text-xl text-neon-cyan">{domain.domain_name}</h3>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-neon-green" />
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {new Date(domain.registered_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Domain Hash */}
                                        <div>
                                            <TerminalText prefix="hash">Domain Hash</TerminalText>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="flex-1 text-xs text-muted-foreground font-mono bg-secondary/30 px-3 py-2 border border-border">
                                                    {domain.domain_hash}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(domain.domain_hash, 'Domain hash')}
                                                    className="p-2 text-neon-cyan hover:text-neon-green transition-colors border border-border hover:border-neon-cyan"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Public Keys */}
                                        <div className="pt-4 border-t border-border space-y-3">
                                            <div className="flex items-center justify-between">
                                                <TerminalText prefix="keys">Public Keys</TerminalText>
                                                <button
                                                    onClick={() => toggleShowKeys(domain.id)}
                                                    className="flex items-center gap-2 px-3 py-1 text-xs font-mono border border-border hover:border-neon-cyan text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showKeys[domain.id] ? (
                                                        <>
                                                            <EyeOff className="w-3 h-3" />
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-3 h-3" />
                                                            Show
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {showKeys[domain.id] && (
                                                <>
                                                    {/* Spend Public Key */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Key className="w-3 h-3 text-neon-green" />
                                                            <span className="font-mono text-xs text-neon-green">Spend Public Key</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <code className="flex-1 text-xs text-muted-foreground font-mono bg-secondary/30 px-3 py-2 border border-border break-all">
                                                                {domain.spend_pub_key}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(domain.spend_pub_key, 'Spend public key')}
                                                                className="p-2 text-neon-green hover:text-neon-cyan transition-colors border border-border hover:border-neon-green"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* View Public Key */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Key className="w-3 h-3 text-neon-purple" />
                                                            <span className="font-mono text-xs text-neon-purple">View Public Key</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <code className="flex-1 text-xs text-muted-foreground font-mono bg-secondary/30 px-3 py-2 border border-border break-all">
                                                                {domain.view_pub_key}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(domain.view_pub_key, 'View public key')}
                                                                className="p-2 text-neon-purple hover:text-neon-cyan transition-colors border border-border hover:border-neon-purple"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Warning about private keys */}
                                        <div className="pt-4 border-t border-border">
                                            <div className="flex items-start gap-2 p-3 bg-neon-purple/10 border border-neon-purple/30">
                                                <Shield className="w-4 h-4 text-neon-purple flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <TerminalText prefix="!">
                                                        Private keys are derived from your wallet signature
                                                    </TerminalText>
                                                    <p className="font-mono text-xs text-muted-foreground mt-1">
                                                        To receive payments, you need to scan the blockchain with your view private key.
                                                        Sign the same message again to regenerate your keys.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </GlassPanel>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
