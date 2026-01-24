import { NextResponse } from 'next/server'

export async function GET() {
    // Fetch the hosted manifest from Farcaster
    const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/019bf0da-8bd4-fc46-2303-a238fadf5f68'

    try {
        const response = await fetch(hostedManifestUrl)
        const manifest = await response.json()

        return NextResponse.json(manifest, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (error) {
        console.error('Failed to fetch Farcaster manifest:', error)
        return NextResponse.json(
            { error: 'Failed to fetch manifest' },
            { status: 500 }
        )
    }
}
