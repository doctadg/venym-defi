import type {
    PearAuthTokens,
    PearActiveMarkets,
    PearMarket,
    PearPosition,
    PearOrder,
    PearCreatePositionRequest,
    PearAgentWallet,
} from '../types/pear';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/pear`
    : '/api/pear';

// ============= AUTH =============

export async function fetchPearEIP712Message(address: string) {
    const res = await fetch(`${API_BASE_URL}/auth/eip712-message?address=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to get EIP-712 message');
    return data.data;
}

export async function authenticatePear(
    address: string,
    signature: string,
    timestamp: number
): Promise<PearAuthTokens> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, timestamp }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Authentication failed');
    return data.data;
}

export async function refreshPearToken(
    address: string,
    refreshToken: string
): Promise<PearAuthTokens> {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, refreshToken }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Token refresh failed');
    return data.data;
}

// ============= MARKETS (Public) =============

export async function fetchPearActiveMarkets(): Promise<PearActiveMarkets> {
    const res = await fetch(`${API_BASE_URL}/market/active`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch active markets');
    return data.data;
}

export async function fetchPearMarkets(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
}): Promise<{ markets: PearMarket[]; total: number; page: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const qs = searchParams.toString();
    const res = await fetch(`${API_BASE_URL}/market${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch markets');
    return data.data;
}

// ============= RATIO HISTORY (Public) =============

export interface RatioCandle {
    t: number;  // timestamp ms
    o: number;  // open
    h: number;  // high
    l: number;  // low
    c: number;  // close
}

export async function fetchPearRatioHistory(params: {
    market: string;
    interval?: number; // seconds (default: 60)
    limit?: number;
    since?: number;
}): Promise<RatioCandle[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('market', params.market);
    if (params.interval) searchParams.set('interval', String(params.interval));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.since) searchParams.set('since', String(params.since));

    const res = await fetch(`${API_BASE_URL}/market/ratio-history?${searchParams.toString()}`);
    const data = await res.json();
    if (!data.success) return [];
    return data.data?.candles || [];
}

function authHeaders(accessToken: string) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
    };
}

export async function fetchPearPositions(accessToken: string): Promise<PearPosition[]> {
    const res = await fetch(`${API_BASE_URL}/trading/positions`, {
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch positions');
    return data.data;
}

export async function createPearPosition(
    accessToken: string,
    request: PearCreatePositionRequest
): Promise<PearPosition> {
    const res = await fetch(`${API_BASE_URL}/trading/positions`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create position');
    return data.data;
}

export async function closePearPosition(
    accessToken: string,
    positionId: string,
    params?: { executionType?: 'MARKET' | 'TWAP'; slippage?: number; twapDuration?: number; twapIntervalSeconds?: number }
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/positions/${positionId}/close`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ executionType: 'MARKET', ...params }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to close position');
}

export async function closeAllPearPositions(
    accessToken: string,
    params?: { executionType?: 'MARKET' | 'TWAP'; slippage?: number; twapDuration?: number; twapIntervalSeconds?: number }
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/positions/close-all`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ executionType: 'MARKET', ...params }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to close all positions');
}

export async function adjustPearPosition(
    accessToken: string,
    positionId: string,
    params: { usdValue: number; adjustmentType: 'INCREASE' | 'DECREASE'; slippage?: number }
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/positions/${positionId}/adjust`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to adjust position');
}

export async function adjustPearLeverage(
    accessToken: string,
    positionId: string,
    leverage: number
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/positions/${positionId}/adjust/leverage`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ leverage }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to adjust leverage');
}

export async function updatePearRiskParams(
    accessToken: string,
    positionId: string,
    params: { stopLoss?: object; takeProfit?: object }
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/positions/${positionId}/risk-parameters`, {
        method: 'PUT',
        headers: authHeaders(accessToken),
        body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update risk parameters');
}

// ============= ORDERS (Authed) =============

export async function fetchPearOpenOrders(accessToken: string): Promise<PearOrder[]> {
    const res = await fetch(`${API_BASE_URL}/trading/orders/open`, {
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch open orders');
    return data.data;
}

export async function fetchPearTwapOrders(accessToken: string): Promise<PearOrder[]> {
    const res = await fetch(`${API_BASE_URL}/trading/orders/twap`, {
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch TWAP orders');
    return data.data;
}

export async function cancelPearOrder(accessToken: string, orderId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/orders/${orderId}/cancel`, {
        method: 'DELETE',
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to cancel order');
}

export async function cancelPearTwapOrder(accessToken: string, orderId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/trading/orders/${orderId}/twap/cancel`, {
        method: 'POST',
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to cancel TWAP order');
}

// ============= AGENT WALLET (Authed) =============

export async function fetchPearAgentWallet(accessToken: string): Promise<PearAgentWallet | null> {
    const res = await fetch(`${API_BASE_URL}/trading/agent-wallet`, {
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
}

export async function createPearAgentWallet(accessToken: string): Promise<PearAgentWallet> {
    const res = await fetch(`${API_BASE_URL}/trading/agent-wallet`, {
        method: 'POST',
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create agent wallet');
    return data.data;
}

// ============= PAIR TRADING (Lighter / Hyperliquid) =============

export type PairVenue = 'lighter' | 'hyperliquid';

const PAIR_API = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/pair-trading`
    : '/api/pair-trading';

export interface PairPosition {
    id: string;
    walletAddress: string;
    venue: PairVenue;
    pearMarketId: string;
    status: string;
    usdValue: number;
    leverage: number;
    entryRatio: number | null;
    markRatio: number | null;
    unrealizedPnl: number | null;
    legs: PairLeg[];
    createdAt: string;
}

export interface PairLeg {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    weight: number;
    size: number;
    entryPrice: number;
    markPrice: number | null;
    status: string;
}

// Backward-compatible aliases
export type LighterPairPosition = PairPosition;
export type LighterPairLeg = PairLeg;

export async function createLighterPairPosition(request: {
    walletAddress: string;
    pearMarketId: string;
    usdValue: number;
    leverage: number;
    longAssets: { asset: string; weight: number }[];
    shortAssets: { asset: string; weight: number }[];
    slippage?: number;
    venue?: PairVenue;
}): Promise<{ pairPositionId: string; status: string; legs: any[]; entryRatio: number | null }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const { getAuthToken } = await import('@dynamic-labs/sdk-react-core');
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* auth unavailable */ }

    const res = await fetch(`${PAIR_API}/positions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create pair position');
    return data.data;
}

export async function fetchLighterPairPositions(walletAddress: string): Promise<PairPosition[]> {
    const res = await fetch(`${PAIR_API}/positions?walletAddress=${encodeURIComponent(walletAddress)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch pair positions');
    return data.data;
}

export async function closeLighterPairPosition(walletAddress: string, positionId: string): Promise<{ success: boolean; legs: any[] }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const { getAuthToken } = await import('@dynamic-labs/sdk-react-core');
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* auth unavailable */ }

    const res = await fetch(`${PAIR_API}/positions/${positionId}/close`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ walletAddress }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to close pair position');
    return data.data;
}

export async function checkLighterPairCompatibility(
    longAssets: string[],
    shortAssets: string[],
    venue?: PairVenue,
): Promise<{ compatible: boolean; availableLegs: any[]; missingLegs: string[] }> {
    const params = new URLSearchParams();
    if (longAssets.length) params.set('longAssets', longAssets.join(','));
    if (shortAssets.length) params.set('shortAssets', shortAssets.join(','));
    if (venue) params.set('venue', venue);
    const res = await fetch(`${PAIR_API}/compatibility?${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Compatibility check failed');
    return data.data;
}
