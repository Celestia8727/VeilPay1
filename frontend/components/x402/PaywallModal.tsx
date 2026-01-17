'use client'

/**
 * x402 Paywall Modal Component
 * 
 * Displays USDC payment authorization request.
 * User signs EIP-712 authorization (no transaction, no gas).
 */

import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Loader2, Lock, Unlock, Zap, Shield, Wallet } from 'lucide-react'
import { X402Response, PaymentRequirements, formatUsdcAmount } from '@/lib/x402'

interface PaywallModalProps {
    challenge: X402Response | null
    selectedRequirements: PaymentRequirements | null
    isOpen: boolean
    onClose: () => void
    onAuthorize: () => Promise<void>
    isPaying: boolean
}

export function PaywallModal({
    challenge,
    selectedRequirements,
    isOpen,
    onClose,
    onAuthorize,
    isPaying
}: PaywallModalProps) {
    if (!isOpen || !selectedRequirements) return null

    const displayAmount = formatUsdcAmount(selectedRequirements.maxAmountRequired)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <GlassPanel className="w-full max-w-md p-6 m-4">
                <div className="text-center space-y-4">
                    {/* Header */}
                    <div className="flex justify-center">
                        <div className="p-4 bg-yellow-500/20 rounded-full">
                            <Lock className="w-8 h-8 text-yellow-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-primary">
                        Payment Authorization
                    </h2>

                    <p className="text-muted-foreground text-sm">
                        {selectedRequirements.description}
                    </p>

                    {/* Payment Details */}
                    <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                        <TerminalText prefix="amount">
                            {displayAmount} USDC
                        </TerminalText>
                        <TerminalText prefix="network">
                            {selectedRequirements.network}
                        </TerminalText>
                        <TerminalText prefix="recipient">
                            {selectedRequirements.payTo.slice(0, 10)}...{selectedRequirements.payTo.slice(-8)}
                        </TerminalText>
                    </div>

                    {/* Benefits */}
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-green-400" />
                            No Gas Required
                        </div>
                        <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            Instant
                        </div>
                        <div className="flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-cyan-400" />
                            USDC
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-left">
                        <p className="text-xs text-cyan-300">
                            <span className="font-semibold">How it works:</span> You'll sign a payment authorization.
                            The server will execute the USDC transfer for you - no gas fees on your end!
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <NeonButton
                            variant="purple"
                            className="flex-1"
                            onClick={onClose}
                            disabled={isPaying}
                        >
                            Cancel
                        </NeonButton>

                        <NeonButton
                            variant="cyan"
                            className="flex-1"
                            onClick={onAuthorize}
                            disabled={isPaying}
                        >
                            {isPaying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Signing...
                                </>
                            ) : (
                                <>
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Authorize {displayAmount} USDC
                                </>
                            )}
                        </NeonButton>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-muted-foreground">
                        Authorization expires in 5 minutes
                    </p>
                </div>
            </GlassPanel>
        </div>
    )
}
