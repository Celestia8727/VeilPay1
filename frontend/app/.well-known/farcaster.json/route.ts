import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

const farcasterConfig = {
    accountAssociation: {
        // TODO: Generate this using Farcaster's signing tool before production deployment
        // Visit https://warpcast.com/~/developers/mini-apps to generate
        "header": "",
        "payload": "",
        "signature": ""
    },
    frame: {
        version: "1",
        name: "PrivateVeil - Privacy Domains",
        iconUrl: `${appUrl}/icon.png`,
        homeUrl: `${appUrl}`,
        imageUrl: `${appUrl}/og-image.png`,
        screenshotUrls: [
            `${appUrl}/screenshots/register.png`,
            `${appUrl}/screenshots/pay.png`,
            `${appUrl}/screenshots/scan.png`
        ],
        tags: ["monad", "privacy", "domains", "payments", "web3", "stealth"],
        primaryCategory: "utilities",
        buttonTitle: "Open PrivateVeil",
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#0a0a0f",
    }
}

export async function GET() {
    return NextResponse.json(farcasterConfig, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
}
