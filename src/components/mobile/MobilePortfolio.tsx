'use client';

import React, { useState, useMemo } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useBalances } from '@/hooks/useBalances';
import { usePositions } from '@/hooks/usePositions';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { Position, Order } from '@/types';

type TabType = 'positions' | 'orders' | 'history';

// Position Card Component
const PositionCard = ({ position }: { position: Position }) => {
    const isLong = position.direction === 'LONG';
    const pnlValue = parseFloat(position.unrealizedPnl);
    const isProfit = pnlValue > 0;

    return (
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{position.symbol}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLong ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'
                        }`}>
                        {position.leverage}x {position.direction}
                    </span>
                </div>
                <span className={`text-sm font-medium ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isProfit ? '+' : ''}{position.unrealizedPnl}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-[#5C5C5C]">Size</span>
                    <p className="text-white">{position.size}</p>
                </div>
                <div>
                    <span className="text-[#5C5C5C]">Entry</span>
                    <p className="text-white">{position.entryPrice}</p>
                </div>
                <div>
                    <span className="text-[#5C5C5C]">Mark</span>
                    <p className="text-white">{position.markPrice}</p>
                </div>
                <div>
                    <span className="text-[#5C5C5C]">Liq Price</span>
                    <p className="text-brand-red">{position.liquidationPrice}</p>
                </div>
            </div>

            <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-white/5 rounded-lg text-xs text-[#8E8E8E] hover:text-white transition-colors">
                    TP/SL
                </button>
                <button className="flex-1 py-2 bg-brand-red/20 rounded-lg text-xs text-brand-red hover:bg-brand-red/30 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

// Order Card Component
const OrderCard = ({ order }: { order: Order }) => {
    const isBuy = String(order.side).toUpperCase() === 'BUY' || String(order.side).toUpperCase() === 'LONG';

    return (
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{order.symbol}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isBuy ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'
                        }`}>
                        {order.side}
                    </span>
                </div>
                <span className="text-xs text-[#8E8E8E]">{order.type}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-[#5C5C5C]">Price</span>
                    <p className="text-white">{order.price}</p>
                </div>
                <div>
                    <span className="text-[#5C5C5C]">Qty</span>
                    <p className="text-white">{order.quantity}</p>
                </div>
            </div>

            <button className="w-full mt-3 py-2 bg-brand-red/20 rounded-lg text-xs text-brand-red hover:bg-brand-red/30 transition-colors">
                Cancel
            </button>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ label, value, subValue }: { label: string; value: string; subValue?: string }) => (
    <div className="flex-shrink-0 w-[140px] bg-white/5 rounded-xl p-3 border border-white/10">
        <span className="text-[#8E8E8E] text-xs">{label}</span>
        <p className="text-white font-semibold text-lg mt-1">{value}</p>
        {subValue && <p className="text-[#5C5C5C] text-[10px]">{subValue}</p>}
    </div>
);

const MobilePortfolio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('positions');
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';

    const { balanceData, loading: balanceLoading } = useBalances(walletAddress);
    const { positions, loading: positionsLoading } = usePositions(walletAddress);
    const { orders: openOrders, loading: ordersLoading } = useOpenOrders(walletAddress, 'hyperliquid');

    // Calculate totals
    const totalEquity = useMemo(() => {
        if (!balanceData) return '0.00';
        let total = 0;
        if (balanceData.serverWallet) {
            total += parseFloat(balanceData.serverWallet.usdc || '0');
        }
        if (balanceData.hyperliquid) {
            total += parseFloat(balanceData.hyperliquid.accountValue || '0');
        }
        return total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }, [balanceData]);

    const totalPnl = useMemo(() => {
        return positions.reduce((acc, p) => acc + parseFloat(p.unrealizedPnl), 0);
    }, [positions]);

    const availableMargin = balanceData?.hyperliquid?.withdrawable
        ? parseFloat(balanceData.hyperliquid.withdrawable).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : '$0.00';

    const tabs = [
        { id: 'positions' as TabType, label: 'Positions', count: positions.length },
        { id: 'orders' as TabType, label: 'Orders', count: openOrders.length },
        { id: 'history' as TabType, label: 'History' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0A0E17] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 border-b border-white/10">
                <h1 className="text-xl font-semibold text-white">Portfolio</h1>
            </div>

            {/* Stats Scroll */}
            <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar">
                <StatCard
                    label="Total Equity"
                    value={balanceLoading ? '...' : totalEquity}
                />
                <StatCard
                    label="Unrealized PnL"
                    value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`}
                />
                <StatCard
                    label="Available"
                    value={balanceLoading ? '...' : availableMargin}
                />
                <StatCard
                    label="Positions"
                    value={positions.length.toString()}
                />
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-4 px-4 border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-white' : 'text-[#8E8E8E]'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-brand-gold/20 rounded-full text-[10px] text-brand-gold">
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
                {activeTab === 'positions' && (
                    <>
                        {positionsLoading ? (
                            <div className="text-center text-[#8E8E8E] text-sm py-12">Loading positions...</div>
                        ) : positions.length === 0 ? (
                            <div className="text-center text-[#5C5C5C] text-sm py-12">No open positions</div>
                        ) : (
                            positions.map((pos, idx) => (
                                <PositionCard key={idx} position={pos} />
                            ))
                        )}
                    </>
                )}

                {activeTab === 'orders' && (
                    <>
                        {ordersLoading ? (
                            <div className="text-center text-[#8E8E8E] text-sm py-12">Loading orders...</div>
                        ) : openOrders.length === 0 ? (
                            <div className="text-center text-[#5C5C5C] text-sm py-12">No open orders</div>
                        ) : (
                            openOrders.map((order, idx) => (
                                <OrderCard key={idx} order={order} />
                            ))
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="text-center text-[#5C5C5C] text-sm py-12">
                        Trade history coming soon
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobilePortfolio;
