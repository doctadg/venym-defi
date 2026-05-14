'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import PairOrderPanel from '../pear/PairOrderPanel';
import PairPositionsTable from '../pear/PairPositionsTable';
import { useHyperliquidSetup } from '@/hooks/useHyperliquidSetup';
import { useLighterSetup } from '@/hooks/useLighterSetup';
import { useLighterPairPositions } from '@/hooks/useLighterPairPositions';
import { usePearMarkets } from '@/hooks/usePearMarkets';
import { useBalances } from '@/hooks/useBalances';
import { closeLighterPairPosition } from '@/services/pearApi';
import type { PearMarket } from '@/types/pear';

type MobileTab = 'market' | 'trade' | 'positions';

const MobilePairTrade: React.FC = () => {
    const [activeTab, setActiveTab] = useState<MobileTab>('market');
    const [selectedMarket, setSelectedMarket] = useState<PearMarket | null>(null);

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
        isLoading: marketsLoading,
        searchMarkets,
    } = usePearMarkets();

    // Check API keys on mount
    useEffect(() => {
        if (walletAddress) {
            hlSetup.checkApiKey();
            lighterSetup.checkApiKey();
        }
    }, [walletAddress, hlSetup.checkApiKey, lighterSetup.checkApiKey]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PearMarket[]>([]);

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            searchMarkets(query);
        }
    }, [searchMarkets]);

    const handleSelectPair = useCallback((market: PearMarket) => {
        setSelectedMarket(market);
        setActiveTab('trade');
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

    const displayMarkets = searchQuery.trim()
        ? searchResults
        : activeMarkets?.active?.slice(0, 20) || [];

    const tabs = [
        { key: 'market' as MobileTab, label: 'Pairs', count: displayMarkets.length },
        { key: 'trade' as MobileTab, label: 'Trade', count: 0 },
        { key: 'positions' as MobileTab, label: 'Positions', count: positions.length },
    ];

    return (
        <div className="flex flex-col h-full bg-bg">
            {/* Selected Pair Header */}
            {selectedMarket && (
                <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border">
                    <span className="text-white font-sans font-semibold text-sm">
                        {selectedMarket.longAssets.map(a => a.asset).join('+')} / {selectedMarket.shortAssets.map(a => a.asset).join('+')}
                    </span>
                    <span className="text-brand-textGray text-xs font-sans">
                        {selectedMarket.ratio.toFixed(4)}
                    </span>
                    <span className={`text-xs font-sans ml-auto ${selectedMarket.change24h >= 0 ? 'text-brand-green' : 'text-brand-red'
                        }`}>
                        {selectedMarket.change24h >= 0 ? '+' : ''}{selectedMarket.change24h.toFixed(2)}%
                    </span>
                </div>
            )}

            {/* Tab Bar */}
            <div className="flex border-b border-border bg-bg-panel">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-3 text-xs font-sans font-medium text-center transition-colors relative ${activeTab === tab.key ? 'text-[rgba(255,255,255,0.9)]' : 'text-brand-textGray'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
                        )}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgba(255,255,255,0.9)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'market' && (
                    <div className="p-3 flex flex-col gap-2">
                        {/* Search */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search pairs..."
                            className="w-full px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-white placeholder:text-brand-textGray font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)]"
                        />

                        {/* Market List */}
                        {marketsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-[rgba(255,255,255,0.9)]/30 border-t-[rgba(255,255,255,0.9)] rounded-full animate-spin" />
                            </div>
                        ) : displayMarkets.length === 0 ? (
                            <div className="text-center py-12 text-brand-textGray text-xs font-sans">
                                No pairs found
                            </div>
                        ) : (
                            displayMarkets.map((market) => {
                                const longLabel = market.longAssets.map(a => a.asset).join('+');
                                const shortLabel = market.shortAssets.map(a => a.asset).join('+');
                                const isPositive = market.change24h >= 0;
                                const isSelected = market.id === selectedMarket?.id;

                                return (
                                    <button
                                        key={market.id}
                                        onClick={() => handleSelectPair(market)}
                                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${isSelected
                                            ? 'bg-[rgba(255,255,255,0.9)]/10 border border-[rgba(255,255,255,0.9)]/30'
                                            : 'bg-bg-panel border border-border hover:bg-white/[0.03]'
                                            }`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-white font-sans text-sm font-medium">
                                                {longLabel} / {shortLabel}
                                            </span>
                                            <span className="text-brand-textGray text-[11px] font-sans">
                                                Ratio: {market.ratio.toFixed(4)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-sans font-medium ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                                            </span>
                                            <span className="text-brand-textGray text-[11px] font-sans">
                                                Vol: ${formatCompact(market.volume24h)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'trade' && (
                    <div className="p-3 h-full">
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
                )}

                {activeTab === 'positions' && (
                    <div className="p-3 h-full">
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
                )}
            </div>
        </div>
    );
};

function formatCompact(num: number): string {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
}

export default MobilePairTrade;
