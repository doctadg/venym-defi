'use client';

import React from 'react';
import { useTicker } from '@/hooks/useTicker';
import { ChevronDown } from '../Icons';

interface MobileAssetBarProps {
    symbol: string;
    onSymbolClick: () => void;
}

const MobileAssetBar: React.FC<MobileAssetBarProps> = ({ symbol, onSymbolClick }) => {
    const { data: tickerData, loading } = useTicker(symbol, 5000);

    const price = tickerData?.markPrice || tickerData?.lastPrice || '0.00';
    const changePercent = tickerData?.changePercent24h || '0.00';
    const isPositive = !changePercent.startsWith('-');

    // Format the symbol for display (e.g., "BTC/USD" -> "BTC")
    const displaySymbol = symbol.split('/')[0];

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border-b border-white/10">
            {/* Left: Symbol Selector */}
            <button
                onClick={onSymbolClick}
                className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2">
                    {/* Token logo */}
                    {tickerData?.logoUrl ? (
                        <img
                            src={tickerData.logoUrl}
                            alt={symbol}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                                ; (e.target as HTMLImageElement).style.display = 'none'
                            }}
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                                {symbol.charAt(0)}
                            </span>
                        </div>
                    )}
                    <span className="text-white font-semibold text-base">{symbol}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#8E8E8E]" />
            </button>

            {/* Right: Price & Change */}
            <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isPositive ? '+' : ''}{parseFloat(changePercent).toFixed(2)}%
                </span>
                <span className="text-white font-semibold text-lg">
                    {loading ? '...' : parseFloat(price).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            </div>
        </div>
    );
};

export default MobileAssetBar;
