'use client';

import React, { useState } from 'react';
import type { PearPosition, PearOrder } from '@/types/pear';

/** Resolve a logo URL for an asset name */
const getAssetLogo = (asset: string) =>
    `https://app.hyperliquid.xyz/coins/${asset.toUpperCase()}.svg`;

interface PairPositionsTableProps {
    positions: PearPosition[];
    openOrders: PearOrder[];
    twapOrders: PearOrder[];
    isLoading: boolean;
    onClosePosition: (positionId: string) => void;
    onCloseAll: () => void;
    onCancelOrder: (orderId: string) => void;
    onCancelTwap: (orderId: string) => void;
}

type TabKey = 'positions' | 'orders' | 'twap';

/** Small overlapping logo avatars for a list of assets */
const AssetLogos: React.FC<{ assets: string[] }> = ({ assets }) => (
    <div className="flex items-center -space-x-1.5">
        {assets.map((a, i) => (
            <img
                key={`${a}-${i}`}
                src={getAssetLogo(a)}
                alt={a}
                className="w-4 h-4 rounded-full border border-bg-panel bg-bg-input"
                style={{ zIndex: assets.length - i }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
        ))}
    </div>
);

const PairPositionsTable: React.FC<PairPositionsTableProps> = React.memo(({
    positions,
    openOrders,
    twapOrders,
    isLoading,
    onClosePosition,
    onCloseAll,
    onCancelOrder,
    onCancelTwap,
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('positions');
    const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);

    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: 'positions', label: 'Positions', count: positions.length },
        { key: 'orders', label: 'Orders', count: openOrders.length },
        { key: 'twap', label: 'TWAP', count: twapOrders.length },
    ];

    // Only show the full-page spinner on initial load when there's no data yet
    const showSpinner = isLoading && positions.length === 0 && openOrders.length === 0 && twapOrders.length === 0;

    return (
        <div className="bg-bg-panel rounded-lg border border-border p-4 h-full overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-1.5 text-xs font-sans rounded transition-colors ${activeTab === tab.key
                                ? 'bg-[rgba(255,255,255,0.9)]/20 text-[rgba(255,255,255,0.9)] font-medium'
                                : 'text-brand-textGray hover:text-brand-textLight'
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Close All for positions tab */}
                {activeTab === 'positions' && positions.length > 0 && (
                    <button
                        onClick={() => setShowCloseAllConfirm(true)}
                        className="text-brand-red text-[11px] font-sans hover:text-brand-red/80 transition-colors"
                    >
                        Close All
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {showSpinner ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.9)]/30 border-t-[rgba(255,255,255,0.9)] rounded-full animate-spin" />
                    </div>
                ) : activeTab === 'positions' ? (
                    <PositionsContent positions={positions} onClose={onClosePosition} />
                ) : activeTab === 'orders' ? (
                    <OrdersContent orders={openOrders} onCancel={onCancelOrder} />
                ) : (
                    <OrdersContent orders={twapOrders} onCancel={onCancelTwap} isTwap />
                )}
            </div>

            {/* Close All Confirmation */}
            {showCloseAllConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg-panel border border-border rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-white font-sans font-semibold text-sm mb-2">Close All Positions?</h3>
                        <p className="text-brand-textGray text-xs font-sans mb-4">
                            This will close all {positions.length} open pair position{positions.length !== 1 ? 's' : ''}. This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCloseAllConfirm(false)}
                                className="flex-1 py-2 bg-bg-input border border-border text-brand-textGray text-xs font-sans rounded-lg hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowCloseAllConfirm(false); onCloseAll(); }}
                                className="flex-1 py-2 bg-brand-red text-white text-xs font-sans rounded-lg hover:bg-brand-red/80 transition-colors"
                            >
                                Close All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// ============= Positions =============

const PositionsContent: React.FC<{
    positions: PearPosition[];
    onClose: (id: string) => void;
}> = ({ positions, onClose }) => {
    if (positions.length === 0) {
        return (
            <div className="text-center py-8 text-brand-textGray text-xs font-sans">
                No open pair positions
            </div>
        );
    }

    return (
        <table className="w-full">
            <thead>
                <tr className="text-brand-textGray text-[10px] font-sans uppercase tracking-wider">
                    <th className="text-left pb-2">Pair</th>
                    <th className="text-right pb-2">Size</th>
                    <th className="text-right pb-2">Entry</th>
                    <th className="text-right pb-2">Mark</th>
                    <th className="text-right pb-2">PnL</th>
                    <th className="text-right pb-2">Lev</th>
                    <th className="text-right pb-2"></th>
                </tr>
            </thead>
            <tbody>
                {positions.map((pos) => {
                    const longAssets = pos.longAssets.map(a => a.asset);
                    const shortAssets = pos.shortAssets.map(a => a.asset);
                    const pnlPositive = Number(pos.unrealizedPnl || 0) >= 0;

                    return (
                        <tr key={pos.positionId} className="border-t border-border/50 group">
                            <td className="py-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                        <AssetLogos assets={longAssets} />
                                        <span className="text-brand-textGray text-[10px] mx-0.5">/</span>
                                        <AssetLogos assets={shortAssets} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white text-xs font-sans font-medium">
                                            {longAssets.join('+')}/{shortAssets.join('+')}
                                        </span>
                                        <span className="text-brand-textGray text-[10px]">
                                            {pos.status}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-white text-xs font-sans">
                                    ${Number(pos.usdValue || 0).toFixed(2)}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textLight text-xs font-sans">
                                    {Number(pos.entryRatio || 0).toFixed(4)}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textLight text-xs font-sans">
                                    {Number(pos.markRatio || 0).toFixed(4)}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <div className="flex flex-col items-end">
                                    <span className={`text-xs font-sans font-medium ${pnlPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {pnlPositive ? '+' : ''}${Number(pos.unrealizedPnl || 0).toFixed(2)}
                                    </span>
                                    <span className={`text-[10px] font-sans ${pnlPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {pnlPositive ? '+' : ''}{Number(pos.unrealizedPnlPercent || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textGray text-xs font-sans">
                                    {pos.leverage}x
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <button
                                    onClick={() => onClose(pos.positionId)}
                                    className="text-brand-red text-[11px] font-sans opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-red/80"
                                >
                                    Close
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

// ============= Orders =============

const OrdersContent: React.FC<{
    orders: PearOrder[];
    onCancel: (id: string) => void;
    isTwap?: boolean;
}> = ({ orders, onCancel, isTwap }) => {
    if (orders.length === 0) {
        return (
            <div className="text-center py-8 text-brand-textGray text-xs font-sans">
                No {isTwap ? 'TWAP ' : ''}open orders
            </div>
        );
    }

    return (
        <table className="w-full">
            <thead>
                <tr className="text-brand-textGray text-[10px] font-sans uppercase tracking-wider">
                    <th className="text-left pb-2">Pair</th>
                    <th className="text-right pb-2">Type</th>
                    <th className="text-right pb-2">Size</th>
                    <th className="text-right pb-2">Lev</th>
                    <th className="text-right pb-2">Status</th>
                    <th className="text-right pb-2"></th>
                </tr>
            </thead>
            <tbody>
                {orders.map((order) => {
                    const longAssets = order.longAssets.map(a => a.asset);
                    const shortAssets = order.shortAssets.map(a => a.asset);

                    return (
                        <tr key={order.orderId} className="border-t border-border/50 group">
                            <td className="py-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                        <AssetLogos assets={longAssets} />
                                        <span className="text-brand-textGray text-[10px] mx-0.5">/</span>
                                        <AssetLogos assets={shortAssets} />
                                    </div>
                                    <span className="text-white text-xs font-sans font-medium">
                                        {longAssets.join('+')}/{shortAssets.join('+')}
                                    </span>
                                </div>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textLight text-xs font-sans">
                                    {order.orderType}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-white text-xs font-sans">
                                    ${Number(order.usdValue || 0).toFixed(2)}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textGray text-xs font-sans">
                                    {order.leverage}x
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <span className="text-brand-textGray text-[11px] font-sans">
                                    {order.status}
                                </span>
                            </td>
                            <td className="text-right py-2">
                                <button
                                    onClick={() => onCancel(order.orderId)}
                                    className="text-brand-red text-[11px] font-sans opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-red/80"
                                >
                                    Cancel
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default PairPositionsTable;
