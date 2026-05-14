'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import PairPriceHeader from './pear/PairPriceHeader';
import PairOrderPanel from './pear/PairOrderPanel';
import PairPositionsTable from './pear/PairPositionsTable';
import PairRatioChart from './pear/PairRatioChart';
import { useHyperliquidSetup } from '@/hooks/useHyperliquidSetup';
import { useLighterSetup } from '@/hooks/useLighterSetup';
import { useLighterPairPositions } from '@/hooks/useLighterPairPositions';
import { usePearMarkets } from '@/hooks/usePearMarkets';
import { useBalances } from '@/hooks/useBalances';
import { closeLighterPairPosition } from '@/services/pearApi';
import type { PearMarket } from '@/types/pear';

/**
 * Main Pair Trading view — equivalent to Trade.tsx but for pair/basket trades.
 *
 * All positions come from our backend (pair_positions DB table) which handles
 * both Hyperliquid and Lighter venues. No Pear Protocol API for positions.
 */
const PairTrade: React.FC = () => {
    const [selectedMarket, setSelectedMarket] = useState<PearMarket | null>(null);

    // Hooks
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';

    // Use the same Hyperliquid/Lighter approval flow as normal trading
    const hlSetup = useHyperliquidSetup();
    const lighterSetup = useLighterSetup();
    const { balanceData, loading: balanceLoading } = useBalances(walletAddress);

    const { positions, isLoading: positionsLoading, refetch } =
        useLighterPairPositions(true);
    const {
        activeMarkets,
        searchResults,
        isLoading: marketsLoading,
        isSearching,
        searchMarkets,
    } = usePearMarkets();

    // Check API keys on mount
    useEffect(() => {
        if (walletAddress) {
            hlSetup.checkApiKey();
            lighterSetup.checkApiKey();
        }
    }, [walletAddress, hlSetup.checkApiKey, lighterSetup.checkApiKey]);

    // Handle pair selection
    const handleSelectPair = useCallback((market: PearMarket) => {
        setSelectedMarket(market);
    }, []);

    // Handle close position — all positions go through our backend API
    const handleClosePosition = useCallback(
        async (positionId: string) => {
            await closeLighterPairPosition(walletAddress, positionId);
            refetch();
        },
        [walletAddress, refetch]
    );

    // Handle close all — close each position via our backend
    const handleCloseAll = useCallback(async () => {
        await Promise.allSettled(
            positions.map(p => closeLighterPairPosition(walletAddress, p.positionId))
        );
        refetch();
    }, [walletAddress, positions, refetch]);

    return (
        <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden gap-3 p-3 lg:p-4 h-full">
            {/* LEFT: Chart + Positions */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
                {/* Price Header with Pair Selector Dropdown */}
                <PairPriceHeader
                    market={selectedMarket}
                    activeMarkets={activeMarkets}
                    searchResults={searchResults}
                    isLoading={marketsLoading}
                    isSearching={isSearching}
                    onSearch={searchMarkets}
                    onSelectPair={handleSelectPair}
                    selectedPairId={selectedMarket?.id}
                />

                {/* Chart Area */}
                <div className="flex-1 bg-bg-panel rounded-lg border border-border min-h-[300px] overflow-hidden">
                    {selectedMarket ? (
                        <PairRatioChart marketId={selectedMarket.id} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="text-brand-textGray"
                                    >
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                </div>
                                <p className="text-brand-textGray text-xs font-sans">
                                    Select a pair to view ratio chart
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Positions Table */}
                <div className="h-[240px] lg:h-[280px] flex-shrink-0">
                    <PairPositionsTable
                        positions={positions}
                        openOrders={[]}
                        twapOrders={[]}
                        isLoading={positionsLoading}
                        onClosePosition={handleClosePosition}
                        onCloseAll={handleCloseAll}
                        onCancelOrder={() => { }}
                        onCancelTwap={() => { }}
                    />
                </div>
            </div>

            {/* RIGHT: Order Panel */}
            <div className="flex-none w-full lg:w-[320px] h-full">
                <PairOrderPanel
                    market={selectedMarket}
                    isReady={hlSetup.hasApiKey === true}
                    isBusy={hlSetup.isApproving || hlSetup.isLoading}
                    onEnableTrading={hlSetup.enableTrading}
                    onSubmitOrder={async () => { }}
                    error={hlSetup.error}
                    isLighterReady={lighterSetup.hasApiKey === true}
                    lighterWalletAddress={walletAddress}
                    balanceData={balanceData}
                    balanceLoading={balanceLoading}
                />
            </div>
        </div>
    );
};

export default PairTrade;
