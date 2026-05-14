'use client';

import React from 'react';
import { useOrderbook } from '@/hooks/useOrderbook';

interface MobileOrderBookProps {
    activeSymbol: string;
    maxRows?: number;
}

const MobileOrderBook: React.FC<MobileOrderBookProps> = ({
    activeSymbol,
    maxRows = 8
}) => {
    const { data, loading, error } = useOrderbook(activeSymbol);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-8">
                Loading...
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex items-center justify-center h-full text-brand-red text-xs py-8">
                Error loading orderbook
            </div>
        );
    }

    // Format data for display
    const asks = data?.asks?.levels?.slice(0, maxRows).map((level) => ({
        price: parseFloat(level.price).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
        total: parseFloat(level.size).toFixed(4),
        rawPrice: parseFloat(level.price),
    })) || [];

    const bids = data?.bids?.levels?.slice(0, maxRows).map((level) => ({
        price: parseFloat(level.price).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
        total: parseFloat(level.size).toFixed(4),
        rawPrice: parseFloat(level.price),
    })) || [];

    const bestBid = data?.bids?.levels?.[0] ? parseFloat(data.bids.levels[0].price) : 0;
    const bestAsk = data?.asks?.levels?.[0] ? parseFloat(data.asks.levels[0].price) : 0;
    const spreadPercent = bestAsk > 0 ? ((bestAsk - bestBid) / bestAsk * 100) : 0;

    return (
        <div className="flex flex-col h-full bg-[#121212] rounded-xl p-3">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <span className="text-[#8E8E8E] text-xs font-medium">Order Book</span>
                <div className="flex items-center gap-2">
                    <select className="bg-transparent text-[#8E8E8E] text-[10px] border-none outline-none">
                        <option value="0.01">0.01</option>
                        <option value="0.1">0.1</option>
                        <option value="1">1</option>
                    </select>
                    <span className="text-[10px] text-[#8E8E8E] bg-white/10 px-1.5 py-0.5 rounded">USD</span>
                </div>
            </div>

            {/* Column Headers */}
            <div className="flex justify-between text-[10px] text-[#5C5C5C] mb-1 px-1">
                <span>Price</span>
                <span>Total(USD)</span>
            </div>

            {/* Asks (sells) - reversed to show lowest at bottom */}
            <div className="flex flex-col-reverse flex-1 overflow-hidden">
                {asks.map((ask, i) => (
                    <div
                        key={`ask-${i}`}
                        className="flex justify-between items-center py-0.5 px-1 text-[11px]"
                    >
                        <span className="text-brand-red">{ask.price}</span>
                        <span className="text-[#8E8E8E]">{ask.total}</span>
                    </div>
                ))}
            </div>

            {/* Spread / Mid Price */}
            <div className="flex items-center justify-between py-2 my-1 border-y border-white/10">
                <span className="text-white font-medium text-sm">
                    {((bestBid + bestAsk) / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[#5C5C5C] text-[10px]">
                    Spread: {spreadPercent.toFixed(3)}%
                </span>
            </div>

            {/* Bids (buys) */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {bids.map((bid, i) => (
                    <div
                        key={`bid-${i}`}
                        className="flex justify-between items-center py-0.5 px-1 text-[11px]"
                    >
                        <span className="text-brand-green">{bid.price}</span>
                        <span className="text-[#8E8E8E]">{bid.total}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MobileOrderBook;
