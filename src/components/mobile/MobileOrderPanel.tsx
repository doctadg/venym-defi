'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import toast from 'react-hot-toast';
import { useTrading } from '@/hooks/useTrading';
import { useOrderbook } from '@/hooks/useOrderbook';
import { useBalances } from '@/hooks/useBalances';
import { useDexMode } from '@/contexts/DexModeContext';
import { OrderSide, OrderType, AggregatedBalance } from '@/types';
import { Button } from '../ui/button';
import { getLeverageConfig, clampLeverage, getAvantisMaxLeverage, isZfpSupported } from '@/config/leverageConfig';

interface MobileOrderPanelProps {
    activeSymbol: string;
    onDepositClick: () => void;
}

const MobileOrderPanel: React.FC<MobileOrderPanelProps> = ({
    activeSymbol,
    onDepositClick,
}) => {
    const [side, setSide] = useState<OrderSide>(OrderSide.LONG);
    const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Zero Fee'>('Market');
    const [leverage, setLeverageRaw] = useState(20);
    const [marginType, setMarginType] = useState<'Cross' | 'Isolated'>('Cross');
    const [sizePercent, setSizePercent] = useState(0);
    const [size, setSize] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
    const [reduceOnly, setReduceOnly] = useState(false);
    const [showTpSl, setShowTpSl] = useState(false);
    const isManualSizeUpdate = useRef(false);

    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';

    const { executeOpenPosition, loading: tradeLoading } = useTrading();
    const { data: orderbookData } = useOrderbook(activeSymbol);
    const { balanceData, loading: balanceLoading } = useBalances(walletAddress);
    const { mode: dexMode } = useDexMode();

    const isAvantis = dexMode === 'avantis';
    const normalizedSymbol = activeSymbol.replace('/USD', '').toUpperCase();
    const zfpSupported = isAvantis && isZfpSupported(normalizedSymbol);

    const leverageConfig = getLeverageConfig(dexMode);
    const effectiveMaxLeverage = isAvantis
        ? getAvantisMaxLeverage(normalizedSymbol, orderType === 'Zero Fee' && zfpSupported)
        : leverageConfig.maxLeverage;

    const setLeverage = (val: number) => {
        setLeverageRaw(Math.max(1, Math.min(val, effectiveMaxLeverage)));
    };

    useEffect(() => {
        if (isAvantis) {
            setLeverageRaw((prev) => Math.max(1, Math.min(prev, effectiveMaxLeverage)));
        } else {
            setLeverageRaw((prev) => clampLeverage(prev, dexMode));
        }
    }, [dexMode, effectiveMaxLeverage, isAvantis]);

    const currentPrice = orderbookData?.midPrice
        ? parseFloat(orderbookData.midPrice).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : '0.00';

    // Get available margin based on DEX
    const getAvailableMargin = (): string => {
        if (!balanceData) return '0.00';
        if (dexMode === 'auto' || dexMode === 'hyperliquid') {
            return balanceData.hyperliquid?.withdrawable || '0.00';
        }
        if (dexMode === 'aster') {
            const usdtBalance = balanceData.aster?.find(
                (b) => b.asset === 'USDT (Perp)' || b.asset === 'USDT'
            );
            return usdtBalance?.free || '0.00';
        }
        if (dexMode === 'lighter') {
            return balanceData.lighter?.availableBalance || '0.00';
        }
        if (dexMode === 'pacifica') {
            return balanceData.pacifica?.availableBalance || '0.00';
        }
        if (dexMode === 'avantis') {
            return balanceData.avantis?.availableBalance || '0.00';
        }
        return '0.00';
    };

    const availableMargin = getAvailableMargin();
    const maxPositionSize = parseFloat(availableMargin) * leverage;

    // Sync size with percentage buttons
    useEffect(() => {
        if (!isManualSizeUpdate.current && maxPositionSize > 0 && sizePercent > 0) {
            const calculatedSize = (maxPositionSize * sizePercent) / 100;
            setSize(calculatedSize.toFixed(2));
        }
        isManualSizeUpdate.current = false;
    }, [sizePercent, maxPositionSize]);

    const handleSizeChange = (value: string) => {
        isManualSizeUpdate.current = true;
        setSize(value);
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && maxPositionSize > 0) {
            const percent = (numValue / maxPositionSize) * 100;
            setSizePercent(Math.min(100, Math.max(0, Math.round(percent))));
        } else {
            setSizePercent(0);
        }
    };

    const handleOrder = async () => {
        if (!walletAddress || !primaryWallet) {
            toast.error('Please connect your wallet to trade');
            return;
        }

        if (orderType === 'Limit' && !limitPrice) {
            toast.error('Please enter a limit price');
            return;
        }

        const priceNum = parseFloat(currentPrice.replace(/,/g, ''));
        if (!priceNum || priceNum <= 0) {
            toast.error('Waiting for price data. Please try again.');
            return;
        }

        try {
            const notionalUsd = parseFloat(size);
            const tokenAmount = notionalUsd / priceNum;

            await executeOpenPosition({
                symbol: activeSymbol.replace('/USD', ''),
                direction: side === OrderSide.LONG ? 'LONG' : 'SHORT',
                size: tokenAmount.toFixed(6),
                leverage: leverage,
                orderType: orderType === 'Zero Fee'
                    ? 'MARKET_ZERO_FEE'
                    : orderType === 'Market'
                        ? 'MARKET'
                        : 'LIMIT',
                limitPrice: orderType === 'Limit' ? limitPrice : undefined,
                marketPrice: priceNum.toString(),
                preferredExchange: dexMode !== 'auto' ? dexMode : undefined,
            });
            toast.success('Order placed successfully!');
        } catch (e) {
            toast.error('Failed to place order: ' + (e as Error).message);
        }
    };

    const displaySymbol = activeSymbol.split('/')[0];

    return (
        <div className="flex flex-col gap-3 p-4 bg-[#121212] rounded-t-2xl">
            {/* Margin Type & Leverage Row */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setMarginType(marginType === 'Cross' ? 'Isolated' : 'Cross')}
                    className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white font-medium"
                >
                    {marginType}
                </button>
                <button
                    className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white font-medium"
                >
                    {leverage}x (max {effectiveMaxLeverage}x)
                </button>
            </div>

            {/* Buy/Sell Tabs */}
            <div className="flex bg-[#050505] rounded-xl p-1">
                <button
                    onClick={() => setSide(OrderSide.LONG)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${side === OrderSide.LONG
                        ? 'bg-[#2B4942] text-brand-green'
                        : 'text-[#5C5C5C]'
                        }`}
                >
                    Buy {displaySymbol}
                </button>
                <button
                    onClick={() => setSide(OrderSide.SHORT)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${side === OrderSide.SHORT
                        ? 'bg-[#492B2B] text-brand-red'
                        : 'text-[#5C5C5C]'
                        }`}
                >
                    Sell {displaySymbol}
                </button>
            </div>

            {/* Price Input */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                <input
                    type="text"
                    placeholder={currentPrice}
                    value={orderType === 'Market' ? currentPrice : limitPrice}
                    onChange={(e) => orderType === 'Limit' && setLimitPrice(e.target.value)}
                    disabled={orderType === 'Market'}
                    className="bg-transparent text-white outline-none flex-1 text-sm"
                />
                <div className="flex items-center gap-2">
                    <span className="text-[#8E8E8E] text-xs">USD</span>
                    <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as 'Market' | 'Limit' | 'Zero Fee')}
                        className="bg-transparent text-white text-xs border-none outline-none cursor-pointer"
                    >
                        <option value="Market">Market</option>
                        <option value="Limit">Limit</option>
                        {isAvantis && <option value="Zero Fee" disabled={!zfpSupported}>Zero Fee</option>}
                    </select>
                </div>
            </div>

            {/* Amount Input */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                <span className="text-[#8E8E8E] text-xs">Amount</span>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="0"
                        value={size}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        className="bg-transparent text-right text-white outline-none w-20 text-sm"
                    />
                    <span className="text-[#8E8E8E] text-xs">{displaySymbol}</span>
                </div>
            </div>

            {/* Size Slider */}
            <div className="px-1">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={sizePercent}
                    onChange={(e) => setSizePercent(parseInt(e.target.value))}
                    className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
                    style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${sizePercent}%, rgba(255,255,255,0.1) ${sizePercent}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                />
            </div>

            {/* Percentage Buttons */}
            <div className="flex gap-2">
                {[25, 50, 75, 100].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => setSizePercent(percent)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${sizePercent === percent
                            ? 'bg-white/90 text-white'
                            : 'bg-white/5 text-[#8E8E8E] hover:text-white'
                            }`}
                    >
                        {percent}%
                    </button>
                ))}
            </div>

            {/* Toggles Row */}
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={reduceOnly}
                        onChange={(e) => setReduceOnly(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/10 border-none"
                    />
                    <span className="text-[#8E8E8E] text-xs">Reduce Only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showTpSl}
                        onChange={(e) => setShowTpSl(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/10 border-none"
                    />
                    <span className="text-[#8E8E8E] text-xs">Take Profit / Stop Loss</span>
                </label>
            </div>

            {/* Action Button */}
            <Button
                onClick={handleOrder}
                disabled={!walletAddress || tradeLoading}
                className={`w-full py-4 rounded-xl text-white font-medium text-base ${side === OrderSide.LONG
                    ? 'bg-brand-green hover:bg-brand-green/90'
                    : 'bg-brand-red hover:bg-brand-red/90'
                    }`}
            >
                {!walletAddress
                    ? 'Connect Wallet'
                    : tradeLoading
                        ? 'Placing Order...'
                        : `${side === OrderSide.LONG ? 'Long' : 'Short'} / Buy`}
            </Button>

            {/* Info Row */}
            <div className="flex justify-between text-[10px] text-[#5C5C5C]">
                <span>Max Slippage</span>
                <span className="text-white">Max 3%</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#5C5C5C]">
                <span>Liquidation Price</span>
                <span className="text-white">N/A</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#5C5C5C]">
                <span>Margin</span>
                <span className="text-white">$0</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#5C5C5C]">
                <span>Available</span>
                <span className="text-white">${balanceLoading ? '...' : availableMargin}</span>
            </div>
        </div>
    );
};

export default MobileOrderPanel;
