'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import sdk from '@farcaster/miniapp-sdk'

interface FarcasterContextType {
    context: any | null
    isSDKLoaded: boolean
    isLoading: boolean
    actions: typeof sdk.actions
}

const FarcasterContext = createContext<FarcasterContextType | undefined>(undefined)

export function FarcasterProvider({ children }: { children: ReactNode }) {
    const [context, setContext] = useState<any | null>(null)
    const [isSDKLoaded, setIsSDKLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await sdk.context
                setContext(ctx)
                setIsSDKLoaded(true)
                sdk.actions.ready()
                console.log('✅ Farcaster SDK loaded:', ctx.user?.username)
            } catch (error) {
                console.warn('⚠️ Farcaster SDK not available - running in browser mode')
                setIsSDKLoaded(false)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    return (
        <FarcasterContext.Provider value={{ context, isSDKLoaded, isLoading, actions: sdk.actions }}>
            {children}
        </FarcasterContext.Provider>
    )
}

export function useFarcaster() {
    const context = useContext(FarcasterContext)
    if (!context) throw new Error('useFarcaster must be used within FarcasterProvider')
    return context
}
