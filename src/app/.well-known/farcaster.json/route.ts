export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL || 'https://app.tide.ag';

    const manifest = {
        accountAssociation: {
            header: "eyJmaWQiOjIyOTMxMzMsInR5cGUiOiJhdXRoIiwia2V5IjoiMHgyY0E1OTMwY0NkNWNDRjI5ZkQ5MzMxRUIyQThkYTM5OTFlNEY4N0VDIn0",
            payload: "eyJkb21haW4iOiJhcHAudGlkZS5hZyJ9",
            signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEFLvtvYIko5Wa5NZ2-vBNLNSsC2cpMqHms1oWqoBrieLQZzghV1TGlUe7oM2tA6923SSrt4OsqKCZB2p1xI-xAtHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        },
        miniapp: {
            version: "1",
            name: "Venym",
            homeUrl: URL,
            iconUrl: `${URL}/tide-base.png`,
            splashImageUrl: `${URL}/tide-base.png`,
            splashBackgroundColor: "#050505",
            webhookUrl: `${URL}/api/webhook`,
            subtitle: "Perps DEX Aggregator",
            description: "Trade perpetual futures across Hyperliquid, Aster & Lighter with optimal routing. Real-time order books, advanced charting, and unified portfolio management.",
            screenshotUrls: [
                `${URL}/screenshots/trade.png`,
                `${URL}/screenshots/portfolio.png`,
                `${URL}/screenshots/orderbook.png`
            ],
            primaryCategory: "finance",
            tags: ["trading", "perps", "defi", "aggregator"],
            heroImageUrl: `${URL}/og-image.png`,
            tagline: "Trade Smarter",
            ogTitle: "Venym - Perps DEX Aggregator",
            ogDescription: "Trade perpetual futures across multiple DEXs with optimal routing.",
            ogImageUrl: `${URL}/og-image.png`,
            noindex: false
        }
    };

    return Response.json(manifest);
}
