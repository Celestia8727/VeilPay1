import { NextResponse } from 'next/server'

const appUrl = 'https://veil-pay1.vercel.app'

const farcasterConfig = {
    accountAssociation: {
        header: "eyJmaWQiOjI0NDQ4MDEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg2ZWQyMEY3YWVDRTVmRmI0OTIxMmFiQTBGNDY5MmNlRUY4ODY0QTBGIn0",
        payload: "eyJkb21haW4iOiJ2ZWlsLXBheTEudmVyY2VsLmFwcCJ9",
        signature: "2APy6ZGpBws5SVUsr9J70xU/F11cskkl9v6k7+voHr0YbFaJdtmOOmXbfSOeywROwYC5ODYNFNSEoIijHHgQExw="
    },
    frame: {
        version: "1",
        name: "Veil",
        iconUrl: `${appUrl}/icon.png`,
        homeUrl: appUrl,
        imageUrl: `${appUrl}/image.png`,
        buttonTitle: "Veil",
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#6200EA",
        webhookUrl: `${appUrl}/api/webhook`,
        subtitle: "Private Payments. Maximum privacy.",
        description: "A self custodial pruivacy domain layer bilt on Monad using stealth addresses to ensure maximum privacy in a transaction.",
        primaryCategory: "finance",
        tags: ["consumer", "defi", "hackathon", "privacy", "stealthaddress"],
        tagline: "Grow",
        ogDescription: "Absolutely hidden payments using stealth addresses",
        castShareUrl: appUrl
    }
}

export async function GET() {
    return NextResponse.json(farcasterConfig, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
        },
    })
}
