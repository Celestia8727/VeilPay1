'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi'
import { AnimatedBackground } from '@/components/animated-background'
import { ScanlineOverlay } from '@/components/scanline-overlay'
import { NavHeader } from '@/components/nav-header'
import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Shield, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { CONTRACTS, REGISTRY_ABI } from '@/lib/contracts'
import { generateDomainHash, derivePublicKeyFromWallet, formatHash } from '@/lib/crypto'
import { getUserDomains, getUserSubscription, saveDomain, type Domain, type UserSubscription } from '@/lib/storage'
import { useFarcaster } from '@/components/providers/FarcasterProvider'
import { SafeAreaContainer } from '@/components/SafeAreaContainer'
import { ShareDomainAction } from '@/components/FarcasterActions'
import toast from 'react-hot-toast'

export default function RegisterDomainPage() {
    const { context, isSDKLoaded } = useFarcaster()
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const [domainName, setDomainName] = useState('')
    const [isGeneratingKeys, setIsGeneratingKeys] = useState(false)
    const [generatedKeys, setGeneratedKeys] = useState<{
        spendPubKey: `0x${string}`
        viewPubKey: `0x${string}`
        domainHash: `0x${string}`
    } | null>(null)

    // Wallet-scoped data
    const [userDomains, setUserDomains] = useState<Domain[]>([])
    const [subscription, setSubscription] = useState<UserSubscription | null>(null)
    const [isLoadingData, setIsLoadingData] = useState(true)

    const { writeContract, data: hash, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    // Load user data when wallet connects
    useEffect(() => {
        if (address) {
            loadUserData()
        }
    }, [address])

    // Save domain after successful registration
    useEffect(() => {
        if (isSuccess && hash && generatedKeys && address) {
            saveDomainToStorage()
        }
    }, [isSuccess, hash])

    async function loadUserData() {
        if (!address) return

        setIsLoadingData(true)
        try {
            const [domains, sub] = await Promise.all([
                getUserDomains(address),
                getUserSubscription(address)
            ])
            setUserDomains(domains)
            setSubscription(sub)
        } catch (error) {
            console.error('Error loading user data:', error)
        } finally {
            setIsLoadingData(false)
        }
    }

    async function saveDomainToStorage() {
        if (!address || !generatedKeys || !domainName) return

        const domain: Domain = {
            id: crypto.randomUUID(),
            domain_hash: generatedKeys.domainHash,
            domain_name: domainName,
            owner_address: address.toLowerCase(),
            spend_pub_key: generatedKeys.spendPubKey,
            view_pub_key: generatedKeys.viewPubKey,
            registered_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        }

        console.log('Saving domain:', domain.domain_name)
        await saveDomain(address, domain)

        // Reload data to refresh count
        await loadUserData()

        toast.success(`Domain "${domainName}" saved to your wallet!`)

        // Reset form for next registration
        setDomainName('')
        setGeneratedKeys(null)
    }

    const handleGenerateKeys = async () => {
        if (!walletClient || !domainName || !address) {
            toast.error('Please enter a domain name and connect your wallet')
            return
        }

        // Check subscription limits
        const domainLimit = subscription?.tier?.domain_limit || 1
        if (userDomains.length >= domainLimit) {
            toast.error(
                `Domain limit reached! You can register ${domainLimit} domain(s) with your ${subscription?.tier?.tier_name || 'Free'} subscription.`,
                { duration: 5000 }
            )
            return
        }

        // Check if domain already exists for this user
        const existingDomain = userDomains.find(d => d.domain_name === domainName)
        if (existingDomain) {
            toast.error('You already own this domain!')
            return
        }

        setIsGeneratingKeys(true)
        try {
            const domainHash = generateDomainHash(domainName)
            const { spendPubKey, viewPubKey } = await derivePublicKeyFromWallet(
                walletClient,
                `Generate keys for domain: ${domainName}`
            )

            setGeneratedKeys({ spendPubKey, viewPubKey, domainHash })
            toast.success('Keys generated successfully!')
        } catch (error: any) {
            console.error('Key generation error:', error)
            toast.error(error.message || 'Failed to generate keys')
        } finally {
            setIsGeneratingKeys(false)
        }
    }

    const handleRegisterDomain = async () => {
        if (!generatedKeys || !isConnected || !address) {
            toast.error('Please connect wallet and generate keys first')
            return
        }

        if (!walletClient) {
            toast.error('Wallet client not available. Please reconnect your wallet.')
            return
        }

        console.log('🚀 Starting on-chain registration with walletClient...')

        try {
            // Use walletClient directly - this WILL trigger MetaMask
            const hash = await walletClient.writeContract({
                address: CONTRACTS.REGISTRY as `0x${string}`,
                abi: REGISTRY_ABI,
                functionName: 'registerDomain',
                args: [
                    generatedKeys.domainHash,
                    generatedKeys.spendPubKey,
                    generatedKeys.viewPubKey
                ],
                account: address,
            })

            console.log('✅ Transaction submitted! Hash:', hash)
            toast.success(`Transaction submitted! Hash: ${hash.slice(0, 10)}...`)

            // Save to localStorage after successful submission
            await saveDomainToStorage()

        } catch (error: any) {
            console.error('❌ Registration error:', error)
            if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
                toast.error('Transaction rejected by user')
            } else {
                toast.error(error.shortMessage || error.message || 'Failed to register domain')
            }
        }
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />

                <main className="pt-32 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel glow="cyan" className="p-12">
                            <Shield className="w-16 h-16 text-neon-cyan mx-auto mb-6" />
                            <h2 className="font-mono text-3xl tracking-wider text-foreground mb-4">
                                Connect Your Wallet
                            </h2>
                            <p className="font-mono text-sm text-muted-foreground">
                                Please connect your wallet to register a privacy domain
                            </p>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <SafeAreaContainer insets={context?.client.safeAreaInsets}>
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />

                <main className="pt-32 px-4 sm:px-6 lg:px-8 pb-20">
                    <div className="max-w-3xl mx-auto">
                        {/* Farcaster User Info */}
                        {isSDKLoaded && context?.user && (
                            <GlassPanel glow="purple" className="p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={context.user.pfpUrl}
                                        alt={context.user.username}
                                        className="w-12 h-12 rounded-full border-2 border-neon-purple"
                                    />
                                    <div className="flex-1">
                                        <p className="font-mono text-sm text-neon-purple font-bold">
                                            @{context.user.username}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            FID: {context.user.fid} • {context.user.displayName}
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 bg-neon-purple/20 border border-neon-purple/50 rounded">
                                        <p className="font-mono text-xs text-neon-purple">Farcaster Mini App</p>
                                    </div>
                                </div>
                            </GlassPanel>
                        )}

                        {/* Header */}
                        <div className="mb-12 text-center">
                            <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-[0.2em] mb-4 animate-flicker">
                                <span className="neon-text-cyan">REGISTER DOMAIN</span>
                            </h1>
                            <TerminalText prefix="$">Create your privacy domain for stealth payments</TerminalText>
                        </div>

                        {/* Subscription Info */}
                        {!isLoadingData && subscription && (
                            <GlassPanel glow="green" className="p-6 mb-6">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <TerminalText prefix="#">
                                            Subscription: {subscription.tier?.tier_name}
                                        </TerminalText>
                                        <TerminalText prefix="limit">
                                            {userDomains.length} / {subscription.tier?.domain_limit} domains used
                                        </TerminalText>
                                    </div>
                                    {userDomains.length >= (subscription.tier?.domain_limit || 1) && (
                                        <div className="flex items-center gap-2 text-neon-purple">
                                            <Info className="w-5 h-5" />
                                            <span className="font-mono text-sm">Limit reached - upgrade to register more</span>
                                        </div>
                                    )}
                                </div>
                            </GlassPanel>
                        )}

                        {/* Registration Form */}
                        <GlassPanel glow="cyan" className="p-8 space-y-6">
                            {/* Domain Name Input */}
                            <div>
                                <label className="block font-mono text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                                    Domain Name
                                </label>
                                <input
                                    type="text"
                                    value={domainName}
                                    onChange={(e) => setDomainName(e.target.value.toLowerCase())}
                                    placeholder="alice.veil"
                                    className="w-full px-4 py-3 bg-input border border-border text-foreground font-mono text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                                    disabled={isGeneratingKeys || isPending || isConfirming}
                                />
                                <TerminalText prefix="#">
                                    Choose a unique identifier for receiving private payments
                                </TerminalText>
                            </div>

                            {/* Generate Keys Button */}
                            {!generatedKeys && (
                                <NeonButton
                                    variant="cyan"
                                    size="lg"
                                    className="w-full"
                                    onClick={handleGenerateKeys}
                                    disabled={!domainName || isGeneratingKeys}
                                >
                                    {isGeneratingKeys ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Generating Keys...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-5 h-5 mr-2" />
                                            Generate Keys
                                        </>
                                    )}
                                </NeonButton>
                            )}

                            {/* Generated Keys Display */}
                            {generatedKeys && !isSuccess && (
                                <div className="space-y-4 border-t border-border pt-6">
                                    <div className="space-y-2">
                                        <TerminalText prefix="hash">Domain Hash</TerminalText>
                                        <code className="block w-full px-4 py-2 bg-secondary/50 border border-border text-neon-cyan text-xs font-mono break-all">
                                            {generatedKeys.domainHash}
                                        </code>
                                    </div>

                                    <div className="space-y-2">
                                        <TerminalText prefix="key">Spend Public Key</TerminalText>
                                        <code className="block w-full px-4 py-2 bg-secondary/50 border border-border text-neon-green text-xs font-mono break-all">
                                            {formatHash(generatedKeys.spendPubKey)}
                                        </code>
                                    </div>

                                    <div className="space-y-2">
                                        <TerminalText prefix="key">View Public Key</TerminalText>
                                        <code className="block w-full px-4 py-2 bg-secondary/50 border border-border text-neon-purple text-xs font-mono break-all">
                                            {formatHash(generatedKeys.viewPubKey)}
                                        </code>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                        {/* Save to Wallet (Local Only) */}
                                        <NeonButton
                                            variant="purple"
                                            size="lg"
                                            className="w-full"
                                            onClick={() => saveDomainToStorage()}
                                        >
                                            <Shield className="w-5 h-5 mr-2" />
                                            Save to Wallet
                                        </NeonButton>

                                        {/* Register On-Chain */}
                                        <NeonButton
                                            variant="green"
                                            size="lg"
                                            className="w-full"
                                            onClick={async () => {
                                                console.log('🔴 BUTTON CLICKED!')
                                                try {
                                                    await handleRegisterDomain()
                                                    console.log('✅ Function completed')
                                                } catch (err: any) {
                                                    console.error('❌ ERROR:', err)
                                                }
                                            }}
                                            disabled={isPending || isConfirming}
                                        >
                                            {isPending || isConfirming ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    {isPending ? 'Confirm in Wallet...' : 'Registering...'}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                                    Register On-Chain
                                                </>
                                            )}
                                        </NeonButton>
                                    </div>

                                    {/* Info about the difference */}
                                    <div className="mt-4 p-3 bg-secondary/30 border border-border">
                                        <TerminalText prefix="info">
                                            "Save to Wallet" stores locally. "Register On-Chain" requires gas fees.
                                        </TerminalText>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {isSuccess && hash && (
                                <div className="border-t border-border pt-6">
                                    <div className="flex items-start gap-3 p-4 bg-neon-green/10 border border-neon-green/30">
                                        <CheckCircle2 className="w-6 h-6 text-neon-green flex-shrink-0 mt-1" />
                                        <div className="flex-1">
                                            <h3 className="font-mono text-lg text-neon-green mb-2">
                                                Domain Registered Successfully!
                                            </h3>
                                            <TerminalText prefix="tx">Transaction Hash</TerminalText>
                                            <code className="block text-xs text-muted-foreground font-mono break-all mt-1">
                                                {hash}
                                            </code>
                                            <TerminalText prefix="$" className="mt-4">
                                                Your domain "{domainName}" is now ready to receive private payments
                                            </TerminalText>
                                        </div>
                                    </div>

                                    {/* Share on Farcaster */}
                                    {isSDKLoaded && (
                                        <div className="mt-4">
                                            <ShareDomainAction domain={domainName} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </GlassPanel>

                        {/* Info Panel */}
                        <GlassPanel glow="purple" className="mt-6 p-6">
                            <h3 className="font-mono text-sm uppercase tracking-wider text-neon-purple mb-4">
                                How It Works
                            </h3>
                            <div className="space-y-3 font-mono text-xs text-muted-foreground">
                                <TerminalText prefix="1.">
                                    Your domain is hashed and stored on-chain
                                </TerminalText>
                                <TerminalText prefix="2.">
                                    Public keys enable stealth address generation
                                </TerminalText>
                                <TerminalText prefix="3.">
                                    Payers can send to your domain without revealing your identity
                                </TerminalText>
                                <TerminalText prefix="4.">
                                    Only you can detect and claim payments using your private keys
                                </TerminalText>
                            </div>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        </SafeAreaContainer>
    )
}
