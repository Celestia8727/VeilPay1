'use client'

import { ReactNode } from 'react'

interface SafeAreaContainerProps {
    children: ReactNode
    insets?: {
        top: number
        bottom: number
        left: number
        right: number
    }
}

export function SafeAreaContainer({ children, insets }: SafeAreaContainerProps) {
    const style = insets ? {
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
    } : {}

    return <div style={style}>{children}</div>
}
