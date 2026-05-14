import React from 'react';
import { useRecentTrades } from '../hooks/useRecentTrades';
import { Trade, OrderSide } from '../types';

const RecentTrades = ({ symbol }: { symbol: string }) => {
    const { trades, loading } = useRecentTrades(symbol);

    return (
        <div className="w-full bg-bg-panel border border-border rounded-3xl p-3 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-[#8E8E8E] text-xs font-medium uppercase tracking-wide">Recent Trades</span>
            </div>

            <div className="flex justify-between items-center px-1 mb-2 text-[10px] text-[#5C5C5C] font-sans uppercase font-bold">
                <span className="flex-1">Price</span>
                <span className="flex-1 text-right">Size</span>
                <span className="flex-none w-12 text-right">Time</span>
            </div>

            <div className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1 min-h-0">
                {loading && <div className="text-center text-[#8E8E8E] text-xs py-4">Loading...</div>}
                {!loading && trades.map((trade, i) => (
                    <div key={trade.id || i} className="flex items-center justify-between py-1 px-1 hover:bg-white/5 cursor-pointer rounded text-[11px] font-sans leading-4">
                        <span className={`flex-1 ${trade.side === OrderSide.LONG ? 'text-brand-green' : 'text-brand-red'}`}>
                            {parseFloat(trade.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="flex-1 text-right text-[#8E8E8E]">{parseFloat(trade.size).toFixed(4)}</span>
                        <span className="flex-none w-12 text-right text-[#5C5C5C]">
                            {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentTrades;
