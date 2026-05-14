/**
 * Avantis Protocol Constants
 * Base Mainnet contract addresses, ABIs, and pair index mapping
 */

// ============= CONTRACT ADDRESSES (Base Mainnet) =============

export const AVANTIS_CONTRACTS = {
    Trading: '0x44914408af82bC9983bbb330e3578E1105e11d4e' as `0x${string}`,
    TradingStorage: '0x8a311D7048c35985aa31C131B9A13e03a5f7422d' as `0x${string}`,
    PairStorage: '0x5db3772136e5557EFE028Db05EE95C84D76faEC4' as `0x${string}`,
    PairInfos: '0x81F22d0Cc22977c91bEfE648C9fddf1f2bd977e5' as `0x${string}`,
    PriceAggregator: '0x64e2625621970F8cfA17B294670d61CB883dA511' as `0x${string}`,
    Multicall: '0xb7125506Ff25211c4C51DFD8DdED00BE6Fa8Cbf7' as `0x${string}`,
    Referral: '0x1A110bBA13A1f16cCa4b79758BD39290f29De82D' as `0x${string}`,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
} as const;

// Base Mainnet chain ID
export const BASE_CHAIN_ID = 8453;

// ============= ABI FRAGMENTS =============

export const TRADING_ABI = [
    {
        name: 'openTrade',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                name: 't',
                type: 'tuple',
                components: [
                    { name: 'trader', type: 'address' },
                    { name: 'pairIndex', type: 'uint256' },
                    { name: 'index', type: 'uint256' },
                    { name: 'initialPosToken', type: 'uint256' },
                    { name: 'positionSizeUSDC', type: 'uint256' },
                    { name: 'openPrice', type: 'uint256' },
                    { name: 'buy', type: 'bool' },
                    { name: 'leverage', type: 'uint256' },
                    { name: 'tp', type: 'uint256' },
                    { name: 'sl', type: 'uint256' },
                    { name: 'timestamp', type: 'uint256' },
                ],
            },
            { name: '_type', type: 'uint8' },
            { name: '_slippageP', type: 'uint256' },
        ],
        outputs: [{ name: 'orderId', type: 'uint256' }],
    },
    {
        name: 'closeTradeMarket',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: '_pairIndex', type: 'uint256' },
            { name: '_index', type: 'uint256' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [{ name: 'orderId', type: 'uint256' }],
    },
    {
        name: 'updateTp',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'pairIndex', type: 'uint256' },
            { name: 'index', type: 'uint256' },
            { name: 'newTp', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'updateSl',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'pairIndex', type: 'uint256' },
            { name: 'index', type: 'uint256' },
            { name: 'newSl', type: 'uint256' },
        ],
        outputs: [],
    },
] as const;

export const TRADING_STORAGE_ABI = [
    {
        name: 'openTrades',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_trader', type: 'address' },
            { name: '_pairIndex', type: 'uint256' },
            { name: '_index', type: 'uint256' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'trader', type: 'address' },
                    { name: 'pairIndex', type: 'uint256' },
                    { name: 'index', type: 'uint256' },
                    { name: 'initialPosToken', type: 'uint256' },
                    { name: 'positionSizeUSDC', type: 'uint256' },
                    { name: 'openPrice', type: 'uint256' },
                    { name: 'buy', type: 'bool' },
                    { name: 'leverage', type: 'uint256' },
                    { name: 'tp', type: 'uint256' },
                    { name: 'sl', type: 'uint256' },
                    // Note: timestamp is NOT stored on-chain.
                    // It's only used as input to openTrade for request validation.
                ],
            },
        ],
    },
    {
        name: 'openTradesCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'trader', type: 'address' },
            { name: 'pairIndex', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'openTradesInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'trader', type: 'address' },
            { name: 'pairIndex', type: 'uint256' },
            { name: 'index', type: 'uint256' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'tokenPriceDai', type: 'uint256' },
                    { name: 'openInterestDai', type: 'uint256' },
                    { name: 'tpLastUpdated', type: 'uint256' },
                    { name: 'slLastUpdated', type: 'uint256' },
                    { name: 'beingMarketClosed', type: 'bool' },
                ],
            },
        ],
    },
] as const;

export const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// ============= PAIR INDEX MAPPING =============
// Avantis uses numeric pair indices instead of string symbols

export const PAIR_INDEX_MAP: Record<string, number> = {
    // Verified from https://socket-api-pub.avantisfi.com/socket-api/v1/data
    ETH: 0,
    BTC: 1,
    SOL: 2,
    BNB: 3,
    ARB: 4,
    DOGE: 5,
    AVAX: 6,
    OP: 7,
    POL: 8,   // formerly MATIC
    TIA: 9,
    SEI: 10,
    XAU: 21,  // Gold
    SHIB: 22,
    PEPE: 23,
    BONK: 24,
    WIF: 25,
    RENDER: 26,
    WLD: 27,
    LINK: 41,
    NEAR: 43,
    AAVE: 48,
    APT: 57,
    XRP: 59,
};

/**
 * Max leverage per pair for REGULAR market orders (not ZFP).
 * Source: https://socket-api-pub.avantisfi.com/socket-api/v1/data (pairInfos.leverages.maxLeverage)
 * Verified via on-chain simulation (LEVERAGE_INCORRECT revert above these values).
 */
export const PAIR_MAX_LEVERAGE: Record<string, number> = {
    ETH: 75, BTC: 75, SOL: 75, BNB: 40, ARB: 20,
    DOGE: 20, AVAX: 20, OP: 10, POL: 20, TIA: 20,
    SEI: 20, XAU: 75, SHIB: 20, PEPE: 20, BONK: 20,
    WIF: 20, RENDER: 10, WLD: 10, LINK: 20, NEAR: 20,
    AAVE: 20, APT: 15, XRP: 75,
};

/**
 * Pairs that support Zero Fee Perps (ZFP) with MARKET_ZERO_FEE order type.
 * ZFP offers 75x-250x leverage on these pairs.
 * Source: https://docs.avantisfi.com (Zero-Fee Perpetuals section)
 */
export const ZFP_SUPPORTED_PAIRS = ['ETH', 'BTC', 'SOL'] as const;

/** Min/Max leverage for ZFP orders */
export const ZFP_MIN_LEVERAGE = 75;
export const ZFP_MAX_LEVERAGE = 250;

// Reverse mapping: pairIndex → symbol
export const INDEX_TO_SYMBOL: Record<number, string> = Object.fromEntries(
    Object.entries(PAIR_INDEX_MAP).map(([symbol, index]) => [index, symbol])
);

// ============= PRECISION CONSTANTS =============

/** USDC amounts use 6 decimals */
export const USDC_DECIMALS = 6;

/** Prices use 10 decimals (1e10) */
export const PRICE_PRECISION = BigInt(10) ** BigInt(10);

/** Leverage uses 10 decimals (1e10), e.g., 2x = 20000000000 */
export const LEVERAGE_PRECISION = BigInt(10) ** BigInt(10);

/** Percentages use 10 decimals (1e10), e.g., 1% = 1e10 */
export const PERCENTAGE_PRECISION = BigInt(10) ** BigInt(10);

/** Default slippage: 1% = 1e10 */
export const DEFAULT_SLIPPAGE = PERCENTAGE_PRECISION;

/** Default execution fee in wei (~0.00035 ETH) */
export const DEFAULT_EXECUTION_FEE = BigInt('350000000000000'); // 0.00035 ETH

// ============= BASE BUILDER CODE (ERC-8021) =============

/** Builder Code for Base transaction attribution via dataSuffix */
export const BASE_BUILDER_CODE = 'bc_kean7mka';

// ============= ORDER TYPES =============

export enum AvantisOrderType {
    MARKET = 0,
    STOP_LIMIT = 1,
    LIMIT = 2,
    MARKET_ZERO_FEE = 3,
}
