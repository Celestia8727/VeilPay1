'use client'

/**
 * x402 Paywall Modal Component
 * 
 * Displays payment challenge and handles the payment flow
 */

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { NeonButton } from '@/components/ui/neon-button'
import { TerminalText } from '@/components/ui/terminal-text'
import { Loader2, Lock, Unlock, Zap, CreditCard } from 'lucide-react'

interface X402Challenge {
    error: string
    resource: string
    amount: string
    currency: string
    network: string
    chainId: number
    paymentAddress: string
    expiresIn: number
    metadata: Record<string, any>
}

interface PaywallModalProps {
    challenge: X402Challenge
    isOpen: boolean
    onClose: () => void
    onPay: () => Promise<void>
    isPaying: boolean
}

export function PaywallModal({
    challenge,
    isOpen,
    onClose,
    onPay,
    isPaying
}: PaywallModalProps) {
    if (!isOpen) return null

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
                        Payment Required
                    </h2>

                    <p className="text-muted-foreground text-sm">
                        {challenge.metadata?.description || 'This resource requires payment to access.'}
                    </p>

                    {/* Payment Details */}
                    <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                        <TerminalText prefix="amount">
                            {challenge.amount} {challenge.currency}
                        </TerminalText>
                        <TerminalText prefix="network">
                            {challenge.network}
                        </TerminalText>
                        <TerminalText prefix="service">
                            {challenge.metadata?.service || 'Unknown'}
                        </TerminalText>
                        {challenge.metadata?.slaSeconds && (
                            <TerminalText prefix="sla">
                                {challenge.metadata.slaSeconds}s processing
                            </TerminalText>
                        )}
                    </div>

                    {/* Features */}
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            Priority Processing
                        </div>
                        <div className="flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-green-400" />
                            Instant Access
                        </div>
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
                            onClick={onPay}
                            disabled={isPaying}
                        >
                            {isPaying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Paying...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pay {challenge.amount} {challenge.currency}
                                </>
                            )}
                        </NeonButton>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-muted-foreground">
                        Payment expires in {Math.floor(challenge.expiresIn / 60)} minutes
                    </p>
                </div>
            </GlassPanel>
        </div>
    )
}
