'use client'

import { useFarcaster } from '@/components/providers/FarcasterProvider'
import { NeonButton } from '@/components/ui/neon-button'
import { Share2, Bookmark } from 'lucide-react'
import toast from 'react-hot-toast'

export function ShareDomainAction({ domain }: { domain: string }) {
    const { actions, isSDKLoaded } = useFarcaster()

    const handleShare = async () => {
        if (!isSDKLoaded) {
            toast.error('Farcaster SDK not available')
            return
        }

        try {
            await actions.composeCast({
                text: `Just registered my privacy domain "${domain}" on PrivateVeil! 🔐\n\nNow I can receive private payments without revealing my identity.`,
                embeds: [process.env.NEXT_PUBLIC_URL || 'https://privateveil.app']
            })
            toast.success('Cast composed!')
        } catch (error) {
            console.error('Failed to compose cast:', error)
            toast.error('Failed to share')
        }
    }

    if (!isSDKLoaded) return null

    return (
        <NeonButton variant="purple" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share on Farcaster
        </NeonButton>
    )
}

export function SharePaymentAction({ domain, amount }: { domain: string; amount: string }) {
    const { actions, isSDKLoaded } = useFarcaster()

    const handleShare = async () => {
        if (!isSDKLoaded) {
            toast.error('Farcaster SDK not available')
            return
        }

        try {
            await actions.composeCast({
                text: `Just made a private payment of ${amount} MON to "${domain}" using PrivateVeil! 💸\n\nStealth addresses keep my transactions private.`,
                embeds: [process.env.NEXT_PUBLIC_URL || 'https://privateveil.app']
            })
            toast.success('Cast composed!')
        } catch (error) {
            console.error('Failed to compose cast:', error)
            toast.error('Failed to share')
        }
    }

    if (!isSDKLoaded) return null

    return (
        <NeonButton variant="green" onClick={handleShare} size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share Payment
        </NeonButton>
    )
}

export function BookmarkAppAction() {
    const { actions, isSDKLoaded } = useFarcaster()

    const handleBookmark = async () => {
        try {
            await actions.addFrame()
            toast.success('App bookmarked!')
        } catch (error) {
            console.error('Failed to bookmark:', error)
            toast.error('Failed to bookmark app')
        }
    }

    if (!isSDKLoaded) return null

    return (
        <NeonButton variant="cyan" onClick={handleBookmark} size="sm">
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark App
        </NeonButton>
    )
}
