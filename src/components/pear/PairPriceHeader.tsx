'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { PearMarket, PearActiveMarkets } from '@/types/pear';
import { fetchPearMarkets } from '@/services/pearApi';

interface PairPriceHeaderProps {
    market: PearMarket | null;
    // Dropdown / explorer props
    activeMarkets: PearActiveMarkets | null;
    searchResults: PearMarket[];
    isLoading: boolean;
    isSearching: boolean;
    onSearch: (query: string) => void;
    onSelectPair: (market: PearMarket) => void;
    selectedPairId?: string;
}

type MarketSection = 'all' | 'trending' | 'gainers' | 'losers';

/**
 * Displays ratio stats for the active pair + a dropdown market explorer.
 */
const PairPriceHeader: React.FC<PairPriceHeaderProps> = ({
    market,
    activeMarkets,
    searchResults,
    isLoading,
    isSearching,
    onSearch,
    onSelectPair,
    selectedPairId,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<MarketSection>('all');
    const [allMarkets, setAllMarkets] = useState<PearMarket[]>([]);
    const [allMarketsLoading, setAllMarketsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDropdownOpen]);

    // Fetch full list when "All" tab is activated or dropdown opens
    useEffect(() => {
        if (!isDropdownOpen || allMarkets.length > 0) return;
        let cancelled = false;
        setAllMarketsLoading(true);
        fetchPearMarkets({ limit: 200 })
            .then((data) => {
                if (!cancelled) setAllMarkets(data.markets);
            })
            .catch((err) => console.error('[PairPriceHeader] All markets error:', err))
            .finally(() => { if (!cancelled) setAllMarketsLoading(false); });
        return () => { cancelled = true; };
    }, [isDropdownOpen, allMarkets.length]);

    // Focus search on dropdown open
    useEffect(() => {
        if (isDropdownOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        } else {
            setSearchQuery('');
        }
    }, [isDropdownOpen]);

    const handleSearch = useCallback((value: string) => {
        setSearchQuery(value);
        onSearch(value);
    }, [onSearch]);

    const handleSelectPair = useCallback((m: PearMarket) => {
        onSelectPair(m);
        setIsDropdownOpen(false);
    }, [onSelectPair]);

    const displayMarkets = useMemo(() => {
        if (searchQuery.trim()) return searchResults;
        if (!activeMarkets && activeSection !== 'all') return [];
        switch (activeSection) {
            case 'trending':
                return activeMarkets?.highlighted?.length
                    ? activeMarkets.highlighted
                    : activeMarkets?.active?.slice(0, 10) || [];
            case 'gainers':
                return activeMarkets?.topGainers || [];
            case 'losers':
                return activeMarkets?.topLosers || [];
            case 'all':
                return allMarkets.length > 0
                    ? allMarkets
                    : activeMarkets?.active || [];
            default:
                return [];
        }
    }, [searchQuery, searchResults, activeMarkets, activeSection, allMarkets]);

    const sections: { key: MarketSection; label: React.ReactNode }[] = [
        { key: 'all', label: 'All' },
        {
            key: 'trending',
            label: (
                <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-2-.5-4-1.5-5.5L12 12V2z" />
                    </svg>
                    Hot
                </span>
            ),
        },
        {
            key: 'gainers',
            label: (
                <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                    </svg>
                    Gainers
                </span>
            ),
        },
        {
            key: 'losers',
            label: (
                <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                        <polyline points="16 17 22 17 22 11" />
                    </svg>
                    Losers
                </span>
            ),
        },
    ];

    const longLabel = market ? market.longAssets.map(a => a.asset).join('+') : '';
    const shortLabel = market ? market.shortAssets.map(a => a.asset).join('+') : '';
    const isPositive = Number(market?.change24h || 0) >= 0;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Header Bar */}
            <div className="flex items-center gap-6 px-4 py-3 bg-bg-panel rounded-lg border border-border overflow-x-auto no-scrollbar">
                {/* Pair Name — toggle dropdown */}
                <button
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                >
                    {market ? (
                        <>
                            <div className="flex items-center -space-x-1.5">
                                {market.longAssets.slice(0, 2).map((a, i) => (
                                    <img
                                        key={`l-${a.asset}`}
                                        src={market.assetLogos?.[i] || `https://app.hyperliquid.xyz/coins/${a.asset.toUpperCase()}.svg`}
                                        alt={a.asset}
                                        className="w-6 h-6 rounded-full ring-1 ring-[#0a0e1a] bg-[#1a1f35]"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                ))}
                                {market.shortAssets.slice(0, 2).map((a, i) => (
                                    <img
                                        key={`s-${a.asset}`}
                                        src={market.assetLogos?.[market.longAssets.length + i] || `https://app.hyperliquid.xyz/coins/${a.asset.toUpperCase()}.svg`}
                                        alt={a.asset}
                                        className="w-6 h-6 rounded-full ring-1 ring-[#0a0e1a] bg-[#1a1f35]"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                ))}
                            </div>
                            <span className="text-white font-sans font-semibold text-base">
                                {longLabel}
                            </span>
                            {shortLabel && (
                                <>
                                    <span className="text-brand-textGray text-xs">/</span>
                                    <span className="text-white font-sans font-semibold text-base">
                                        {shortLabel}
                                    </span>
                                </>
                            )}
                        </>
                    ) : (
                        <span className="text-brand-textGray text-sm">Select a pair to start trading</span>
                    )}
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        className={`text-[#8E8E8E] ml-0.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    >
                        <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                </button>

                {market && (
                    <>
                        {/* Divider */}
                        <div className="w-px h-6 bg-border flex-shrink-0" />

                        {/* Ratio */}
                        <div className="flex flex-col flex-shrink-0">
                            <span className="text-brand-textGray text-[10px] uppercase tracking-wider">Ratio</span>
                            <span className="text-white font-sans font-medium text-sm">
                                {Number(market.ratio || 0).toFixed(4)}
                            </span>
                        </div>

                        {/* 24h Change */}
                        <div className="flex flex-col flex-shrink-0">
                            <span className="text-brand-textGray text-[10px] uppercase tracking-wider">24h</span>
                            <span className={`font-sans font-medium text-sm ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                                {isPositive ? '+' : ''}{Number(market.change24h || 0).toFixed(2)}%
                            </span>
                        </div>

                        {/* Volume */}
                        <div className="flex flex-col flex-shrink-0">
                            <span className="text-brand-textGray text-[10px] uppercase tracking-wider">Volume</span>
                            <span className="text-brand-textLight font-sans text-sm">
                                ${formatCompact(market.volume24h)}
                            </span>
                        </div>

                        {/* Open Interest */}
                        <div className="flex flex-col flex-shrink-0">
                            <span className="text-brand-textGray text-[10px] uppercase tracking-wider">OI</span>
                            <span className="text-brand-textLight font-sans text-sm">
                                ${formatCompact(market.openInterest)}
                            </span>
                        </div>

                        {/* Net Funding */}
                        <div className="flex flex-col flex-shrink-0">
                            <span className="text-brand-textGray text-[10px] uppercase tracking-wider">Funding</span>
                            <span className={`font-sans text-sm ${Number(market.netFunding || 0) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                {Number(market.netFunding || 0) >= 0 ? '+' : ''}{(Number(market.netFunding || 0) * 100).toFixed(4)}%
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-[380px] max-h-[460px] bg-bg-panel rounded-lg border border-border shadow-xl z-50 flex flex-col overflow-hidden">
                    {/* Search */}
                    <div className="px-3 pt-3 pb-2">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search pairs..."
                            className="w-full px-3 py-1.5 bg-bg-input border border-border rounded-md text-sm text-white placeholder:text-brand-textGray font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)] transition-colors"
                        />
                    </div>

                    {/* Section Tabs */}
                    {!searchQuery.trim() && (
                        <div className="flex gap-1 px-3 pb-2">
                            {sections.map((section) => (
                                <button
                                    key={section.key}
                                    onClick={() => setActiveSection(section.key)}
                                    className={`px-2 py-1 text-[11px] font-sans rounded transition-colors ${activeSection === section.key
                                        ? 'bg-[rgba(255,255,255,0.9)]/20 text-[rgba(255,255,255,0.9)]'
                                        : 'text-brand-textGray hover:text-brand-textLight'
                                        }`}
                                >
                                    {section.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Market List */}
                    <div className="flex-1 overflow-y-auto px-1 pb-2">
                        {isLoading || isSearching || allMarketsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.9)]/30 border-t-[rgba(255,255,255,0.9)] rounded-full animate-spin" />
                            </div>
                        ) : displayMarkets.length === 0 ? (
                            <div className="text-center py-8 text-brand-textGray text-xs font-sans">
                                {searchQuery ? 'No pairs found' : 'No markets available'}
                            </div>
                        ) : (
                            displayMarkets.map((m) => (
                                <DropdownPairRow
                                    key={m.id}
                                    market={m}
                                    isSelected={m.id === selectedPairId}
                                    onClick={() => handleSelectPair(m)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Pair row inside the dropdown – includes asset logos
const DropdownPairRow: React.FC<{
    market: PearMarket;
    isSelected: boolean;
    onClick: () => void;
}> = ({ market, isSelected, onClick }) => {
    const longLabel = market.longAssets.map(a => a.asset).join('+');
    const shortLabel = market.shortAssets.map(a => a.asset).join('+');
    const isPositive = Number(market.change24h || 0) >= 0;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors group ${isSelected
                ? 'bg-[rgba(255,255,255,0.9)]/10 border border-[rgba(255,255,255,0.9)]/30'
                : 'hover:bg-white/[0.03] border border-transparent'
                }`}
        >
            <div className="flex items-center gap-2">
                {/* Asset Logos */}
                <div className="flex items-center -space-x-1">
                    {market.longAssets.slice(0, 2).map((a, i) => (
                        <img
                            key={`l-${a.asset}`}
                            src={market.assetLogos?.[i] || `https://app.hyperliquid.xyz/coins/${a.asset.toUpperCase()}.svg`}
                            alt={a.asset}
                            className="w-5 h-5 rounded-full ring-1 ring-[#0a0e1a] bg-[#1a1f35]"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    ))}
                    {market.shortAssets.slice(0, 2).map((a, i) => (
                        <img
                            key={`s-${a.asset}`}
                            src={market.assetLogos?.[market.longAssets.length + i] || `https://app.hyperliquid.xyz/coins/${a.asset.toUpperCase()}.svg`}
                            alt={a.asset}
                            className="w-5 h-5 rounded-full ring-1 ring-[#0a0e1a] bg-[#1a1f35]"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    ))}
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-white font-sans text-xs font-medium">
                        {longLabel} / {shortLabel}
                    </span>
                    <span className="text-brand-textGray text-[10px] font-sans">
                        {Number(market.ratio || 0).toFixed(4)}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end">
                <span
                    className={`text-xs font-sans font-medium ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}
                >
                    {isPositive ? '+' : ''}{Number(market.change24h || 0).toFixed(2)}%
                </span>
                <span className="text-brand-textGray text-[10px] font-sans">
                    ${formatCompact(market.volume24h)}
                </span>
            </div>
        </button>
    );
};

function formatCompact(n: number | string): string {
    const num = Number(n || 0);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
}

export default PairPriceHeader;
