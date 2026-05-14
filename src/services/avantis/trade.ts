/**
 * Avantis Trade Service
 * Client-side smart contract interactions for Avantis on Base mainnet.
 * All transactions are signed by the user's wallet via viem WalletClient.
 */

import {
    createPublicClient,
    http,
    parseUnits,
    type WalletClient,
} from 'viem';
import { base } from 'viem/chains';
import {
    AVANTIS_CONTRACTS,
    TRADING_ABI,
    TRADING_STORAGE_ABI,
    ERC20_ABI,
    PAIR_INDEX_MAP,
    INDEX_TO_SYMBOL,
    USDC_DECIMALS,
    DEFAULT_SLIPPAGE,
    DEFAULT_EXECUTION_FEE,
    AvantisOrderType,
    PAIR_MAX_LEVERAGE,
    ZFP_SUPPORTED_PAIRS,
    ZFP_MIN_LEVERAGE,
    ZFP_MAX_LEVERAGE,
} from './constants';

// ============= PUBLIC CLIENT (read-only) =============

// Use a reliable public Base RPC. The bare http() viem default is flaky and
// often returns 0 / times out, causing the "$0 available margin" bug.
const BASE_RPC_URL =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    'https://mainnet.base.org';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
}) as any;

// ============= TYPES =============

export interface AvantisTradeParams {
    symbol: string;
    direction: 'LONG' | 'SHORT';
    positionSizeUsd: string;
    leverage: number;
    tp?: string;
    sl?: string;
    openPrice: string;
    slippagePercent?: number;
    orderType?: 'MARKET' | 'LIMIT' | 'STOP_LIMIT' | 'MARKET_ZERO_FEE';
}

export interface AvantisCloseParams {
    pairIndex: number;
    tradeIndex: number;
}

export interface AvantisPosition {
    trader: string;
    pairIndex: number;
    index: number;
    symbol: string;
    positionSizeDai: string;
    openPrice: string;
    buy: boolean;
    leverage: number;
    tp: string;
    sl: string;
    liquidationPrice?: string;
    openedAt?: number;
    isZfp?: boolean;
}

export interface AvantisTradeResult {
    txHash: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    size: string;
    leverage: number;
}

// ============= HELPER FUNCTIONS =============

function getPairIndex(symbol: string): number {
    const normalized = symbol.replace(/\/USD$|-USD$|USDT$|USD$/, '').toUpperCase();
    const index = PAIR_INDEX_MAP[normalized];
    if (index === undefined) {
        throw new Error(`Unsupported Avantis pair: ${symbol}. Supported: ${Object.keys(PAIR_INDEX_MAP).join(', ')}`);
    }
    return index;
}

function priceToContract(price: string): bigint {
    const priceNum = parseFloat(price);
    return BigInt(Math.round(priceNum * 1e10));
}

function leverageToContract(leverage: number): bigint {
    return BigInt(Math.round(leverage * 1e10));
}

function contractToPrice(value: bigint): string {
    return (Number(value) / 1e10).toString();
}

function resolveOrderType(orderType: AvantisTradeParams['orderType']): number {
    switch (orderType) {
        case 'LIMIT': return AvantisOrderType.LIMIT;
        case 'STOP_LIMIT': return AvantisOrderType.STOP_LIMIT;
        case 'MARKET_ZERO_FEE': return AvantisOrderType.MARKET_ZERO_FEE;
        default: return AvantisOrderType.MARKET;
    }
}

function normalizeSymbol(symbol: string): string {
    return symbol.replace(/\/USD$|-USD$|USDT$|USD$/, '').toUpperCase();
}

function validateLeverage(symbol: string, leverage: number, orderType: AvantisTradeParams['orderType']): void {
    const normalized = normalizeSymbol(symbol);
    const isZfp = orderType === 'MARKET_ZERO_FEE';

    if (isZfp) {
        if (!(ZFP_SUPPORTED_PAIRS as readonly string[]).includes(normalized)) {
            throw new Error(
                `Zero Fee Perps only available for: ${ZFP_SUPPORTED_PAIRS.join(', ')}. ` +
                `${normalized} is not supported.`
            );
        }
        if (leverage < ZFP_MIN_LEVERAGE || leverage > ZFP_MAX_LEVERAGE) {
            throw new Error(
                `ZFP leverage must be ${ZFP_MIN_LEVERAGE}x-${ZFP_MAX_LEVERAGE}x. ` +
                `You selected ${leverage}x.`
            );
        }
    } else {
        const maxLev = PAIR_MAX_LEVERAGE[normalized];
        if (maxLev !== undefined && leverage > maxLev) {
            throw new Error(
                `Max leverage for ${normalized} is ${maxLev}x. ` +
                `You selected ${leverage}x. Use MARKET_ZERO_FEE for up to ${ZFP_MAX_LEVERAGE}x.`
            );
        }
    }
}

// ============= TRADE FUNCTIONS =============

export async function openAvantisTrade(
    walletClient: WalletClient,
    params: AvantisTradeParams
): Promise<AvantisTradeResult> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    const pairIndex = getPairIndex(params.symbol);
    const isBuy = params.direction === 'LONG';

    validateLeverage(params.symbol, params.leverage, params.orderType);

    const positionSizeDai = parseUnits(params.positionSizeUsd, USDC_DECIMALS);
    const openPrice = priceToContract(params.openPrice);
    const leverage = leverageToContract(params.leverage);
    const tp = params.tp ? priceToContract(params.tp) : BigInt(0);
    const sl = params.sl ? priceToContract(params.sl) : BigInt(0);
    const slippageP = params.slippagePercent
        ? BigInt(Math.round(params.slippagePercent * 1e10))
        : DEFAULT_SLIPPAGE;

    const orderType = resolveOrderType(params.orderType);

    const trade = {
        trader: account.address,
        pairIndex: BigInt(pairIndex),
        index: BigInt(0),
        initialPosToken: BigInt(0),
        positionSizeUSDC: positionSizeDai,
        openPrice,
        buy: isBuy,
        leverage,
        tp,
        sl,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
    };

    const MIN_NOTIONAL_USDC = 100;
    const collateralUsd = Number(positionSizeDai) / 1e6;
    const leverageNum = Number(leverage) / 1e10;
    const notionalUsd = collateralUsd * leverageNum;
    if (notionalUsd < MIN_NOTIONAL_USDC) {
        throw new Error(
            `Avantis requires a minimum position of $${MIN_NOTIONAL_USDC} (after leverage). ` +
            `Your position is $${notionalUsd.toFixed(2)} ($${collateralUsd.toFixed(2)} x ${leverageNum}x). ` +
            `Increase your size or leverage.`
        );
    }

    await ensureUsdcApproval(walletClient, account.address, positionSizeDai);

    const txHash = await walletClient.writeContract({
        address: AVANTIS_CONTRACTS.Trading,
        abi: TRADING_ABI,
        functionName: 'openTrade',
        args: [trade, orderType, slippageP],
        value: DEFAULT_EXECUTION_FEE,
        chain: base,
        account,
    });

    return {
        txHash,
        symbol: params.symbol,
        direction: params.direction,
        size: params.positionSizeUsd,
        leverage: params.leverage,
    };
}

export async function closeAvantisTrade(
    walletClient: WalletClient,
    params: AvantisCloseParams & { closeAmountUsdc?: string }
): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    let closeAmount: bigint;
    if (params.closeAmountUsdc) {
        closeAmount = parseUnits(params.closeAmountUsdc, USDC_DECIMALS);
    } else {
        const trade = await publicClient.readContract({
            address: AVANTIS_CONTRACTS.TradingStorage,
            abi: TRADING_STORAGE_ABI,
            functionName: 'openTrades',
            args: [account.address, BigInt(params.pairIndex), BigInt(params.tradeIndex)],
        });
        closeAmount = (trade as any).initialPosToken;
    }

    const txHash = await walletClient.writeContract({
        address: AVANTIS_CONTRACTS.Trading,
        abi: TRADING_ABI,
        functionName: 'closeTradeMarket',
        args: [BigInt(params.pairIndex), BigInt(params.tradeIndex), closeAmount],
        value: DEFAULT_EXECUTION_FEE,
        chain: base,
        account,
    });

    return txHash;
}

export async function closeAvantisTradeBySymbol(
    walletClient: WalletClient,
    symbol: string,
    direction: 'LONG' | 'SHORT'
): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    const pairIndex = getPairIndex(symbol);
    const isBuy = direction === 'LONG';

    const count = await publicClient.readContract({
        address: AVANTIS_CONTRACTS.TradingStorage,
        abi: TRADING_STORAGE_ABI,
        functionName: 'openTradesCount',
        args: [account.address, BigInt(pairIndex)],
    });

    const tradeCount = Number(count);
    if (tradeCount === 0) {
        throw new Error(`No open ${direction} position found for ${symbol}`);
    }

    for (let i = 0; i < tradeCount; i++) {
        const trade = await publicClient.readContract({
            address: AVANTIS_CONTRACTS.TradingStorage,
            abi: TRADING_STORAGE_ABI,
            functionName: 'openTrades',
            args: [account.address, BigInt(pairIndex), BigInt(i)],
        });

        if (trade.trader === '0x0000000000000000000000000000000000000000') continue;
        if (trade.buy !== isBuy) continue;

        return closeAvantisTrade(walletClient, { pairIndex, tradeIndex: i });
    }

    throw new Error(`No open ${direction} position found for ${symbol}`);
}

// ============= APPROVAL =============

async function ensureUsdcApproval(
    walletClient: WalletClient,
    owner: `0x${string}`,
    amount: bigint
): Promise<void> {
    const allowance = await publicClient.readContract({
        address: AVANTIS_CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, AVANTIS_CONTRACTS.TradingStorage],
    });

    if (allowance < amount) {
        const maxApproval = BigInt(2) ** BigInt(256) - BigInt(1);
        const account = walletClient.account;
        if (!account) throw new Error('Wallet not connected');

        await walletClient.writeContract({
            address: AVANTIS_CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [AVANTIS_CONTRACTS.TradingStorage, maxApproval],
            chain: base,
            account,
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
}

export { getPairIndex, INDEX_TO_SYMBOL };
