import { useState, useEffect, useCallback, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { fetchLighterPairPositions, type LighterPairPosition } from '@/services/pearApi';
import type { PearPosition } from '@/types/pear';

/**
 * Hook that fetches Lighter pair positions and normalizes them
 * to the PearPosition interface so PairPositionsTable can render them.
 * Uses deep-equality checks to avoid unnecessary re-renders.
 */
export function useLighterPairPositions(enabled: boolean) {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';

    const [positions, setPositions] = useState<PearPosition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const prevJson = useRef<string>('[]');
    const hasLoadedOnce = useRef(false);

    const refetch = useCallback(async () => {
        if (!walletAddress || !enabled) {
            if (prevJson.current !== '[]') {
                prevJson.current = '[]';
                setPositions([]);
            }
            return;
        }

        // Only show loading spinner on the very first fetch
        if (!hasLoadedOnce.current) {
            setIsLoading(true);
        }
        try {
            const raw = await fetchLighterPairPositions(walletAddress);
            const ACTIVE_STATUSES = ['open', 'partial', 'pending', 'closing'];
            const normalized = raw
                .map(normalizeLighterPosition)
                .filter(p => ACTIVE_STATUSES.includes(p.status));

            // Only update state when data has actually changed
            const json = JSON.stringify(normalized);
            if (json !== prevJson.current) {
                prevJson.current = json;
                setPositions(normalized);
            }
        } catch (err) {
            console.error('[useLighterPairPositions] fetch error:', err);
            if (prevJson.current !== '[]') {
                prevJson.current = '[]';
                setPositions([]);
            }
        } finally {
            hasLoadedOnce.current = true;
            setIsLoading(false);
        }
    }, [walletAddress, enabled]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // Poll every 15s when enabled
    useEffect(() => {
        if (!enabled || !walletAddress) return;
        const interval = setInterval(refetch, 15_000);
        return () => clearInterval(interval);
    }, [enabled, walletAddress, refetch]);

    return { positions, isLoading, refetch };
}

/**
 * Transform a Lighter PairPosition (from our DB) into PearPosition shape
 * so the shared PairPositionsTable can render it.
 */
function normalizeLighterPosition(pos: LighterPairPosition): PearPosition {
    const longLegs = pos.legs.filter(l => l.side === 'long');
    const shortLegs = pos.legs.filter(l => l.side === 'short');

    const usdValue = pos.usdValue ?? 0;
    const unrealizedPnl = pos.unrealizedPnl ?? 0;
    const unrealizedPnlPercent = usdValue > 0 ? (unrealizedPnl / usdValue) * 100 : 0;

    return {
        positionId: pos.id,
        longAssets: longLegs.map(l => ({
            asset: symbolToAsset(l.symbol),
            weight: l.weight ?? 1,
        })),
        shortAssets: shortLegs.map(l => ({
            asset: symbolToAsset(l.symbol),
            weight: l.weight ?? 1,
        })),
        entryRatio: pos.entryRatio ?? 0,
        markRatio: pos.markRatio ?? 0,
        unrealizedPnl,
        unrealizedPnlPercent,
        leverage: pos.leverage ?? 1,
        marginUsed: usdValue / (pos.leverage ?? 1),
        usdValue,
        status: pos.status,
        createdAt: new Date(pos.createdAt).getTime(),
    };
}

/** Extract base asset name from Lighter symbol, e.g. "BTCUSDT" → "BTC" */
function symbolToAsset(symbol: string): string {
    return symbol
        .replace(/USDT$/i, '')
        .replace(/-PERP$/i, '')
        .replace(/USD$/i, '')
        .trim() || symbol;
}
