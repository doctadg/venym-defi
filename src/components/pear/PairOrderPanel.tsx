'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { PearMarket, PearCreatePositionRequest, PearExecutionType } from '@/types/pear';
import { createLighterPairPosition, checkLighterPairCompatibility } from '@/services/pearApi';
import LighterImportModal from '@/components/modals/LighterImportModal';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import type { AggregatedBalance } from '@/types';
import { getLeverageConfig, clampLeverage } from '@/config/leverageConfig';

export type PairVenue = 'hyperliquid' | 'lighter';

interface PairOrderPanelProps {
    market: PearMarket | null;
    isReady: boolean;
    isBusy: boolean;
    onEnableTrading: () => Promise<boolean>;
    onSubmitOrder: (request: PearCreatePositionRequest) => Promise<void>;
    error: string | null;
    venue?: PairVenue;
    onVenueChange?: (venue: PairVenue) => void;
    lighterWalletAddress?: string;
    isLighterReady?: boolean;
    onEnableLighter?: () => Promise<boolean>;
    balanceData?: AggregatedBalance | null;
    balanceLoading?: boolean;
}

type ExecutionType = 'MARKET' | 'TRIGGER' | 'TWAP' | 'LADDER';

const PairOrderPanel: React.FC<PairOrderPanelProps> = ({
    market,
    isReady,
    isBusy,
    onEnableTrading,
    onSubmitOrder,
    error: externalError,
    venue: controlledVenue,
    onVenueChange,
    lighterWalletAddress,
    isLighterReady = false,
    onEnableLighter,
    balanceData,
    balanceLoading = false,
}) => {
    const { primaryWallet } = useDynamicContext();
    const isConnected = !!primaryWallet?.address;

    const [internalVenue, setInternalVenue] = useState<PairVenue>('hyperliquid');
    const venue = controlledVenue ?? internalVenue;
    const setVenue = (v: PairVenue) => { onVenueChange ? onVenueChange(v) : setInternalVenue(v); };

    const [executionType, setExecutionType] = useState<ExecutionType>('MARKET');
    const [leverage, setLeverageRaw] = useState(1);
    const [usdValue, setUsdValue] = useState('');
    const [slippage, setSlippage] = useState('0.10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showLighterImport, setShowLighterImport] = useState(false);

    // TP/SL
    const [tpSlEnabled, setTpSlEnabled] = useState(false);
    const [tpValue, setTpValue] = useState('');
    const [slValue, setSlValue] = useState('');

    // Trigger
    const [triggerValue, setTriggerValue] = useState('');
    const [triggerDirection, setTriggerDirection] = useState<'above' | 'below'>('above');

    // TWAP
    const [twapChunks, setTwapChunks] = useState('5');
    const [twapInterval, setTwapInterval] = useState('60');

    // Show venue dropdown
    const [showVenueDropdown, setShowVenueDropdown] = useState(false);
    const [showExecDropdown, setShowExecDropdown] = useState(false);

    // Confirmation
    const [showConfirm, setShowConfirm] = useState(false);

    // Lighter compatibility
    const [lighterCompat, setLighterCompat] = useState<{ compatible: boolean; missingLegs: string[] } | null>(null);
    const [compatLoading, setCompatLoading] = useState(false);

    // Platform-specific leverage config based on venue
    const leverageConfig = getLeverageConfig(venue as 'hyperliquid' | 'lighter');

    // Clamp setter
    const setLeverage = (val: number) => {
        setLeverageRaw(Math.max(1, Math.min(val, leverageConfig.maxLeverage)));
    };

    // Clamp on venue change
    useEffect(() => {
        setLeverageRaw((prev) => clampLeverage(prev, venue as 'hyperliquid' | 'lighter'));
    }, [venue]);

    useEffect(() => {
        if (venue !== 'lighter' || !market) {
            setLighterCompat(null);
            return;
        }
        let cancelled = false;
        setCompatLoading(true);
        checkLighterPairCompatibility(
            market.longAssets.map(a => a.asset),
            market.shortAssets.map(a => a.asset),
        )
            .then(result => { if (!cancelled) setLighterCompat(result); })
            .catch(() => { if (!cancelled) setLighterCompat({ compatible: false, missingLegs: ['unknown'] }); })
            .finally(() => { if (!cancelled) setCompatLoading(false); });
        return () => { cancelled = true; };
    }, [venue, market?.id]);

    const lighterIncompatible = venue === 'lighter' && lighterCompat !== null && !lighterCompat.compatible;
    const error = localError || externalError;

    // Get available margin based on selected venue
    const getAvailableMargin = (): string => {
        if (!balanceData) return '0.00';
        if (venue === 'lighter') {
            return balanceData.lighter?.availableBalance || '0.00';
        }
        // Default to Hyperliquid
        return balanceData.hyperliquid?.withdrawable || '0.00';
    };
    const availableMargin = getAvailableMargin();

    // Compute weights
    const totalLongWeight = useMemo(() =>
        market?.longAssets.reduce((sum, a) => sum + (a.weight || 1), 0) || 0
        , [market]);
    const totalShortWeight = useMemo(() =>
        market?.shortAssets.reduce((sum, a) => sum + (a.weight || 1), 0) || 0
        , [market]);
    const totalWeight = totalLongWeight + totalShortWeight;
    const longPct = totalWeight > 0 ? Math.round((totalLongWeight / totalWeight) * 100) : 50;
    const shortPct = 100 - longPct;

    // Computed values
    const orderValue = parseFloat(usdValue) || 0;
    const marginRequired = leverage > 0 ? orderValue / leverage : 0;
    const fees = orderValue * 0.0006;

    const handleSubmit = async () => {
        if (!market) return;
        if (!usdValue || parseFloat(usdValue) <= 0) {
            setLocalError('Enter a valid size');
            return;
        }

        setIsSubmitting(true);
        setLocalError(null);

        try {
            if (venue === 'lighter') {
                if (lighterIncompatible) {
                    setLocalError(`Assets not available on Lighter: ${lighterCompat?.missingLegs.join(', ')}`);
                    return;
                }
                if (!lighterWalletAddress) {
                    setLocalError('Lighter wallet not connected');
                    return;
                }
                await createLighterPairPosition({
                    walletAddress: lighterWalletAddress,
                    pearMarketId: market.id || '',
                    usdValue: parseFloat(usdValue),
                    leverage,
                    longAssets: market.longAssets,
                    shortAssets: market.shortAssets,
                    slippage: parseFloat(slippage) / 100,
                    venue: 'lighter',
                });
            } else {
                // Hyperliquid — execute through our own adapter via /api/pair-trading
                const hlWallet = primaryWallet?.address;
                if (!hlWallet) {
                    setLocalError('Wallet not connected');
                    return;
                }
                await createLighterPairPosition({
                    walletAddress: hlWallet,
                    pearMarketId: market.id || '',
                    usdValue: parseFloat(usdValue),
                    leverage,
                    longAssets: market.longAssets,
                    shortAssets: market.shortAssets,
                    slippage: parseFloat(slippage) / 100,
                    venue: 'hyperliquid',
                });
            }
            setUsdValue('');
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Order failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const leveragePresets = leverageConfig.presets;

    // No market selected — empty state
    if (!market) {
        return (
            <div className="flex flex-col h-full bg-bg-panel rounded-lg border border-border overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-white font-sans font-semibold text-sm">Pair Trading</span>
                </div>
                <div className="flex-1 flex items-center justify-center px-4">
                    <span className="text-brand-textGray text-sm font-sans text-center">
                        Select a pair from the market explorer to start trading
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-bg-panel rounded-lg border border-border overflow-y-auto">
            {/* Top Row: Execution Type + Venue */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                {/* Execution Type Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => { setShowExecDropdown(!showExecDropdown); setShowVenueDropdown(false); }}
                        className="flex items-center gap-1.5 text-white font-sans text-sm font-medium"
                    >
                        {executionType === 'MARKET' ? 'Market Order' : `${executionType} Order`}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {showExecDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-bg-panel border border-border rounded-lg shadow-xl z-50 min-w-[140px]">
                            {(['MARKET', 'TRIGGER', 'TWAP'] as ExecutionType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => { setExecutionType(type); setShowExecDropdown(false); }}
                                    className={`w-full px-3 py-2 text-left text-xs font-sans transition-colors hover:bg-white/5 ${executionType === type ? 'text-[rgba(255,255,255,0.9)]' : 'text-white'}`}
                                >
                                    {type === 'MARKET' ? 'Market Order' : `${type} Order`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Venue Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => { setShowVenueDropdown(!showVenueDropdown); setShowExecDropdown(false); }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[rgba(255,255,255,0.9)]/10 text-[rgba(255,255,255,0.9)] text-[11px] font-sans font-medium rounded-full border border-[rgba(255,255,255,0.9)]/20"
                    >
                        {venue === 'hyperliquid' ? 'Hyperliquid' : 'Lighter'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {showVenueDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-bg-panel border border-border rounded-lg shadow-xl z-50 min-w-[140px]">
                            <button
                                onClick={() => { setVenue('hyperliquid'); setShowVenueDropdown(false); }}
                                className={`w-full px-3 py-2 text-left text-xs font-sans transition-colors hover:bg-white/5 ${venue === 'hyperliquid' ? 'text-[rgba(255,255,255,0.9)]' : 'text-white'}`}
                            >
                                Hyperliquid
                            </button>
                            <button
                                onClick={() => { setVenue('lighter'); setShowVenueDropdown(false); }}
                                className={`w-full px-3 py-2 text-left text-xs font-sans transition-colors hover:bg-white/5 ${venue === 'lighter' ? 'text-[rgba(255,255,255,0.9)]' : 'text-white'}`}
                            >
                                Lighter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 px-4 py-3">
                {/* Overall Weight Display */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-border">
                    <span className="text-brand-textGray text-[11px] font-sans">Overall:</span>
                    <div className="flex items-center gap-2">
                        <span className="text-brand-green text-xs font-sans font-bold">{longPct}%</span>
                        <span className="text-brand-textGray text-[10px]">/</span>
                        <span className="text-brand-red text-xs font-sans font-bold">{shortPct}%</span>
                        <span className="text-[rgba(255,255,255,0.9)] text-[10px] font-sans ml-2 cursor-pointer hover:underline">Rebalance Weight</span>
                    </div>
                </div>

                {/* Long Assets */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-brand-green text-[10px] font-sans font-semibold uppercase tracking-wider">
                            Long Assets ({market.longAssets.length})
                        </span>
                        <span className="text-brand-textGray text-[10px] font-sans cursor-pointer hover:text-white">+</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {market.longAssets.map((asset, i) => {
                            const w = totalWeight > 0 ? Math.round((asset.weight / totalWeight) * 100) : 50;
                            return (
                                <div key={`long-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-green/5 border border-brand-green/15">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="6 15 12 9 18 15" /></svg>
                                            <img
                                                src={market.assetLogos?.[i] || `https://app.hyperliquid.xyz/coins/${asset.asset.toUpperCase()}.svg`}
                                                alt={asset.asset}
                                                className="w-5 h-5 rounded-full"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-sans font-medium">{asset.asset}</span>
                                            <span className="text-brand-textGray text-[9px] font-sans">1x</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-brand-green text-xs font-sans font-semibold">{w}%</span>
                                        <span className="text-brand-textGray text-[10px] cursor-pointer hover:text-white">×</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Swap icon between long/short */}
                <div className="flex items-center justify-center py-0.5">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-border flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-textGray">
                            <polyline points="7 10 12 15 17 10" />
                        </svg>
                    </div>
                </div>

                {/* Short Assets */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-brand-red text-[10px] font-sans font-semibold uppercase tracking-wider">
                            Short Assets ({market.shortAssets.length})
                        </span>
                        <span className="text-brand-textGray text-[10px] font-sans cursor-pointer hover:text-white">+</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {market.shortAssets.map((asset, i) => {
                            const w = totalWeight > 0 ? Math.round((asset.weight / totalWeight) * 100) : 50;
                            return (
                                <div key={`short-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-red/5 border border-brand-red/15">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF6468" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                                            <img
                                                src={market.assetLogos?.[market.longAssets.length + i] || `https://app.hyperliquid.xyz/coins/${asset.asset.toUpperCase()}.svg`}
                                                alt={asset.asset}
                                                className="w-5 h-5 rounded-full"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-sans font-medium">{asset.asset}</span>
                                            <span className="text-brand-textGray text-[9px] font-sans">1x</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-brand-red text-xs font-sans font-semibold">{w}%</span>
                                        <span className="text-brand-textGray text-[10px] cursor-pointer hover:text-white">×</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Trigger Config */}
                {executionType === 'TRIGGER' && (
                    <div>
                        <div className="flex gap-1 mb-1">
                            <button
                                onClick={() => setTriggerDirection('above')}
                                className={`flex-1 py-1 text-[10px] font-sans rounded ${triggerDirection === 'above' ? 'bg-brand-green/20 text-brand-green' : 'bg-bg-input text-brand-textGray'}`}
                            >
                                Above
                            </button>
                            <button
                                onClick={() => setTriggerDirection('below')}
                                className={`flex-1 py-1 text-[10px] font-sans rounded ${triggerDirection === 'below' ? 'bg-brand-red/20 text-brand-red' : 'bg-bg-input text-brand-textGray'}`}
                            >
                                Below
                            </button>
                        </div>
                        <input
                            type="number"
                            value={triggerValue}
                            onChange={(e) => setTriggerValue(e.target.value)}
                            placeholder={`Trigger ratio (current: ${Number(market.ratio).toFixed(4)})`}
                            className="w-full px-3 py-1.5 bg-bg-input border border-border rounded-md text-sm text-white placeholder:text-brand-textGray font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)]"
                        />
                    </div>
                )}

                {/* TWAP Config */}
                {executionType === 'TWAP' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-brand-textGray text-[10px] font-sans block mb-1">Chunks</label>
                            <input
                                type="number"
                                value={twapChunks}
                                onChange={(e) => setTwapChunks(e.target.value)}
                                className="w-full px-2 py-1.5 bg-bg-input border border-border rounded-md text-sm text-white font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)]"
                            />
                        </div>
                        <div>
                            <label className="text-brand-textGray text-[10px] font-sans block mb-1">Interval (s)</label>
                            <input
                                type="number"
                                value={twapInterval}
                                onChange={(e) => setTwapInterval(e.target.value)}
                                className="w-full px-2 py-1.5 bg-bg-input border border-border rounded-md text-sm text-white font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)]"
                            />
                        </div>
                    </div>
                )}

                {/* Size */}
                <div>
                    <label className="text-brand-textGray text-[10px] font-sans uppercase tracking-wider block mb-1">Size</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={usdValue}
                            onChange={(e) => { setUsdValue(e.target.value); setLocalError(null); }}
                            placeholder="0 USD"
                            className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-lg text-white font-sans focus:outline-none focus:border-[rgba(255,255,255,0.9)] pr-14"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-[rgba(255,255,255,0.9)] text-white text-[10px] font-sans font-medium rounded">
                            Max
                        </button>
                    </div>
                </div>

                {/* Available Margin */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-brand-textGray text-[11px] font-sans">
                            Available Margin
                            <span className="text-brand-textGray/50 ml-1">({venue === 'lighter' ? 'Lighter' : 'Hyperliquid'})</span>
                        </span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                        </svg>
                    </div>
                    <span className="text-white text-xs font-sans font-medium">
                        {balanceLoading ? 'Loading...' : `$${availableMargin}`}
                    </span>
                </div>

                {/* Leverage */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-brand-textGray text-[10px] font-sans uppercase tracking-wider">Leverage</span>
                        <span className="text-white text-xs font-sans font-medium">{leverage}x</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max={leverageConfig.maxLeverage}
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full accent-[rgba(255,255,255,0.9)] h-1"
                    />
                    <div className="flex justify-between mt-1">
                        {leveragePresets.map((lev) => (
                            <button
                                key={lev}
                                onClick={() => setLeverage(lev)}
                                className={`text-[10px] font-sans transition-colors ${leverage === lev ? 'text-[rgba(255,255,255,0.9)] font-bold' : 'text-brand-textGray hover:text-white'}`}
                            >
                                {lev}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* TP/SL Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-brand-textGray text-[11px] font-sans">Take Profit / Stop Loss</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                        </svg>
                    </div>
                    <button
                        onClick={() => setTpSlEnabled(!tpSlEnabled)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${tpSlEnabled ? 'bg-[rgba(255,255,255,0.9)]' : 'bg-border'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${tpSlEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                {tpSlEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-brand-green text-[9px] font-sans block mb-0.5">TP %</label>
                            <input type="number" value={tpValue} onChange={(e) => setTpValue(e.target.value)} placeholder="e.g. 5"
                                className="w-full px-2 py-1 bg-bg-input border border-border rounded text-xs text-white font-sans focus:outline-none focus:border-brand-green" />
                        </div>
                        <div>
                            <label className="text-brand-red text-[9px] font-sans block mb-0.5">SL %</label>
                            <input type="number" value={slValue} onChange={(e) => setSlValue(e.target.value)} placeholder="e.g. 3"
                                className="w-full px-2 py-1 bg-bg-input border border-border rounded text-xs text-white font-sans focus:outline-none focus:border-brand-red" />
                        </div>
                    </div>
                )}

                {/* Order Details */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-brand-textGray text-[11px] font-sans">Slippage</span>
                        <span className="text-[rgba(255,255,255,0.9)] text-[11px] font-sans font-medium">Max: {slippage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-brand-textGray text-[11px] font-sans">Order Value</span>
                        <span className="text-white text-[11px] font-sans">${orderValue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="text-brand-textGray text-[11px] font-sans">Min Size Req</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                            </svg>
                        </div>
                        <span className="text-white text-[11px] font-sans">$22</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="text-brand-textGray text-[11px] font-sans">Margin Required</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                            </svg>
                        </div>
                        <span className="text-white text-[11px] font-sans">${marginRequired.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="text-brand-textGray text-[11px] font-sans">Fees</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                            </svg>
                        </div>
                        <span className="text-white text-[11px] font-sans">{(0.06).toFixed(2)}%</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="px-3 py-2 bg-brand-red/10 border border-brand-red/20 rounded-md">
                        <span className="text-brand-red text-[11px] font-sans">{error}</span>
                    </div>
                )}

                {/* Lighter compat warning */}
                {compatLoading && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-brand-textGray text-xs font-sans">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Checking asset availability...
                    </div>
                )}
                {lighterIncompatible && (
                    <div className="p-2.5 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-sans">
                        <span className="font-medium">Not available on Lighter:</span>{' '}
                        {lighterCompat?.missingLegs.join(', ')}
                        <p className="mt-1 text-brand-textGray text-[10px]">
                            Switch to Hyperliquid venue for this pair.
                        </p>
                    </div>
                )}

                {/* Submit Button */}
                {!isConnected ? (
                    <button className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-white font-sans font-medium text-sm rounded-lg transition-colors shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        Connect Wallet
                    </button>
                ) : venue === 'hyperliquid' ? (
                    !isReady ? (
                        <button
                            onClick={onEnableTrading}
                            disabled={isBusy}
                            className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-white font-sans font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        >
                            {isBusy ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Setting up...
                                </span>
                            ) : (
                                'Enable Hyperliquid Trading'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={isSubmitting || !usdValue || lighterIncompatible}
                            className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-white font-sans font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Placing Trade...
                                </span>
                            ) : (
                                `Open ${executionType} Pair Trade`
                            )}
                        </button>
                    )
                ) : (
                    !isLighterReady ? (
                        <>
                            <button
                                onClick={() => onEnableLighter ? onEnableLighter() : setShowLighterImport(true)}
                                disabled={isBusy}
                                className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-white font-sans font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                            >
                                {isBusy ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Setting up...
                                    </span>
                                ) : (
                                    'Import Lighter API Key'
                                )}
                            </button>
                            <LighterImportModal
                                isOpen={showLighterImport}
                                onClose={() => setShowLighterImport(false)}
                                onSuccess={() => { setShowLighterImport(false); window.location.reload(); }}
                            />
                        </>
                    ) : (
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={isSubmitting || !usdValue || lighterIncompatible || compatLoading}
                            className="w-full py-3 bg-brand-green hover:bg-brand-green/90 text-white font-sans font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Placing Trade...
                                </span>
                            ) : lighterIncompatible ? (
                                'Pair Not Available'
                            ) : (
                                'Open Pair Trade'
                            )}
                        </button>
                    )
                )}

                {/* Account Overview */}
                <div className="border-t border-border pt-3 mt-1">
                    <h4 className="text-white font-sans font-semibold text-xs mb-2">Account Overview</h4>
                    <div className="flex flex-col gap-1.5">
                        {[
                            { label: 'Unrealized PNL', value: '$0' },
                            { label: 'Account Value', value: '$0' },
                            { label: 'Cross Margin Ratio', value: '0%', hasInfo: true },
                            { label: 'Maintenance', value: '$0', hasInfo: true },
                            { label: 'Cross Account Leverage', value: '0x', hasInfo: true },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <span className="text-brand-textGray text-[11px] font-sans">{item.label}</span>
                                    {item.hasInfo && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="2" className="opacity-50">
                                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-white text-[11px] font-sans">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Margin Used */}
                <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-xs font-sans font-semibold">Margin Used</span>
                        <span className="text-white text-xs font-sans">$0</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-brand-textGray text-[11px] font-sans">
                            Available Margin ({venue === 'lighter' ? 'Lighter' : 'Hyperliquid'})
                        </span>
                        <span className="text-white text-[11px] font-sans font-medium">
                            {balanceLoading ? '...' : `$${availableMargin}`}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {[
                            { token: 'USDC', logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
                            { token: 'USDH', logo: 'https://assets.coingecko.com/coins/images/28893/small/USDH.png' },
                            { token: 'USDT', logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
                        ].map((item) => (
                            <div key={item.token} className="flex items-center justify-between py-0.5">
                                <div className="flex items-center gap-2">
                                    <img src={item.logo} alt={item.token} className="w-4 h-4 rounded-full" />
                                    <span className="text-white text-[11px] font-sans">{item.token}</span>
                                </div>
                                <span className="text-brand-textGray text-[11px] font-sans">0.00</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deposit / Withdraw */}
                <div className="flex gap-2 pt-2 border-t border-border">
                    <button className="flex-1 py-2 bg-white/5 border border-border text-white text-xs font-sans rounded-lg hover:bg-white/10 transition-colors">
                        Deposit
                    </button>
                    <button className="flex-1 py-2 bg-white/5 border border-border text-white text-xs font-sans rounded-lg hover:bg-white/10 transition-colors">
                        Withdraw
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg-panel border border-border rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-white font-sans font-semibold text-sm mb-3">Confirm Pair Trade</h3>
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Pair</span>
                                <span className="text-white">{market.longAssets.map(a => a.asset).join('+')} / {market.shortAssets.map(a => a.asset).join('+')}</span>
                            </div>
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Venue</span>
                                <span className="text-white">{venue === 'hyperliquid' ? 'Hyperliquid' : 'Lighter'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Type</span>
                                <span className="text-white">{executionType}</span>
                            </div>
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Size</span>
                                <span className="text-white">${usdValue}</span>
                            </div>
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Leverage</span>
                                <span className="text-white">{leverage}x</span>
                            </div>
                            <div className="flex justify-between text-xs font-sans">
                                <span className="text-brand-textGray">Slippage</span>
                                <span className="text-white">{slippage}%</span>
                            </div>
                        </div>
                        {venue === 'lighter' && (
                            <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md mb-3">
                                <span className="text-yellow-500 text-[10px] font-sans">
                                    This trade will be decomposed into individual perp legs on Lighter.
                                </span>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2 bg-bg-input border border-border text-brand-textGray text-xs font-sans rounded-lg hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); handleSubmit(); }}
                                className="flex-1 py-2 bg-brand-green text-white text-xs font-sans rounded-lg hover:bg-brand-green/80 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                            >
                                Confirm Trade
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PairOrderPanel;
