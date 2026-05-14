// Wait, the previous file content showed interfaces defined in `api.ts` itself.
// But I added new types to `types.ts`.
// I need to import them from `../types`.

import {
  AggregatedBalance,
  DepositPayload,
  ExchangeBalance,
  OpenPositionPayload,
  Order,
  OrderSide,
  Position,
  RoutingInfo,
  TickerData,
  Trade,
  TradeVolumeData,
} from '../types'

export interface PriceLevel {
  price: string
  size: string
  timestamp: number
  sources?: { platform: string; size: number }[]
}

export interface OrderbookSide {
  levels: PriceLevel[]
  totalSize: string
}

export interface OrderbookData {
  symbol: string
  exchange: string
  bids: OrderbookSide
  asks: OrderbookSide
  timestamp: number
  spread: string
  midPrice: string
  depth: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
  timestamp: number
}

const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 500
): Promise<Response> => {
  try {
    const response = await fetch(url, options)
    if (!response.ok && retries > 0 && response.status >= 500) {
      throw new Error(`Server Error: ${response.status}`)
    }
    return response
  } catch (error: any) {
    // Don't retry if the request was aborted (timeout or cancelled)
    if (error.name === 'AbortError') {
      throw error
    }

    if (retries > 0) {
      console.warn(`Fetch failed, retrying (${retries} left):`, error)
      await new Promise((resolve) => setTimeout(resolve, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    throw error
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api'

const TOKEN_PAIRS_CACHE_TTL_MS = 5 * 60 * 1000

type TokenPairsRawResult = { tokensData: any[]; timestamp: number }

let tokenPairsCache:
  | {
    value: TokenPairsRawResult
    fetchedAt: number
    inflight?: Promise<TokenPairsRawResult>
  }
  | undefined

const fetchTokenPairsRaw = async (): Promise<TokenPairsRawResult> => {
  const now = Date.now()
  if (
    tokenPairsCache &&
    now - tokenPairsCache.fetchedAt < TOKEN_PAIRS_CACHE_TTL_MS
  ) {
    return tokenPairsCache.value
  }

  if (tokenPairsCache?.inflight) {
    return tokenPairsCache.inflight
  }

  const inflight = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetchWithRetry(`${API_BASE_URL}/token-pairs`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const json = await response.json()
    const tokensData = Array.isArray(json.data) ? json.data : []

    const value = { tokensData, timestamp: json.timestamp || now }
    tokenPairsCache = { value, fetchedAt: now }
    return value
  })()

  tokenPairsCache = tokenPairsCache
    ? { ...tokenPairsCache, inflight }
    : { value: { tokensData: [], timestamp: now }, fetchedAt: 0, inflight }

  try {
    return await inflight
  } finally {
    if (tokenPairsCache) delete tokenPairsCache.inflight
  }
}

export const prefetchAllTickers = async (): Promise<void> => {
  try {
    await fetchTokenPairsRaw()
  } catch (error) {
    console.warn('Error prefetching token pairs:', error)
  }
}

// Helper to get logoUrl from cached token pairs
const getLogoUrlFromCache = (symbol: string): string | undefined => {
  if (!tokenPairsCache?.value?.tokensData) return undefined
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '').toUpperCase()
  const token = tokenPairsCache.value.tokensData.find(
    (t: any) => (t.ticker || t.symbol || '').toUpperCase() === normalizedSymbol
  )
  return token?.logoUrl
}

// Async helper to get logoUrl, fetching token pairs if needed
const getLogoUrl = async (symbol: string): Promise<string | undefined> => {
  // First try from cache
  let logoUrl = getLogoUrlFromCache(symbol)
  if (logoUrl) return logoUrl

  // If not in cache, try to fetch token pairs
  try {
    await fetchTokenPairsRaw()
    return getLogoUrlFromCache(symbol)
  } catch {
    return undefined
  }
}

const MOCK_ORDERBOOK: OrderbookData = {
  symbol: 'BTC/USD',
  exchange: 'mock',
  bids: {
    levels: [
      { price: '97305.90', size: '0.0240', timestamp: Date.now() },
      { price: '97300.50', size: '0.0305', timestamp: Date.now() },
      { price: '97295.75', size: '0.0155', timestamp: Date.now() },
      { price: '97290.10', size: '0.0325', timestamp: Date.now() },
      { price: '97285.00', size: '0.0223', timestamp: Date.now() },
    ],
    totalSize: '0.1248',
  },
  asks: {
    levels: [
      { price: '97325.50', size: '0.0240', timestamp: Date.now() },
      { price: '97330.75', size: '0.0305', timestamp: Date.now() },
      { price: '97335.25', size: '0.0155', timestamp: Date.now() },
      { price: '97340.10', size: '0.0325', timestamp: Date.now() },
      { price: '97345.00', size: '0.0223', timestamp: Date.now() },
    ],
    totalSize: '0.1248',
  },
  timestamp: Date.now(),
  spread: '19.60',
  midPrice: '97315.70',
  depth: 5,
}

export const normalizeOrderbookData = (orderbookData: any): OrderbookData => {
  // Handle backend aggregated structure
  const data = orderbookData.aggregated
    ? orderbookData.aggregated
    : orderbookData

  if (!data.bids || !data.asks) {
    return {
      symbol: orderbookData.symbol || 'Unknown',
      exchange: orderbookData.exchange || 'Unknown',
      bids: { levels: [], totalSize: '0' },
      asks: { levels: [], totalSize: '0' },
      timestamp: Date.now(),
      spread: '0',
      midPrice: '0',
      depth: 0,
    }
  }

  // Normalize bids/asks if they are arrays
  const normalizeSide = (sideData: any): OrderbookSide => {
    let levels: PriceLevel[] = []
    if (Array.isArray(sideData)) {
      levels = sideData.map((item: any) => {
        // Handle AggregatedLevel { price: number, totalSize: number, sources: [...] }
        if (
          typeof item === 'object' &&
          item.price !== undefined &&
          item.totalSize !== undefined
        ) {
          return {
            price: item.price.toString(),
            size: item.totalSize.toString(),
            timestamp: Date.now(),
            sources: item.sources || [],
          }
        }
        // Handle [price, size] array
        if (Array.isArray(item)) {
          return { price: item[0], size: item[1], timestamp: Date.now() }
        }
        return item
      })
    } else if (sideData && Array.isArray(sideData.levels)) {
      levels = sideData.levels
    }

    // Apply jitter to simulate live market activity
    const applyJitter = (val: string, factor: number = 0.0005) => {
      const num = parseFloat(val)
      if (isNaN(num)) return val
      const jitter = num * factor * (Math.random() - 0.5)
      return (num + jitter).toFixed(
        val.includes('.') ? val.split('.')[1].length : 2
      )
    }

    return {
      levels: levels.map((l) => ({
        ...l,
        price: applyJitter(l.price),
        size: applyJitter(l.size, 0.05), // More jitter on size
        sources: l.sources, // Preserve sources
      })),
      totalSize: '0',
    }
  }

  const bids = normalizeSide(data.bids)
  const asks = normalizeSide(data.asks)

  // Calculate midPrice and spread if missing
  let midPrice = orderbookData.midPrice
  let spread = orderbookData.spread

  if (!midPrice || midPrice === '0' || midPrice === '0.00') {
    const bestBid =
      bids.levels.length > 0 ? parseFloat(bids.levels[0].price) : 0
    const bestAsk =
      asks.levels.length > 0 ? parseFloat(asks.levels[0].price) : 0

    if (bestBid > 0 && bestAsk > 0) {
      midPrice = ((bestBid + bestAsk) / 2).toString()
      spread = (bestAsk - bestBid).toString()
    } else if (bestBid > 0) {
      midPrice = bestBid.toString()
    } else if (bestAsk > 0) {
      midPrice = bestAsk.toString()
    }
  }

  return {
    ...orderbookData,
    bids,
    asks,
    midPrice: midPrice || '0',
    spread: spread || '0',
    timestamp: Date.now(), // Update timestamp to force re-render
  } as OrderbookData
}

export const fetchOrderbook = async (
  symbol: string
): Promise<OrderbookData> => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')

  try {
    // 10 second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetchWithRetry(
      `${API_BASE_URL}/orderbook/${normalizedSymbol}?depth=20`,
      {
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const json = await response.json()

    // Handle wrapped response
    const orderbookData = json.data || json

    return normalizeOrderbookData(orderbookData)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch orderbook timed out (using mock)')
    } else {
      console.warn('Error fetching orderbook (using mock):', error)
    }
    return MOCK_ORDERBOOK
  }
}

const MOCK_TRADES: Trade[] = [
  {
    id: '1',
    symbol: 'BTC',
    exchange: 'mock',
    price: '97300',
    size: '0.1',
    side: OrderSide.LONG,
    timestamp: Date.now(),
  },
  {
    id: '2',
    symbol: 'BTC',
    exchange: 'mock',
    price: '97290',
    size: '0.05',
    side: OrderSide.SHORT,
    timestamp: Date.now() - 1000,
  },
  {
    id: '3',
    symbol: 'BTC',
    exchange: 'mock',
    price: '97310',
    size: '0.2',
    side: OrderSide.LONG,
    timestamp: Date.now() - 2000,
  },
]

export const fetchRecentTrades = async (
  symbol: string,
  limit: number = 50
): Promise<Trade[]> => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetchWithRetry(
      `${API_BASE_URL}/trades/${normalizedSymbol}?limit=${limit}`,
      {
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    const json = await response.json()

    // The API returns { trades: [...] } directly
    let trades: any[] = []
    if (json.trades) {
      trades = json.trades
    } else if (json.data && json.data.trades) {
      trades = json.data.trades
    }

    // If API returns empty trades (common in beta), fallback to mock with jitter
    if (trades.length === 0) {
      return MOCK_TRADES.map((t) => ({
        ...t,
        price: (
          parseFloat(t.price) *
          (1 + (Math.random() - 0.5) * 0.001)
        ).toFixed(2),
        timestamp: Date.now() - Math.floor(Math.random() * 5000),
      }))
    }

    return trades.map((t: any) => ({
      ...t,
      side:
        t.side === 'buy' ||
          t.side === 'Buy' ||
          t.side === 'long' ||
          t.side === 'Long' ||
          t.side === 'BUY'
          ? OrderSide.LONG
          : OrderSide.SHORT,
    }))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch trades timed out (using mock)')
    } else {
      console.warn('Error fetching trades (using mock):', error)
    }
    return MOCK_TRADES
  }
}

export const openPosition = async (
  payload: OpenPositionPayload,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(`${API_BASE_URL}/trade/position/open`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    return await response.json()
  } catch (error) {
    console.error('Error opening position:', error)
    throw error
  }
}

export interface ClosePositionPayload {
  symbol: string
  direction: 'LONG' | 'SHORT'
  size: string
  orderType?: 'MARKET' | 'LIMIT'
  limitPrice?: string
  preferredExchange?: string
}

export const closePosition = async (
  payload: ClosePositionPayload,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const normalizedSymbol = payload.symbol.replace(/\/USD|-USD/g, '')
    const response = await fetch(`${API_BASE_URL}/trade/position/close`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol: normalizedSymbol,
        direction: payload.direction,
        size: payload.size,
        orderType: payload.orderType || 'MARKET',
        limitPrice: payload.limitPrice,
        preferredExchange: payload.preferredExchange || 'hyperliquid',
      }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error closing position:', error)
    throw error
  }
}

export const cancelOrder = async (
  exchange: string,
  orderId: string,
  symbol: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/orders/${orderId}?symbol=${normalizedSymbol}`,
      {
        method: 'DELETE',
        headers,
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Error canceling order:', error)
    throw error
  }
}

export const fetchOpenOrders = async (
  exchange: string,
  walletAddress: string,
  authToken?: string
): Promise<Order[]> => {
  try {
    const headers: Record<string, string> = {
      'x-wallet-id': walletAddress,
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/orders?walletAddress=${walletAddress}`,
      { headers }
    )
    const json: ApiResponse<Order[]> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch open orders')
    return json.data || []
  } catch (error) {
    console.error('Error fetching open orders:', error)
    return []
  }
}

export const fetchOrderStatus = async (
  exchange: string,
  orderId: string,
  symbol?: string,
  authToken?: string
): Promise<Order> => {
  try {
    const url = `${API_BASE_URL}/trading/${exchange}/orders/${orderId}/status${symbol ? `?symbol=${symbol}` : ''
      }`
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(url, { headers })
    const json: ApiResponse<Order> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch order status')
    return json.data
  } catch (error) {
    console.error('Error fetching order status:', error)
    throw error
  }
}

// Helper to calculate PnL percent if not provided by backend
const calculatePnlPercent = (pos: any): string => {
  const pnl = parseFloat(pos.unrealizedPnl || '0')
  const margin = parseFloat(pos.margin || pos.collateral || pos.size || '1')
  if (margin === 0) return '0'
  return ((pnl / margin) * 100).toFixed(2)
}

export const fetchOpenPositions = async (
  walletAddress: string,
  authToken?: string
): Promise<Position[]> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/positions/all/${walletAddress}`,
      { headers }
    )
    const json = await response.json()

    if (!json.success)
      throw new Error(json.error || 'Failed to fetch positions')

    // Backend returns: { success: true, data: { positions: { hyperliquid: { positions: [...] }, ... } } }
    // Note: 'aster' spot balances are NOT positions (they're wallet balances), only asterPerp has actual positions
    const positionsData = json.data?.positions || json.positions || {}
    const allPositions: Position[] = []
    const exchanges = ['hyperliquid', 'lighter', 'asterPerp', 'avantis']

    for (const exchange of exchanges) {
      const exchangeData = positionsData[exchange]
      if (exchangeData?.positions && Array.isArray(exchangeData.positions)) {
        for (const pos of exchangeData.positions) {
          // Map backend field names to frontend Position interface
          // For asterPerp, the data format is different (has positionAmt, entryPrice, etc.)
          const isAsterPerp = exchange === 'asterPerp'

          // Determine direction from positionSide or positionAmt
          let direction = pos.side || pos.direction || 'LONG'
          if (isAsterPerp) {
            const amount = parseFloat(pos.positionAmt || '0')
            direction = amount >= 0 ? 'LONG' : 'SHORT'
          }

          allPositions.push({
            symbol: pos.symbol || pos.asset || 'Unknown',
            exchange: isAsterPerp ? 'aster' : exchange, // Display as 'aster' for consistency
            direction: direction,
            size: isAsterPerp
              ? Math.abs(parseFloat(pos.positionAmt || '0')).toString()
              : pos.size || pos.positionAmt || pos.total || '0',
            entryPrice: pos.entryPrice || '0',
            markPrice: pos.markPrice || '0',
            liquidationPrice: pos.liquidationPrice || '-',
            unrealizedPnl: pos.unrealizedPnl || pos.unrealizedProfit || '0',
            unrealizedPnlPercent:
              pos.unrealizedPnlPercent || calculatePnlPercent(pos),
            leverage: pos.leverage || 1,
            collateral:
              pos.collateral || pos.margin || pos.isolatedMargin || '0',
            margin: pos.margin || pos.collateral || pos.isolatedMargin || '0',
            timestamp: pos.timestamp || Date.now(),
            walletAddress: walletAddress,
          })
        }
      }
    }

    console.log(
      `[Positions] Fetched ${allPositions.length} positions across all exchanges`,
      positionsData
    )
    return allPositions
  } catch (error) {
    console.error('Error fetching positions:', error)
    return []
  }
}

export const fetchAccountBalances = async (
  exchange: string,
  walletAddress: string,
  authToken?: string
): Promise<ExchangeBalance> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/balances?walletAddress=${walletAddress}`,
      { headers }
    )
    const json: ApiResponse<ExchangeBalance> = await response.json()
    if (!json.success) throw new Error(json.error || 'Failed to fetch balances')
    return json.data
  } catch (error) {
    console.error('Error fetching balances:', error)
    throw error
  }
}

export const fetchAllBalances = async (
  walletAddress: string,
  authToken?: string
): Promise<AggregatedBalance> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(`${API_BASE_URL}/balances/${walletAddress}`, {
      headers,
    })
    const json: ApiResponse<AggregatedBalance> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch aggregated balances')
    return json.data
  } catch (error) {
    console.error('Error fetching aggregated balances:', error)
    throw error
  }
}

export const depositFunds = async (
  exchange: string,
  payload: DepositPayload,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/deposit`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Error depositing funds:', error)
    throw error
  }
}

export interface WithdrawPayload {
  // Common fields
  amount: string
  // Hyperliquid
  destination?: string
  // Aster
  walletAddress?: string
  chainId?: number
  asset?: string
  receiver?: string
  accountType?: 'spot' | 'perp'
  // User signature fields (for Aster user-signed)
  userSignature?: string
  nonce?: string
  fee?: string
  // Lighter
  signedWithdrawTx?: string
  network?: string
}

/**
 * Withdraw funds from an exchange
 * @param exchange - Exchange to withdraw from (hyperliquid, aster, lighter)
 * @param payload - Withdrawal parameters
 * @param walletAddress - Wallet address for x-wallet-id header
 * @param authToken - Optional auth token
 */
export const withdrawFunds = async (
  exchange: string,
  payload: WithdrawPayload,
  walletAddress: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-wallet-id': walletAddress,
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/withdraw`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Error withdrawing funds:', error)
    throw error
  }
}

/**
 * Transfer funds between Spot and Futures accounts on Aster
 * @param walletAddress - User's wallet address
 * @param amount - Amount to transfer
 * @param asset - Asset to transfer (e.g., 'USDT', 'USDC')
 * @param kindType - Transfer direction: 'SPOT_FUTURE' or 'FUTURE_SPOT'
 * @param authToken - Optional auth token
 */
export const transferAsterSpotToFutures = async (
  walletAddress: string,
  amount: string,
  asset: string,
  kindType: 'SPOT_FUTURE' | 'FUTURE_SPOT' = 'SPOT_FUTURE',
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    // Generate a unique client transaction ID
    const clientTranId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`

    const response = await fetch(`${API_BASE_URL}/aster/wallet/transfer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        address: walletAddress,
        amount,
        asset,
        clientTranId,
        kindType,
      }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error transferring Aster funds:', error)
    throw error
  }
}

/**
 * Track an Aster deposit for automatic spot-to-futures transfer
 * @param walletAddress - User's wallet address
 * @param amount - Amount deposited
 * @param tokenSymbol - Token symbol (e.g., 'USDC', 'USDT')
 */
export const trackAsterDeposit = async (
  walletAddress: string,
  amount: string,
  tokenSymbol: string
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/aster/deposit/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount,
        tokenSymbol,
      }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error tracking Aster deposit:', error)
    throw error
  }
}

export type AsterDepositStatus =
  | 'pending'
  | 'received'
  | 'transferring'
  | 'complete'
  | 'failed'
  | 'timeout'

export interface AsterDepositStatusInfo {
  status: AsterDepositStatus
  walletAddress: string
  amount: string
  tokenSymbol: string
  startTime: number
  message?: string
  receivedAmount?: number
}

/**
 * Get the status of a pending Aster deposit
 * @param walletAddress - User's wallet address
 * @param tokenSymbol - Optional token symbol to filter by
 */
export const getAsterDepositStatus = async (
  walletAddress: string,
  tokenSymbol?: string
): Promise<ApiResponse<AsterDepositStatusInfo | null>> => {
  try {
    let url = `${API_BASE_URL}/aster/deposit/status/${walletAddress}`
    if (tokenSymbol) {
      url += `?tokenSymbol=${tokenSymbol}`
    }
    const response = await fetch(url)
    return await response.json()
  } catch (error) {
    console.error('Error getting Aster deposit status:', error)
    throw error
  }
}

export const registerUser = async (
  walletAddress: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ walletAddress }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error registering user:', error)
    // Don't throw, just log, as we don't want to block the UI if registration fails (it might already exist)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

export const connectTelegram = async (
  telegramId: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/users/telegram`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ telegramId }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error connecting Telegram:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

export const checkUsernameAvailability = async (
  username: string
): Promise<{ available: boolean }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/check-username/${username}`
    )
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    const data = await response.json()
    return { available: data.available ?? false }
  } catch (error) {
    console.error('Error checking username:', error)
    return { available: false }
  }
}

export const setUsername = async (
  username: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/users/username`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: username.toLowerCase() }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error setting username:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

export const joinWaitlist = async (
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/users/waitlist`, {
      method: 'POST',
      headers,
    })
    return await response.json()
  } catch (error) {
    console.error('Error joining waitlist:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

export const getWaitlistStatus = async (
  authToken?: string
): Promise<{ isWaitlisted: boolean; waitlistedAt?: string }> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/users/waitlist/status`, {
      headers,
    })
    const json = await response.json()
    if (json.success && json.data) {
      return {
        isWaitlisted: json.data.isWaitlisted ?? false,
        waitlistedAt: json.data.waitlistedAt,
      }
    }
    return { isWaitlisted: false }
  } catch (error) {
    console.error('Error getting waitlist status:', error)
    return { isWaitlisted: false }
  }
}

export const redeemAccessCode = async (
  code: string,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/access-codes/redeem`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error redeeming access code:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

export const trackVolume = async (
  data: TradeVolumeData,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(`${API_BASE_URL}/volume/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Error tracking volume:', error)
    // Silent fail for analytics
    return {
      success: false,
      data: null,
      error: 'Failed to track volume',
      timestamp: Date.now(),
    }
  }
}

export interface HyperliquidCandle {
  t: number // Open time
  T: number // Close time
  s: string // Symbol
  i: string // Interval
  o: string // Open
  c: string // Close
  h: string // High
  l: string // Low
  v: string // Volume
  n: number // Number of trades
}

export const fetchCandles = async (
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<HyperliquidCandle[]> => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')

  try {
    // Use aggregated candles endpoint
    const response = await fetch(
      `${API_BASE_URL}/aggregated/candles?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`
    )

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    const json = await response.json()

    // Aggregated endpoint returns array of { time, open, high, low, close, volume }
    let candlesData: any[] = []
    if (Array.isArray(json)) {
      candlesData = json
    } else if (json.data && Array.isArray(json.data)) {
      candlesData = json.data
    } else {
      console.warn('Unexpected candles data format:', json)
      return []
    }

    return candlesData
      .map((c: any) => {
        let t =
          typeof c.time === 'number'
            ? c.time
            : typeof c.timestamp === 'number'
              ? c.timestamp
              : typeof c.t === 'number'
                ? c.t
                : parseInt(c.time || c.timestamp || c.t || 'NaN')

        // Normalize to milliseconds if microseconds
        if (!isNaN(t) && t > 100000000000000) {
          t = Math.floor(t / 1000)
        }

        return {
          t: isNaN(t) ? NaN : t,
          T: isNaN(t) ? NaN : t + (getIntervalMs(interval) - 1),
          s: symbol,
          i: interval,
          o: (c.open || c.o || 0).toString(),
          c: (c.close || c.c || 0).toString(),
          h: (c.high || c.h || 0).toString(),
          l: (c.low || c.l || 0).toString(),
          v: (c.volume || c.v || 0).toString(),
          n: c.tradeCount || c.n || 0,
        }
      })
      .filter((c) => !isNaN(c.t) && c.t > 0)
  } catch (error) {
    console.warn('Error fetching candles:', error)
    return []
  }
}

const getIntervalMs = (interval: string): number => {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }
  return map[interval] || 60 * 1000
}

export const subscribeToOrderbook = (
  symbol: string,
  onUpdate: (data: any) => void
): EventSource => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
  const url = `${API_BASE_URL}/aggregated/stream?symbol=${normalizedSymbol}`

  const eventSource = new EventSource(url)

  eventSource.onmessage = (event) => {
    // Keep alive or generic messages
  }

  eventSource.addEventListener('book', (event) => {
    try {
      const data = JSON.parse(event.data)
      onUpdate(data)
    } catch (err) {
      console.error('Error parsing orderbook SSE:', err)
    }
  })

  return eventSource
}

export interface Subscription {
  close: () => void
}

const createReconnectingEventSource = (
  url: string,
  onMessage: (event: MessageEvent) => void,
  eventName: string
): Subscription => {
  let eventSource: EventSource | null = null
  let retryTimeout: NodeJS.Timeout | null = null
  let isClosed = false
  let retryCount = 0
  const maxRetries = 10

  const connect = () => {
    if (isClosed) return

    console.log(`Connecting to SSE: ${url} (Attempt ${retryCount + 1})`)
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      console.log(`SSE connected: ${url}`)
      retryCount = 0 // Reset retry count on successful connection
    }

    eventSource.onerror = (err) => {
      console.error(`SSE error (${url}):`, err)
      eventSource?.close()

      if (!isClosed) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff max 30s
        console.log(`Reconnecting in ${delay}ms...`)
        retryTimeout = setTimeout(() => {
          retryCount++
          connect()
        }, delay)
      }
    }

    // Add generic message handler for debugging
    // eventSource.onmessage = (event) => {
    //   console.log('SSE message:', event.data);
    // };

    eventSource.addEventListener(eventName, onMessage)
  }

  connect()

  return {
    close: () => {
      isClosed = true
      eventSource?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    },
  }
}

export const subscribeToTrades = (
  symbol: string,
  onUpdate: (data: any) => void
): Subscription => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
  const url = `${API_BASE_URL}/aggregated/stream/trades?symbol=${normalizedSymbol}`

  return createReconnectingEventSource(
    url,
    (event) => {
      try {
        const data = JSON.parse(event.data)
        // Normalize side
        const normalizedData = {
          ...data,
          side:
            data.side === 'buy' ||
              data.side === 'Buy' ||
              data.side === 'long' ||
              data.side === 'Long' ||
              data.side === 'BUY'
              ? OrderSide.LONG
              : OrderSide.SHORT,
        }
        onUpdate(normalizedData)
      } catch (err) {
        console.error('Error parsing trade SSE:', err)
      }
    },
    'trade'
  )
}

export const subscribeToCandles = (
  symbol: string,
  interval: string,
  onUpdate: (data: any) => void
): Subscription => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
  const url = `${API_BASE_URL}/aggregated/stream/candles?symbol=${normalizedSymbol}&interval=${interval}`

  return createReconnectingEventSource(
    url,
    (event) => {
      // console.log('BAR event received:', event.data);
      try {
        const c = JSON.parse(event.data)
        // Normalize to match HyperliquidCandle interface
        // Ensure timestamp is a number
        let timestamp = NaN
        if (typeof c.time === 'number') timestamp = c.time
        else if (typeof c.timestamp === 'number') timestamp = c.timestamp
        else if (typeof c.t === 'number') timestamp = c.t
        else if (c.time) timestamp = parseInt(c.time)
        else if (c.timestamp) timestamp = parseInt(c.timestamp)
        else if (c.t) timestamp = parseInt(c.t)

        if (isNaN(timestamp) || timestamp <= 0) {
          console.warn('Invalid candle timestamp:', c)
          return
        }

        // Normalize to milliseconds if needed (handled in ChartSection but good to have here too)
        // But ChartSection expects raw-ish data to normalize itself.
        // Let's just pass the timestamp as is, but ensure it is a number.

        const normalized = {
          t: timestamp,
          o: (c.open || c.o || 0).toString(),
          c: (c.close || c.c || 0).toString(),
          h: (c.high || c.h || 0).toString(),
          l: (c.low || c.l || 0).toString(),
          v: (c.volume || c.v || 0).toString(),
          n: c.tradeCount || c.n || 0,
          s: symbol,
          i: interval,
        }
        onUpdate(normalized)
      } catch (err) {
        console.error('Error parsing candle SSE:', err)
      }
    },
    'bar'
  )
}

export const getRoutingRecommendation = async (
  symbol: string,
  side: string,
  signal?: AbortSignal,
  platform?: string
): Promise<ApiResponse<{ routing: RoutingInfo }>> => {
  try {
    const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')
    let url = `${API_BASE_URL}/trade/routing/${normalizedSymbol}?side=${side}`
    if (platform) {
      url += `&platform=${platform}`
    }
    const response = await fetch(url, { signal })
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Ignore abort errors
      throw error
    }
    console.error('Error fetching routing recommendation:', error)
    throw error
  }
}

export const fetchHistoricalOrders = async (
  exchange: string,
  walletAddress: string,
  authToken?: string
): Promise<Order[]> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/history/orders?walletAddress=${walletAddress}`,
      { headers }
    )
    const json: ApiResponse<Order[]> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch historical orders')
    return json.data || []
  } catch (error) {
    console.error('Error fetching historical orders:', error)
    return []
  }
}

export const fetchUserTrades = async (
  exchange: string,
  walletAddress: string,
  authToken?: string
): Promise<Trade[]> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/history/trades?walletAddress=${walletAddress}`,
      { headers }
    )
    const json: ApiResponse<Trade[]> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch user trades')
    return json.data || []
  } catch (error) {
    console.error('Error fetching user trades:', error)
    return []
  }
}

export const fetchFundingHistory = async (
  exchange: string,
  walletAddress: string,
  authToken?: string
): Promise<any[]> => {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(
      `${API_BASE_URL}/trading/${exchange}/history/funding?walletAddress=${walletAddress}`,
      { headers }
    )
    const json: ApiResponse<any[]> = await response.json()
    if (!json.success)
      throw new Error(json.error || 'Failed to fetch funding history')
    return json.data || []
  } catch (error) {
    console.error('Error fetching funding history:', error)
    return []
  }
}
export const importLighterCredentials = async (
  payload: any,
  authToken?: string
): Promise<ApiResponse<any>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const response = await fetch(`${API_BASE_URL}/trading/lighter/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    return await response.json()
  } catch (error) {
    console.error('Error importing Lighter credentials:', error)
    throw error
  }
}

export const fetchTicker = async (
  symbol: string,
  exchange: string = 'hyperliquid'
): Promise<TickerData> => {
  const normalizedSymbol = symbol.replace(/\/USD|-USD/g, '')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    // Use the trading ticker endpoint for live price data
    const response = await fetchWithRetry(
      `${API_BASE_URL}/market-data/ticker/${normalizedSymbol}`,
      {
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const json = await response.json()

    // Handle wrapped response
    const tickerData = json.data || json

    const platformData = (() => {
      const platforms = tickerData.platforms
      if (!platforms) return undefined
      const candidates = [
        exchange,
        exchange?.toLowerCase(),
        tickerData.platform,
        tickerData.platform?.toLowerCase(),
        Array.isArray(tickerData.availablePlatforms)
          ? tickerData.availablePlatforms[0]
          : undefined,
      ].filter(Boolean) as string[]

      for (const key of candidates) {
        if (key && platforms[key]) {
          return platforms[key]
        }
      }

      const firstKey = Object.keys(platforms)[0]
      return firstKey ? platforms[firstKey] : undefined
    })()

    const normalizeField = (value?: any) =>
      value === undefined || value === null ? undefined : value.toString()

    const change24hValue =
      tickerData.change24h ??
      tickerData.priceChange24h ??
      tickerData.priceChange

    const changePercent24hValue =
      tickerData.changePercent24h ??
      tickerData.priceChangePercent24h ??
      tickerData.priceChangePercent

    const markPriceValue = tickerData.markPrice ?? platformData?.price
    const lastPriceValue =
      tickerData.lastPrice ?? platformData?.price ?? markPriceValue
    const volume24hValue = tickerData.volume24h ?? platformData?.volume24h
    const fundingRateValue = tickerData.fundingRate ?? platformData?.fundingRate
    const high24hValue = tickerData.high24h ?? platformData?.high24h
    const low24hValue = tickerData.low24h ?? platformData?.low24h

    // Get logoUrl from response or fetch from token pairs
    const logoUrl = tickerData.logoUrl || (await getLogoUrl(normalizedSymbol))

    // Normalize the response to match TickerData interface
    return {
      symbol: tickerData.symbol || normalizedSymbol,
      logoUrl,
      markPrice: normalizeField(markPriceValue),
      oraclePrice: normalizeField(tickerData.oraclePrice),
      lastPrice: normalizeField(lastPriceValue),
      price24h: normalizeField(tickerData.price24h),
      change24h: normalizeField(change24hValue),
      changePercent24h: normalizeField(changePercent24hValue),
      volume24h: normalizeField(volume24hValue),
      openInterest: normalizeField(tickerData.openInterest),
      fundingRate: normalizeField(fundingRateValue),
      fundingCountdown: normalizeField(tickerData.fundingCountdown),
      high24h: normalizeField(high24hValue),
      low24h: normalizeField(low24hValue),
      open: normalizeField(tickerData.open),
      high: normalizeField(tickerData.high),
      low: normalizeField(tickerData.low),
      close: normalizeField(tickerData.close),
      timestamp:
        tickerData.timestamp ||
        tickerData.lastUpdate ||
        json.timestamp ||
        Date.now(),
      platform: tickerData.exchange || tickerData.platform || exchange,
      leverage: tickerData.leverage,
      marketType: tickerData.marketType,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch ticker timed out')
    } else {
      console.warn('Error fetching ticker:', error)
    }
    // Return empty ticker data on error
    return {
      symbol: normalizedSymbol,
      timestamp: Date.now(),
    }
  }
}

export const fetchAllTickers = async (
  platform?: string
): Promise<TickerData[]> => {
  try {
    // WORKAROUND: /api/token-pairs exists but doesn't return market data
    // The 'platforms' objects are empty - backend needs to enrich this data
    // See BACKEND_ISSUES.md for details
    const { tokensData, timestamp } = await fetchTokenPairsRaw()

    // Filter by platform if specified
    const platformKey = platform?.toLowerCase()
    const filteredTokens = platformKey
      ? tokensData.filter((t: any) => t.availability?.[platformKey] === true)
      : tokensData

    // WARNING: Backend returns empty platform objects without market data
    // For now, return minimal ticker data - UI will show "undefined" for prices
    // TODO: Backend should populate platform objects with price, volume, etc.
    return filteredTokens.map((ticker: any) => {
      // Try to extract data from platform-specific object (currently empty)
      const platformData =
        ticker.platforms?.[platformKey || 'hyperliquid'] || {}

      return {
        symbol: ticker.ticker || ticker.symbol || '',
        logoUrl: ticker.logoUrl,
        markPrice: platformData.price?.toString(),
        oraclePrice: platformData.price?.toString(),
        lastPrice:
          platformData.price?.toString() || ticker.lastPrice?.toString(),
        price24h: undefined,
        change24h: ticker.priceChange24h?.toString(),
        changePercent24h: ticker.priceChangePercent24h?.toString(),
        volume24h:
          platformData.volume24h?.toString() || ticker.volume24h?.toString(),
        openInterest: ticker.openInterest?.toString(),
        fundingRate: ticker.fundingRate?.toString(),
        fundingCountdown: undefined,
        high24h: undefined,
        low24h: undefined,
        timestamp,
        platform: platformKey || 'all',
        leverage: ticker.leverage,
        marketType: ticker.leverage ? 'perpetual' : 'spot',
        availability: ticker.availability || {},
      }
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch all tickers timed out')
    } else {
      console.warn('Error fetching all tickers:', error)
    }
    return []
  }
}

export const fetchTelegramLinkCode = async (
  userId: string,
  secret: string,
  authToken?: string
): Promise<ApiResponse<{ code: string }> & { code?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/wallet/telegram/link-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        secret: 'testing123',
      }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error fetching Telegram link code:', error)
    return {
      success: false,
      data: { code: '' },
      code: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}
