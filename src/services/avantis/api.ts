/**
 * Avantis Price Service
 * Fetches pair prices via the Tide backend orderbook API.
 * All direct Avantis API calls have been removed — data routes through the backend.
 */

/**
 * Fetch current prices for given symbols via the Tide backend orderbook API.
 */
export async function fetchAvantisPairPrices(
    symbols: string[]
): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tide.ag';

    const pricePromises = symbols.map(async (symbol) => {
        try {
            const normalizedSymbol = symbol.replace(/\/USD$|-USD$|USDT$|USD$/i, '');
            const response = await fetch(
                `${API_BASE_URL}/orderbook/${normalizedSymbol}?depth=1`,
                { signal: AbortSignal.timeout(5000) }
            );
            if (!response.ok) return;

            const json = await response.json();
            const data = json.data || json;

            const bestBid = data.bids?.[0]?.[0] || data.bids?.[0]?.price;
            const bestAsk = data.asks?.[0]?.[0] || data.asks?.[0]?.price;

            if (bestBid && bestAsk) {
                prices[symbol] = (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
            } else if (data.midPrice) {
                prices[symbol] = parseFloat(data.midPrice);
            }
        } catch {
            // Skip symbols we can't get prices for
        }
    });

    await Promise.all(pricePromises);
    return prices;
}
