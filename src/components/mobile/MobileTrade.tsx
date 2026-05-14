'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import MobileAssetBar from './MobileAssetBar';
import MobileOrderBook from './MobileOrderBook';
import MobileOrderPanel from './MobileOrderPanel';
import TickerSelectionModal from '../TickerSelectionModal';
import DepositModal from '../DepositModal';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { usePositions } from '@/hooks/usePositions';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { Position, Order, OrderSide } from '@/types';

// Dynamically import TVChart to avoid SSR issues
const TVChart = dynamic(() => import('../TVChart'), { ssr: false });

interface MobileTradeProps {
    activeSymbol: string;
    onSymbolChange: (symbol: string) => void;
}

type TabType = 'chart' | 'orderbook' | 'positions';

const MobileTrade: React.FC<MobileTradeProps> = ({
    activeSymbol,
    onSymbolChange
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('chart');
    const [isTickerModalOpen, setIsTickerModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [showOrderPanel, setShowOrderPanel] = useState(true);

    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';

    const handleSymbolSelect = (symbol: string) => {
        onSymbolChange(symbol);
        setIsTickerModalOpen(false);
    };

    const tabs: { id: TabType; label: string }[] = [
        { id: 'chart', label: 'Chart' },
        { id: 'orderbook', label: 'Orderbook' },
        { id: 'positions', label: 'Positions/Orders' },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0A0E17]">
            {/* Asset Bar */}
            <MobileAssetBar
                symbol={activeSymbol}
                onSymbolClick={() => setIsTickerModalOpen(true)}
            />

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 px-4 py-2 bg-[#0A0E17] border-b border-white/10 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-white/10 text-white'
                            : 'text-[#8E8E8E] hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Timeframe Selector (for chart tab) */}
            {activeTab === 'chart' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#0A0E17] overflow-x-auto no-scrollbar">
                    {['1m', '5m', '15m', '1h', '4h', 'D'].map((tf) => (
                        <button
                            key={tf}
                            className="px-2 py-1 text-xs text-[#8E8E8E] hover:text-white transition-colors"
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'chart' && (
                    <div className="h-full">
                        <TVChart
                            activeSymbol={activeSymbol}
                            onSymbolChange={onSymbolChange}
                            onSymbolClick={() => setIsTickerModalOpen(true)}
                            tickerModalOpen={isTickerModalOpen}
                            tickerModal={
                                <TickerSelectionModal
                                    isOpen={isTickerModalOpen}
                                    onClose={() => setIsTickerModalOpen(false)}
                                    onSelect={handleSymbolSelect}
                                    currentSymbol={activeSymbol}
                                />
                            }
                            hideSelector={true}
                        />
                    </div>
                )}

                {activeTab === 'orderbook' && (
                    <div className="h-full p-3">
                        <MobileOrderBook activeSymbol={activeSymbol} maxRows={12} />
                    </div>
                )}

                {activeTab === 'positions' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <MobilePositionsAndOrders walletAddress={walletAddress} />
                    </div>
                )}
            </div>

            {/* Order Panel Toggle */}
            <button
                onClick={() => setShowOrderPanel(!showOrderPanel)}
                className="w-full py-2 bg-[#14192F] border-t border-white/10 text-center"
            >
                <div className="flex items-center justify-center gap-2">
                    <span className="text-white text-sm font-medium">
                        {showOrderPanel ? 'Hide' : 'Show'} Order Panel
                    </span>
                    <svg
                        className={`w-4 h-4 transition-transform ${showOrderPanel ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="white"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </button>

            {/* Order Panel */}
            {showOrderPanel && (
                <div className="flex-shrink-0 max-h-[60vh] overflow-y-auto">
                    <MobileOrderPanel
                        activeSymbol={activeSymbol}
                        onDepositClick={() => setIsDepositModalOpen(true)}
                    />
                </div>
            )}

            {/* Modals */}
            <TickerSelectionModal
                isOpen={isTickerModalOpen}
                onClose={() => setIsTickerModalOpen(false)}
                onSelect={handleSymbolSelect}
                currentSymbol={activeSymbol}
            />

            <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                exchange="hyperliquid"
                walletAddress={walletAddress}
            />
        </div>
    );
};

export default MobileTrade;

const MobilePositionsAndOrders = ({ walletAddress }: { walletAddress: string }) => {
    const { positions, loading: positionsLoading } = usePositions(walletAddress);
    const { orders, loading: ordersLoading } = useOpenOrders(walletAddress, 'hyperliquid');

    if (positionsLoading || ordersLoading) {
        return <div className="p-4 text-center text-[#8E8E8E] text-xs">Loading...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-20">
            {/* Positions Section */}
            <div>
                <h3 className="text-[#8E8E8E] text-[10px] uppercase font-bold mb-2 px-1">Active Positions ({positions.length})</h3>
                <div className="space-y-2">
                    {positions.length === 0 ? (
                        <div className="bg-white/5 rounded-lg p-3 text-center text-[#5C5C5C] text-xs">No active positions</div>
                    ) : (
                        positions.map((pos, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium text-sm">{pos.symbol}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${pos.direction === 'LONG' ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'}`}>
                                            {pos.leverage}x {pos.direction}
                                        </span>
                                    </div>
                                    <span className={`text-sm font-medium ${parseFloat(pos.unrealizedPnl) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {parseFloat(pos.unrealizedPnl) >= 0 ? '+' : ''}{pos.unrealizedPnl}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                                    <div className="flex justify-between pr-2">
                                        <span className="text-[#5C5C5C]">Size</span>
                                        <span className="text-white">{pos.size}</span>
                                    </div>
                                    <div className="flex justify-between pl-2 border-l border-white/5">
                                        <span className="text-[#5C5C5C]">Entry</span>
                                        <span className="text-white">{pos.entryPrice}</span>
                                    </div>
                                    <div className="flex justify-between pr-2">
                                        <span className="text-[#5C5C5C]">Mark</span>
                                        <span className="text-white">{pos.markPrice}</span>
                                    </div>
                                    <div className="flex justify-between pl-2 border-l border-white/5">
                                        <span className="text-[#5C5C5C]">Liq Price</span>
                                        <span className="text-brand-red">{pos.liquidationPrice}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Orders Section */}
            <div>
                <h3 className="text-[#8E8E8E] text-[10px] uppercase font-bold mb-2 px-1">Open Orders ({orders.length})</h3>
                <div className="space-y-2">
                    {orders.length === 0 ? (
                        <div className="bg-white/5 rounded-lg p-3 text-center text-[#5C5C5C] text-xs">No open orders</div>
                    ) : (
                        orders.map((order, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium text-sm">{order.symbol}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${(order.side as any) === OrderSide.LONG || (order.side as any) === 'Buy' || (order.side as any) === 'LONG' ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'}`}>
                                            {order.side}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[#8E8E8E]">{order.type}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <div className="flex flex-col">
                                        <span className="text-[#5C5C5C]">Price</span>
                                        <span className="text-white">{order.price}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[#5C5C5C]">Qty</span>
                                        <span className="text-white">{order.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
