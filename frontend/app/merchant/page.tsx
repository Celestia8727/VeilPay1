'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseEther } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Plus, Loader2, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { CONTRACTS, VAULT_ABI } from '@/lib/contracts';
import { getUserDomains } from '@/lib/storage';
import toast from 'react-hot-toast';
import { AnimatedBackground } from '@/components/animated-background';
import { ScanlineOverlay } from '@/components/scanline-overlay';
import { NavHeader } from '@/components/nav-header';
import { GlassPanel } from '@/components/ui/glass-panel';
import { NeonButton } from '@/components/ui/neon-button';

export default function MerchantPage() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const [merchantName, setMerchantName] = useState('');
    const [planName, setPlanName] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('');
    const [activeTab, setActiveTab] = useState<'register' | 'create-plan'>('register');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [myDomains, setMyDomains] = useState<any[]>([]);

    // Load user's registered domains
    useEffect(() => {
        if (address) {
            getUserDomains(address).then(domains => {
                setMyDomains(domains);
            });
        }
    }, [address]);

    const handleRegisterMerchant = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address || !walletClient) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsProcessing(true);
        try {
            // Use the same domain hash function as domain registration
            const { generateDomainHash } = await import('@/lib/crypto');
            const merchantId = generateDomainHash(merchantName);

            console.log('🏪 Registering merchant:', merchantName);
            console.log('   Merchant ID:', merchantId);

            const hash = await walletClient.writeContract({
                address: CONTRACTS.VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: 'registerMerchant',
                args: [merchantId as `0x${string}`],
                account: address,
            });

            setTxHash(hash);
            toast.success(`Merchant registered! Hash: ${hash.slice(0, 10)}...`);
        } catch (err: any) {
            console.error('❌ Merchant registration error:', err);
            if (err.message?.includes('User rejected')) {
                toast.error('Transaction rejected');
            } else if (err.message?.includes('MerchantAlreadyExists')) {
                toast.error('This merchant is already registered!');
            } else {
                toast.error(err.shortMessage || err.message || 'Failed to register merchant');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address || !walletClient) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsProcessing(true);
        try {
            // Use the same domain hash function
            const { generateDomainHash } = await import('@/lib/crypto');
            const merchantId = generateDomainHash(merchantName);
            const planId = 0; // Start with plan ID 0 (Basic)
            const priceWei = parseEther(price);
            const durationSeconds = parseInt(duration) * 24 * 60 * 60; // Convert days to seconds

            console.log('📋 Creating plan:', planName);
            console.log('   Merchant ID:', merchantId);
            console.log('   Plan ID:', planId);
            console.log('   Price:', price, 'MON');
            console.log('   Duration:', duration, 'days');

            const hash = await walletClient.writeContract({
                address: CONTRACTS.VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: 'createPlan',
                args: [merchantId as `0x${string}`, BigInt(planId), priceWei, BigInt(durationSeconds)],
                account: address,
            });

            setTxHash(hash);
            toast.success(`Plan created! Hash: ${hash.slice(0, 10)}...`);
        } catch (err: any) {
            console.error('❌ Plan creation error:', err);
            if (err.message?.includes('User rejected')) {
                toast.error('Transaction rejected');
            } else if (err.message?.includes('NotMerchantOwner')) {
                toast.error('You must register as merchant first!');
            } else {
                toast.error(err.shortMessage || err.message || 'Failed to create plan');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <AnimatedBackground />
                <ScanlineOverlay />
                <NavHeader />

                <main className="pt-32 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <GlassPanel glow="cyan" className="p-12">
                            <Store className="w-16 h-16 text-neon-cyan mx-auto mb-6" />
                            <h2 className="font-mono text-3xl tracking-wider text-foreground mb-4">
                                Connect Your Wallet
                            </h2>
                            <p className="font-mono text-sm text-muted-foreground">
                                Please connect your wallet to access the merchant portal
                            </p>
                        </GlassPanel>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <AnimatedBackground />
            <ScanlineOverlay />
            <NavHeader />

            <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-20">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 text-center"
                    >
                        <div className="inline-flex items-center gap-3 mb-4">
                            <Store className="w-12 h-12 text-neon-cyan" />
                            <h1 className="font-mono text-4xl sm:text-5xl font-bold text-neon-cyan neon-text-cyan">
                                MERCHANT PORTAL
                            </h1>
                        </div>
                        <p className="text-xl text-muted-foreground font-mono">
                            Accept private subscription payments
                        </p>
                    </motion.div>

                    {/* Info Alert */}
                    <GlassPanel glow="purple" className="p-6 mb-8">
                        <div className="flex gap-4">
                            <Info className="w-6 h-6 text-neon-purple flex-shrink-0 mt-1" />
                            <div className="space-y-2 font-mono text-sm">
                                <p className="text-neon-purple font-bold">IMPORTANT: Domain & Merchant Must Match!</p>
                                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>First, register your domain on the <span className="text-neon-cyan">/register-domain</span> page</li>
                                    <li>Then, register that SAME domain as a merchant here</li>
                                    <li>Create subscription plans for your domain</li>
                                    <li>Customers can then pay to YOUR domain name</li>
                                </ul>
                                <p className="text-yellow-400 mt-3">
                                    ⚠️ Example: If you register domain "alice", you must also register merchant "alice"
                                </p>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* My Registered Domains */}
                    {myDomains.length > 0 && (
                        <GlassPanel glow="green" className="p-6 mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles className="w-5 h-5 text-neon-green" />
                                <h3 className="font-mono text-lg text-neon-green">Your Registered Domains</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {myDomains.map((domain) => (
                                    <button
                                        key={domain.id}
                                        onClick={() => setMerchantName(domain.domain_name)}
                                        className="px-4 py-2 bg-neon-green/10 border border-neon-green/50 text-neon-green font-mono text-sm hover:bg-neon-green/20 transition-all rounded"
                                    >
                                        {domain.domain_name}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-3">
                                Click a domain to auto-fill the merchant name
                            </p>
                        </GlassPanel>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setActiveTab('register')}
                            className={`flex-1 px-6 py-4 rounded-lg font-mono font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'register'
                                ? 'bg-neon-cyan/20 text-neon-cyan border-2 border-neon-cyan/50 neon-border-cyan'
                                : 'bg-dark-800/50 text-muted-foreground border-2 border-border/30 hover:border-neon-cyan/30'
                                }`}
                        >
                            <Store className="w-5 h-5 mx-auto mb-2" />
                            Register Merchant
                        </button>
                        <button
                            onClick={() => setActiveTab('create-plan')}
                            className={`flex-1 px-6 py-4 rounded-lg font-mono font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'create-plan'
                                ? 'bg-neon-purple/20 text-neon-purple border-2 border-neon-purple/50 neon-border-purple'
                                : 'bg-dark-800/50 text-muted-foreground border-2 border-border/30 hover:border-neon-purple/30'
                                }`}
                        >
                            <Plus className="w-5 h-5 mx-auto mb-2" />
                            Create Plan
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* Register Merchant Form */}
                        {activeTab === 'register' && (
                            <motion.div
                                key="register"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <GlassPanel glow="cyan" className="p-8">
                                    <form onSubmit={handleRegisterMerchant} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-mono font-bold text-neon-cyan mb-3 uppercase tracking-wider">
                                                Merchant Domain Name
                                            </label>
                                            <input
                                                type="text"
                                                value={merchantName}
                                                onChange={(e) => setMerchantName(e.target.value)}
                                                placeholder="alice"
                                                className="w-full px-4 py-3 bg-dark-900/50 border-2 border-neon-cyan/30 rounded-lg text-foreground font-mono focus:outline-none focus:border-neon-cyan transition-all"
                                                required
                                            />
                                            <p className="mt-3 text-sm text-muted-foreground font-mono">
                                                💡 Use the same name as your registered domain
                                            </p>
                                        </div>

                                        <NeonButton
                                            type="submit"
                                            variant="cyan"
                                            size="lg"
                                            className="w-full"
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Store className="w-5 h-5 mr-2" />
                                                    Register Merchant
                                                </>
                                            )}
                                        </NeonButton>
                                    </form>
                                </GlassPanel>
                            </motion.div>
                        )}

                        {/* Create Plan Form */}
                        {activeTab === 'create-plan' && (
                            <motion.div
                                key="create-plan"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <GlassPanel glow="purple" className="p-8">
                                    <form onSubmit={handleCreatePlan} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-mono font-bold text-neon-purple mb-3 uppercase tracking-wider">
                                                Merchant Domain Name
                                            </label>
                                            <input
                                                type="text"
                                                value={merchantName}
                                                onChange={(e) => setMerchantName(e.target.value)}
                                                placeholder="alice"
                                                className="w-full px-4 py-3 bg-dark-900/50 border-2 border-neon-purple/30 rounded-lg text-foreground font-mono focus:outline-none focus:border-neon-purple transition-all"
                                                required
                                            />
                                            <p className="mt-3 text-sm text-muted-foreground font-mono">
                                                ⚠️ Must match your registered merchant name
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-mono font-bold text-neon-purple mb-3 uppercase tracking-wider">
                                                Plan Name
                                            </label>
                                            <input
                                                type="text"
                                                value={planName}
                                                onChange={(e) => setPlanName(e.target.value)}
                                                placeholder="Basic Monthly"
                                                className="w-full px-4 py-3 bg-dark-900/50 border-2 border-neon-purple/30 rounded-lg text-foreground font-mono focus:outline-none focus:border-neon-purple transition-all"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-mono font-bold text-neon-purple mb-3 uppercase tracking-wider">
                                                    Price (MON)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    placeholder="0.01"
                                                    className="w-full px-4 py-3 bg-dark-900/50 border-2 border-neon-purple/30 rounded-lg text-foreground font-mono focus:outline-none focus:border-neon-purple transition-all"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-mono font-bold text-neon-purple mb-3 uppercase tracking-wider">
                                                    Duration (Days)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={duration}
                                                    onChange={(e) => setDuration(e.target.value)}
                                                    placeholder="30"
                                                    className="w-full px-4 py-3 bg-dark-900/50 border-2 border-neon-purple/30 rounded-lg text-foreground font-mono focus:outline-none focus:border-neon-purple transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                            <p className="text-sm font-mono text-yellow-400">
                                                ⚠️ Plan ID will be 0 (first plan). Customers must pay EXACTLY {price || '0.01'} MON
                                            </p>
                                        </div>

                                        <NeonButton
                                            type="submit"
                                            variant="purple"
                                            size="lg"
                                            className="w-full"
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5 mr-2" />
                                                    Create Plan
                                                </>
                                            )}
                                        </NeonButton>
                                    </form>
                                </GlassPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Message */}
                    {txHash && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8"
                        >
                            <GlassPanel glow="green" className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle className="w-6 h-6 text-neon-green" />
                                    <h3 className="text-lg font-bold text-neon-green font-mono">Transaction Successful!</h3>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono mb-2">Transaction Hash:</p>
                                <code className="text-neon-cyan text-sm break-all font-mono">{txHash}</code>
                            </GlassPanel>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
