import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_URL || 'https://veil-pay1.vercel.app'

const farcasterConfig = {
    accountAssociation: {
        header: "eyJmaWQiOjI0NDQ4MDEsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhlNDE5MTdhMjlDMmE2ZTMzNmUzNjcxQzJDMjkyNjYyMTM5MTYyRjM0In0",
        payload: "eyJkb21haW4iOiJ2ZWlsLXBheTEudmVyY2VsLmFwcCJ9",
        signature: "YOUR_SIGNATURE_HERE" // You need to get this from Warpcast developer portal
    },
    frame: {
        version: "1",
        name: "VeilProject",
        iconUrl: `${appUrl}/icon.png`,
        homeUrl: appUrl,
        imageUrl: `${appUrl}/image.png`,
        buttonTitle: "Veil",
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#00F5FF", // Removed trailing space
        webhookUrl: `${appUrl}/api/webhook`,
        subtitle: "A self custodial privacy domain layer on Monad",
        description: "Self custodial privacy domain layer on monad",
        primaryCategory: "finance",
        tags: ["finance", "defi", "consumer"],
        ogTitle: "VeilPay",
        ogDescription: "Maximum privacy is what we want, achieve it now"
    }
}

export async function GET() {
    return NextResponse.json(farcasterConfig, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
}
