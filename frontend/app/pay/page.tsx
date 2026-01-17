"use client"

import * as React from "react"
import { AnimatedBackground } from "@/components/animated-background"
import { ScanlineOverlay } from "@/components/scanline-overlay"
import { NavHeader } from "@/components/nav-header"
import { NeonButton } from "@/components/ui/neon-button"
import { GlassPanel } from "@/components/ui/glass-panel"
import { TerminalText } from "@/components/ui/terminal-text"
import { HashDisplay } from "@/components/ui/hash-display"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { cn } from "@/lib/utils"
import { ArrowRight, Loader2, Check, Shield, AlertCircle } from "lucide-react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi'
import { CONTRACTS, VAULT_ABI } from '@/lib/contracts'
import { generateStealthAddress, isValidPublicKey } from '@/lib/stealth'
import { getUserDomains, savePayment, type Payment } from '@/lib/storage'
import { parseEther } from 'ethers'
import toast from 'react-hot-toast'

const plans = [
  { id: "basic", name: "Basic", price: "0.01", period: "/month" },
  { id: "pro", name: "Pro", price: "0.05", period: "/month" },
  { id: "enterprise", name: "Enterprise", price: "0.2", period: "/month" },
]

export default function PaymentPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [domain, setDomain] = React.useState("")
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)
  const [customAmount, setCustomAmount] = React.useState("")
  const [step, setStep] = React.useState<"input" | "generating" | "preview" | "executing" | "complete">("input")
  const [stealthData, setStealthData] = React.useState<{
    stealthAddress: string
    ephemeralPublicKey: string
    recipientKeys: { spendPubKey: string; viewPubKey: string }
  } | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Save payment after successful transaction
  React.useEffect(() => {
    if (isSuccess && hash && stealthData) {
      savePaymentToStorage()
    }
  }, [isSuccess, hash])

  async function savePaymentToStorage() {
    if (!hash || !stealthData) return

    const payment: Payment = {
      id: crypto.randomUUID(),
      merchant_id: domain,
      plan_id: selectedPlan ? plans.findIndex(p => p.id === selectedPlan) : 0,
      stealth_address: stealthData.stealthAddress,
      amount: getPaymentAmount(),
      duration: 2592000, // 30 days
      timestamp: Date.now(),
      block_number: 0,
      transaction_hash: hash
    }

    await savePayment(payment)
    toast.success('Payment saved!')
  }

  const getPaymentAmount = () => {
    if (customAmount) return customAmount
    const plan = plans.find(p => p.id === selectedPlan)
    return plan?.price || "0"
  }

  const generateStealthAddressForRecipient = async () => {
    if (!domain) {
      toast.error('Please enter a recipient domain')
      return
    }

    setStep("generating")

    try {
      // Try blockchain first
      const { queryDomainFromBlockchain } = await import('@/lib/blockchain')
      const blockchainDomain = await queryDomainFromBlockchain(domain)

      let recipientDomain = null

      if (blockchainDomain && blockchainDomain.exists) {
        console.log('✅ Found domain on blockchain!')
        recipientDomain = {
          domain_name: domain,
          spend_pub_key: blockchainDomain.spendPubKey,
          view_pub_key: blockchainDomain.viewPubKey,
          owner_address: blockchainDomain.owner
        }
      } else {
        // Fallback to localStorage
        console.log('⚠️ Not on blockchain, checking localStorage...')
        // Look up recipient's domain in localStorage
        // Since we don't have a global registry yet, we'll search all stored domains
        const allAddresses = Object.keys(window.localStorage)
          .filter(key => key.includes('_domains'))
          .map(key => key.split('_')[1])

        for (const addr of allAddresses) {
          const domains = await getUserDomains(addr)
          const found = domains.find(d => d.domain_name === domain)
          if (found) {
            recipientDomain = found
            console.log('✅ Found domain in localStorage!')
            break
          }
        }
      }

      if (!recipientDomain) {
        toast.error(`Domain "${domain}" not found. Make sure it's registered.`)
        setStep("input")
        return
      }

      // Validate public keys
      console.log('Validating public keys for domain:', domain)
      console.log('Spend key:', recipientDomain.spend_pub_key)
      console.log('Spend key length:', recipientDomain.spend_pub_key.length)
      console.log('View key:', recipientDomain.view_pub_key)
      console.log('View key length:', recipientDomain.view_pub_key.length)

      const spendKeyValid = isValidPublicKey(recipientDomain.spend_pub_key)
      const viewKeyValid = isValidPublicKey(recipientDomain.view_pub_key)

      console.log('Spend key valid:', spendKeyValid)
      console.log('View key valid:', viewKeyValid)

      if (!spendKeyValid || !viewKeyValid) {
        toast.error('Invalid public keys for this domain. Check console for details.')
        setStep("input")
        return
      }

      // Generate stealth address
      const result = generateStealthAddress(
        recipientDomain.spend_pub_key,
        recipientDomain.view_pub_key
      )

      setStealthData({
        stealthAddress: result.stealthAddress,
        ephemeralPublicKey: result.ephemeralPublicKey,
        recipientKeys: {
          spendPubKey: recipientDomain.spend_pub_key,
          viewPubKey: recipientDomain.view_pub_key
        }
      })

      setStep("preview")
      toast.success('Stealth address generated!')
    } catch (error: any) {
      console.error('Error generating stealth address:', error)
      toast.error(error.message || 'Failed to generate stealth address')
      setStep("input")
    }
  }

  const executePayment = async () => {
    if (!stealthData || !isConnected || !address) {
      toast.error('Please connect wallet and generate stealth address first')
      return
    }

    if (!walletClient) {
      toast.error('Wallet client not available. Please reconnect your wallet.')
      return
    }

    const amount = getPaymentAmount()
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    setStep("executing")

    try {
      // Convert domain to bytes32 hash for contract
      const { generateDomainHash } = await import('@/lib/crypto')
      const merchantId = generateDomainHash(domain)

      console.log('💸 Executing payment with walletClient...')
      console.log('  - Amount:', amount, 'MON')
      console.log('  - Merchant ID:', merchantId)
      console.log('  - Stealth address:', stealthData.stealthAddress)

      // Use walletClient directly - this WILL trigger MetaMask
      const hash = await walletClient.writeContract({
        address: CONTRACTS.VAULT as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'paySubscription',
        args: [
          merchantId as `0x${string}`, // merchantId (bytes32 hash of domain)
          BigInt(selectedPlan ? plans.findIndex(p => p.id === selectedPlan) : 0), // planId
          stealthData.stealthAddress as `0x${string}`, // stealthAddress
          stealthData.ephemeralPublicKey as `0x${string}` // ephemeralPubKey
        ],
        value: parseEther(amount), // Send MON (Monad native token)
        account: address,
      })

      console.log('✅ Payment transaction submitted! Hash:', hash)
      toast.success(`Payment sent! Hash: ${hash.slice(0, 10)}...`)

      // Save payment to localStorage
      await savePaymentToStorage()

      setStep("complete")
    } catch (error: any) {
      console.error('❌ Payment error:', error)
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        toast.error('Transaction rejected by user')
      } else {
        toast.error(error.shortMessage || error.message || 'Failed to execute payment')
      }
      setStep("preview")
    }
  }

  // Update step when transaction confirms
  React.useEffect(() => {
    if (isSuccess) {
      setStep("complete")
    }
  }, [isSuccess])

  const canGenerate = domain.length > 0 && (selectedPlan !== null || customAmount.length > 0)

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
                Please connect your wallet to make private payments
              </p>
            </GlassPanel>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" >
      <AnimatedBackground />
      <ScanlineOverlay />
      <NavHeader />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-mono text-3xl sm:text-4xl tracking-wider text-foreground mb-4">
              <span className="text-neon-cyan">//</span> Private Payment
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Execute anonymous subscription payments via stealth addresses
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {["Input", "Generate", "Preview", "Execute"].map((label, i) => {
              const stepIndex = ["input", "generating", "preview", "executing", "complete"].indexOf(step)
              const isActive = i <= Math.min(stepIndex, 3)
              return (
                <React.Fragment key={label}>
                  <div
                    className={cn(
                      "font-mono text-xs uppercase tracking-wider px-3 py-1 border",
                      isActive ? "border-neon-cyan text-neon-cyan" : "border-border text-muted-foreground",
                    )}
                  >
                    {label}
                  </div>
                  {i < 3 && <div className={cn("w-8 h-px", isActive ? "bg-neon-cyan" : "bg-border")} />}
                </React.Fragment>
              )
            })}
          </div>

          {/* Main content */}
          <GlassPanel glow="cyan">
            {step === "complete" ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-6 border border-neon-green flex items-center justify-center neon-border-green">
                  <Check className="w-8 h-8 text-neon-green" />
                </div>
                <h2 className="font-mono text-xl tracking-wider text-foreground mb-2">Payment Executed</h2>
                <p className="font-mono text-sm text-muted-foreground mb-6">Transaction confirmed on-chain</p>

                <div className="space-y-4 max-w-md mx-auto text-left">
                  <HashDisplay hash={stealthData?.stealthAddress || ""} label="Stealth Address" />
                  <HashDisplay hash={hash || ""} label="Transaction Hash" />
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <StatusIndicator status="verified" label="Verified" />
                    <span className="font-mono text-xs text-muted-foreground">Amount: {getPaymentAmount()} MON</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Domain Input */}
                <div className="mb-8">
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Recipient Domain
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value.toLowerCase())}
                      placeholder="alice.veil"
                      className="w-full bg-input border border-border px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,212,255,0.3)]"
                      disabled={step !== "input"}
                    />
                  </div>
                  <TerminalText prefix="#">Enter the domain name of the recipient</TerminalText>
                </div>

                {/* Plan Selector */}
                <div className="mb-8">
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
                    Select Plan or Enter Custom Amount
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan.id)
                          setCustomAmount("")
                        }}
                        disabled={step !== "input"}
                        className={cn(
                          "p-4 border text-left transition-all",
                          selectedPlan === plan.id
                            ? "border-neon-cyan neon-border-cyan bg-neon-cyan/5"
                            : "border-border hover:border-neon-cyan/50",
                        )}
                      >
                        <div className="font-mono text-sm text-foreground mb-1">{plan.name}</div>
                        <div className="font-mono text-lg text-neon-cyan">
                          {plan.price} MON
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-2">Custom Amount (MON)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value)
                        setSelectedPlan(null)
                      }}
                      placeholder="0.01"
                      className="w-full bg-input border border-border px-4 py-2 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple focus:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      disabled={step !== "input"}
                    />
                  </div>
                </div>

                {/* Stealth Address Generation */}
                {step === "input" && (
                  <NeonButton
                    variant="cyan"
                    className="w-full"
                    disabled={!canGenerate}
                    onClick={generateStealthAddressForRecipient}
                  >
                    Generate Stealth Address
                  </NeonButton>
                )}

                {step === "generating" && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-neon-cyan animate-spin" />
                    <TerminalText typing>Generating stealth address...</TerminalText>
                  </div>
                )}

                {(step === "preview" || step === "executing") && stealthData && (
                  <div className="space-y-6">
                    {/* Transaction Preview */}
                    <div className="bg-secondary/30 p-4 border border-border font-mono text-xs space-y-2">
                      <div className="text-muted-foreground">{"> "} Transaction Preview</div>
                      <div className="text-foreground">
                        {"> "} to: <span className="text-neon-cyan">{stealthData.stealthAddress.slice(0, 20)}...</span>
                      </div>
                      <div className="text-foreground">
                        {"> "} value: <span className="text-neon-green">{getPaymentAmount()} MON</span>
                      </div>
                      <div className="text-foreground">
                        {"> "} domain: <span className="text-neon-purple">{domain}</span>
                      </div>
                      <div className="text-foreground">
                        {"> "} ephemeral key: <span className="text-muted-foreground">{stealthData.ephemeralPublicKey.slice(0, 20)}...</span>
                      </div>
                    </div>

                    {step === "preview" ? (
                      <NeonButton variant="green" className="w-full" onClick={executePayment} disabled={isPending}>
                        <span className="flex items-center justify-center gap-2">
                          {isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Confirm in MetaMask...
                            </>
                          ) : (
                            <>
                              Execute Private Payment
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </span>
                      </NeonButton>
                    ) : (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 mx-auto mb-2 text-neon-green animate-spin" />
                        <TerminalText typing>
                          {isConfirming ? 'Confirming transaction...' : 'Broadcasting transaction...'}
                        </TerminalText>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </GlassPanel>

          {/* Info Panel */}
          {step === "input" && (
            <GlassPanel glow="purple" className="mt-6 p-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-neon-purple mb-4">
                How It Works
              </h3>
              <div className="space-y-3 font-mono text-xs text-muted-foreground">
                <TerminalText prefix="1.">
                  Enter recipient's domain and payment amount
                </TerminalText>
                <TerminalText prefix="2.">
                  System generates a one-time stealth address using ECDH
                </TerminalText>
                <TerminalText prefix="3.">
                  Payment is sent to stealth address (unlinkable to recipient)
                </TerminalText>
                <TerminalText prefix="4.">
                  Only recipient can detect and claim the payment
                </TerminalText>
              </div>
            </GlassPanel>
          )}
        </div>
      </main>
    </div >
  )
}
