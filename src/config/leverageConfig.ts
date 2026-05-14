import { DexMode } from '../contexts/DexModeContext';
import { PAIR_MAX_LEVERAGE, ZFP_SUPPORTED_PAIRS, ZFP_MIN_LEVERAGE, ZFP_MAX_LEVERAGE } from '../services/avantis/constants';

export interface PlatformLeverageConfig {
    maxLeverage: number;
    defaultLeverage: number;
    presets: number[];
    label: string;
}

/**
 * Leverage configurations per platform.
 *
 * - Hyperliquid: up to 40x (asset-dependent, range 3x–40x)
 * - Aster: up to 100x
 * - Lighter: up to 50x on BTC/ETH; lower on other markets
 * - Pacifica: up to 50x (varies 3x–50x by market)
 * - Avantis: 5x–75x regular (pair-dependent), 75x–250x with ZFP (ETH/BTC/SOL only)
 *
 * The 'auto' mode defaults to hyperliquid limits.
 */
export const PLATFORM_LEVERAGE: Record<DexMode, PlatformLeverageConfig> = {
    auto: {
        maxLeverage: 40,
        defaultLeverage: 10,
        presets: [1, 5, 10, 20, 30, 40],
        label: 'Hyperliquid',
    },
    hyperliquid: {
        maxLeverage: 40,
        defaultLeverage: 10,
        presets: [1, 5, 10, 20, 30, 40],
        label: 'Hyperliquid',
    },
    aster: {
        maxLeverage: 100,
        defaultLeverage: 10,
        presets: [1, 5, 10, 25, 50, 75, 100],
        label: 'Aster',
    },
    lighter: {
        maxLeverage: 50,
        defaultLeverage: 10,
        presets: [1, 5, 10, 20, 30, 50],
        label: 'Lighter',
    },
    pacifica: {
        maxLeverage: 50,
        defaultLeverage: 10,
        presets: [1, 5, 10, 20, 30, 50],
        label: 'Pacifica',
    },
    avantis: {
        maxLeverage: 250,
        defaultLeverage: 10,
        presets: [1, 5, 10, 25, 50, 75, 100, 150, 250],
        label: 'Avantis',
    },
};

export function getLeverageConfig(mode: DexMode): PlatformLeverageConfig {
    return PLATFORM_LEVERAGE[mode] || PLATFORM_LEVERAGE.auto;
}

export function clampLeverage(leverage: number, mode: DexMode): number {
    const config = getLeverageConfig(mode);
    return Math.max(1, Math.min(leverage, config.maxLeverage));
}

export function normalizeSymbol(symbol: string): string {
    return symbol.replace(/\/USD$|-USD$|USDT$|USD$/, '').toUpperCase();
}

/**
 * Get the max leverage for an Avantis pair, accounting for ZFP mode.
 */
export function getAvantisMaxLeverage(symbol: string, isZfp: boolean): number {
    const normalized = normalizeSymbol(symbol);
    if (isZfp) {
        if (!(ZFP_SUPPORTED_PAIRS as readonly string[]).includes(normalized)) return 0;
        return ZFP_MAX_LEVERAGE;
    }
    return PAIR_MAX_LEVERAGE[normalized] ?? 75;
}

/**
 * Get the min leverage for an Avantis pair, accounting for ZFP mode.
 */
export function getAvantisMinLeverage(symbol: string, isZfp: boolean): number {
    if (isZfp) {
        const normalized = normalizeSymbol(symbol);
        if (!(ZFP_SUPPORTED_PAIRS as readonly string[]).includes(normalized)) return 0;
        return ZFP_MIN_LEVERAGE;
    }
    return 1;
}

/**
 * Check if a symbol supports ZFP on Avantis.
 */
export function isZfpSupported(symbol: string): boolean {
    const normalized = normalizeSymbol(symbol);
    return (ZFP_SUPPORTED_PAIRS as readonly string[]).includes(normalized);
}
