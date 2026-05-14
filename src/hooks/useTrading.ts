import { useState } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { openPosition, closePosition, cancelOrder, fetchOrderStatus, depositFunds, trackVolume } from '../services/api';
import { OpenPositionPayload, DepositPayload } from '../types';
import { useAvantisTrade } from './useAvantisTrade';

export const useTrading = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { primaryWallet } = useDynamicContext();
    const avantisTrade = useAvantisTrade();

    // Helper to get auth token from Dynamic SDK
    // Per Dynamic docs, getAuthToken() retrieves JWT from localStorage
    const fetchAuthToken = (): string => {
        const token = getAuthToken();

        if (!token) {
            console.warn('fetchAuthToken: No auth token found in localStorage');
            console.warn('fetchAuthToken: Wallet address:', primaryWallet?.address);
            throw new Error('Authentication required. Please reconnect your wallet.');
        }

        return token;
    };

    const executeOpenPosition = async (payload: OpenPositionPayload) => {
        setLoading(true);
        setError(null);
        try {
            // Avantis: execute client-side via user wallet, bypass backend
            if (payload.preferredExchange === 'avantis') {
                const tokenAmount = parseFloat(payload.size);

                const isLimitOrder = payload.orderType === 'LIMIT' || payload.orderType === 'STOP_LIMIT';
                const effectivePrice = isLimitOrder && payload.limitPrice
                    ? payload.limitPrice
                    : payload.marketPrice || '0';

                const price = parseFloat(effectivePrice);
                if (price <= 0) {
                    throw new Error('Market price is required for Avantis trades. Please try again.');
                }

                const lev = payload.leverage || 10;
                const collateralUsd = (tokenAmount * price) / lev;

                const result = await avantisTrade.openPosition({
                    symbol: payload.symbol,
                    direction: payload.direction,
                    positionSizeUsd: collateralUsd.toFixed(6),
                    leverage: lev,
                    openPrice: effectivePrice,
                    orderType: payload.orderType === 'MARKET' || payload.orderType === 'STOP_MARKET'
                        ? 'MARKET'
                        : payload.orderType,
                    tp: undefined,
                    sl: undefined,
                });

                // Track Volume (Optimistic)
                if (primaryWallet?.address) {
                    trackVolume({
                        userAddress: primaryWallet.address,
                        platform: 'avantis',
                        marketId: payload.symbol,
                        side: payload.direction === 'LONG' ? 'buy' : 'sell',
                        size: payload.size,
                        price: payload.limitPrice || '0',
                        notionalValue: parseFloat(payload.size),
                        leverage: payload.leverage || 1,
                        fees: 0,
                        timestamp: Date.now()
                    });
                }

                return { txHash: result.txHash, exchange: 'avantis' };
            }

            // All other exchanges: route through backend API
            const authToken = fetchAuthToken();

            const result = await openPosition(payload, authToken);
            if (!result.success) {
                throw new Error(result.error || 'Failed to open position');
            }

            // Track Volume (Optimistic)
            if (primaryWallet?.address) {
                trackVolume({
                    userAddress: primaryWallet.address,
                    platform: payload.preferredExchange || 'hyperliquid',
                    marketId: payload.symbol,
                    side: payload.direction === 'LONG' ? 'buy' : 'sell',
                    size: payload.size,
                    price: payload.limitPrice || '0',
                    notionalValue: parseFloat(payload.size),
                    leverage: payload.leverage || 1,
                    fees: 0,
                    timestamp: Date.now()
                });
            }

            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const executeDeposit = async (exchange: string, payload: DepositPayload) => {
        setLoading(true);
        setError(null);
        try {
            const authToken = fetchAuthToken();
            const result = await depositFunds(exchange, payload, authToken);
            if (!result.success) {
                throw new Error(result.error || 'Failed to deposit funds');
            }
            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const executeClosePosition = async (symbol: string, direction: 'LONG' | 'SHORT', size: string, preferredExchange?: string) => {
        setLoading(true);
        setError(null);
        try {
            // Avantis: close client-side via user wallet
            if (preferredExchange === 'avantis') {
                const txHash = await avantisTrade.closeBySymbol(symbol, direction);

                // Track Volume
                if (primaryWallet?.address && size) {
                    trackVolume({
                        userAddress: primaryWallet.address,
                        platform: 'avantis',
                        marketId: symbol,
                        side: 'sell',
                        size: size,
                        price: '0',
                        notionalValue: parseFloat(size),
                        leverage: 1,
                        fees: 0,
                        timestamp: Date.now()
                    });
                }

                return { txHash, exchange: 'avantis' };
            }

            const authToken = fetchAuthToken();
            const result = await closePosition({
                symbol,
                direction,
                size,
                orderType: 'MARKET',
                preferredExchange: preferredExchange || 'hyperliquid'
            }, authToken);
            if (!result.success) {
                throw new Error(result.error || 'Failed to close position');
            }

            // Track Volume (Optimistic)
            if (primaryWallet?.address && size) {
                trackVolume({
                    userAddress: primaryWallet.address,
                    platform: (preferredExchange as any) || 'hyperliquid',
                    marketId: symbol,
                    side: 'sell',
                    size: size,
                    price: '0',
                    notionalValue: parseFloat(size),
                    leverage: 1,
                    fees: 0,
                    timestamp: Date.now()
                });
            }

            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const executeCancelOrder = async (exchange: string, orderId: string, symbol: string) => {
        setLoading(true);
        setError(null);
        try {
            const authToken = fetchAuthToken();
            const result = await cancelOrder(exchange, orderId, symbol, authToken);
            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel order');
            }
            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const executeLimitClose = async (symbol: string, direction: 'LONG' | 'SHORT', size: string, limitPrice: string, preferredExchange?: string) => {
        setLoading(true);
        setError(null);
        try {
            // Avantis: limit close not natively supported — use market close
            if (preferredExchange === 'avantis') {
                throw new Error('Avantis does not support limit close orders. Use Market close instead.');
            }

            const authToken = fetchAuthToken();
            const result = await closePosition({
                symbol,
                direction,
                size,
                orderType: 'LIMIT',
                limitPrice,
                preferredExchange: preferredExchange || 'hyperliquid'
            }, authToken);
            if (!result.success) {
                throw new Error(result.error || 'Failed to place limit close order');
            }

            // Track Volume (Optimistic)
            if (primaryWallet?.address && size) {
                trackVolume({
                    userAddress: primaryWallet.address,
                    platform: (preferredExchange as any) || 'hyperliquid',
                    marketId: symbol,
                    side: 'sell',
                    size: size,
                    price: limitPrice,
                    notionalValue: parseFloat(size),
                    leverage: 1,
                    fees: 0,
                    timestamp: Date.now()
                });
            }

            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const executeFlipPosition = async (symbol: string, currentDirection: 'LONG' | 'SHORT', size: string, leverage: number, preferredExchange?: string) => {
        setLoading(true);
        setError(null);
        try {
            // Avantis: close then open opposite, both client-side
            if (preferredExchange === 'avantis') {
                // Step 1: Close current position
                await avantisTrade.closeBySymbol(symbol, currentDirection);

                // Step 2: Fetch current market price for the new trade
                const { fetchOrderbook } = await import('../services/api');
                const orderbook = await fetchOrderbook(symbol);
                const midPrice = parseFloat(orderbook.midPrice);
                if (!midPrice || midPrice <= 0) {
                    throw new Error('Could not fetch market price for Avantis flip. Close was successful.');
                }

                // Step 3: Open opposite position
                // size here is the token amount from the position — compute collateral
                const tokenAmount = parseFloat(size);
                const collateralUsd = (tokenAmount * midPrice) / leverage;

                const newDirection = currentDirection === 'LONG' ? 'SHORT' : 'LONG';
                const result = await avantisTrade.openPosition({
                    symbol,
                    direction: newDirection,
                    positionSizeUsd: collateralUsd.toFixed(6),
                    leverage,
                    openPrice: midPrice.toString(),
                    orderType: 'MARKET',
                });

                // Track Volume (both legs)
                if (primaryWallet?.address && size) {
                    trackVolume({
                        userAddress: primaryWallet.address,
                        platform: 'avantis',
                        marketId: symbol,
                        side: currentDirection === 'LONG' ? 'sell' : 'buy',
                        size,
                        price: '0',
                        notionalValue: parseFloat(size),
                        leverage: 1,
                        fees: 0,
                        timestamp: Date.now()
                    });
                    trackVolume({
                        userAddress: primaryWallet.address,
                        platform: 'avantis',
                        marketId: symbol,
                        side: newDirection === 'LONG' ? 'buy' : 'sell',
                        size,
                        price: '0',
                        notionalValue: parseFloat(size),
                        leverage,
                        fees: 0,
                        timestamp: Date.now()
                    });
                }

                return { close: { txHash: 'avantis-close' }, open: result };
            }

            const authToken = fetchAuthToken();

            // Step 1: Close current position
            const closeResult = await closePosition({
                symbol,
                direction: currentDirection,
                size,
                orderType: 'MARKET',
                preferredExchange: preferredExchange || 'hyperliquid'
            }, authToken);

            if (!closeResult.success) {
                throw new Error(closeResult.error || 'Failed to close position for flip');
            }

            // Step 2: Open opposite position
            const newDirection = currentDirection === 'LONG' ? 'SHORT' : 'LONG';
            const openResult = await openPosition({
                symbol,
                direction: newDirection,
                size,
                leverage,
                orderType: 'MARKET',
                preferredExchange: preferredExchange as any || 'hyperliquid'
            }, authToken);

            if (!openResult.success) {
                throw new Error(openResult.error || 'Closed position but failed to open opposite');
            }

            // Track Volume (both legs)
            if (primaryWallet?.address && size) {
                const platform = (preferredExchange as any) || 'hyperliquid';
                trackVolume({
                    userAddress: primaryWallet.address,
                    platform,
                    marketId: symbol,
                    side: currentDirection === 'LONG' ? 'sell' : 'buy',
                    size: size,
                    price: '0',
                    notionalValue: parseFloat(size),
                    leverage: 1,
                    fees: 0,
                    timestamp: Date.now()
                });
                trackVolume({
                    userAddress: primaryWallet.address,
                    platform,
                    marketId: symbol,
                    side: newDirection === 'LONG' ? 'buy' : 'sell',
                    size: size,
                    price: '0',
                    notionalValue: parseFloat(size),
                    leverage,
                    fees: 0,
                    timestamp: Date.now()
                });
            }

            return { close: closeResult.data, open: openResult.data };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        executeOpenPosition,
        executeDeposit,
        executeClosePosition,
        executeLimitClose,
        executeFlipPosition,
        executeCancelOrder,
        loading,
        error
    };
};
