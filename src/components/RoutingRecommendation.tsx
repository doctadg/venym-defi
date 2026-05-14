import React from 'react';
import { RoutingInfo } from '../types';
import { InfoIcon } from './Icons';
import { DexMode } from '../contexts/DexModeContext';

interface RoutingRecommendationProps {
    symbol: string;
    side: string;
    amount: string;
    routingData: RoutingInfo | null;
    loading: boolean;
    dexMode?: DexMode;
}

const RoutingRecommendation: React.FC<RoutingRecommendationProps> = ({
    symbol,
    side,
    amount,
    routingData,
    loading,
    dexMode = 'auto'
}) => {
    if (!amount || parseFloat(amount) <= 0) return null;

    const isAutoMode = dexMode === 'auto';

    if (loading && !routingData) {
        return (
            <div className="w-full bg-[#14192F]/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-center h-20 animate-pulse">
                <span className="text-[#8E8E8E] text-xs font-geist">
                    {isAutoMode ? 'Finding best route...' : `Fetching ${dexMode} price...`}
                </span>
            </div>
        );
    }

    if (!routingData) return null;

    const { recommended, price, savings, savingsPercent, alternatives } = routingData;

    // Helper to format price
    const formatPrice = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className={`w-full backdrop-blur-md border rounded-xl p-3 flex flex-col gap-2 shadow-lg transition-all duration-300 ease-in-out ${isAutoMode
            ? 'bg-[#14192F]/80 border-brand-gold/20'
            : 'bg-[#14192F]/60 border-white/10'
            }`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-brand-gold animate-pulse' : 'bg-brand-green'}`} />
                    <span className={`text-xs font-medium font-geist ${isAutoMode ? 'text-brand-gold' : 'text-white'}`}>
                        {isAutoMode ? 'Smart Routing Active' : `Trading on ${dexMode.charAt(0).toUpperCase() + dexMode.slice(1)}`}
                    </span>
                </div>
                {isAutoMode && (
                    <div className="flex items-center gap-1">
                        <span className="text-[#8E8E8E] text-[10px] font-geist">Refreshes every 1s</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mt-1">
                <div className="flex flex-col">
                    <span className="text-[#8E8E8E] text-[10px] font-geist mb-0.5">
                        {isAutoMode ? 'Best Route' : 'Platform'}
                    </span>
                    <span className="text-white text-sm font-medium font-geist capitalize">{recommended}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[#8E8E8E] text-[10px] font-geist mb-0.5">Execution Price</span>
                    <span className="text-white text-sm font-medium font-geist">${formatPrice(price)}</span>
                </div>
            </div>

            {isAutoMode && savings > 0 && (
                <div className="flex items-center gap-1.5 bg-brand-green/10 rounded-lg px-2 py-1 mt-1 self-start">
                    <span className="text-brand-green text-[10px] font-medium font-geist">
                        Save ${savings.toFixed(2)} ({savingsPercent.toFixed(2)}%)
                    </span>
                </div>
            )}

            {/* Optional: Show alternatives if needed, for now keeping it clean as per "pop up" request */}
        </div>
    );
};

export default RoutingRecommendation;
