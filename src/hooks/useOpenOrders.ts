import { useState, useEffect, useCallback } from 'react';
import { fetchOpenOrders } from '../services/api';
import { Order } from '../types';

export const useOpenOrders = (walletAddress: string, exchange: string = 'hyperliquid') => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const getOrders = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const backendOrders = await fetchOpenOrders(exchange, walletAddress);
            setOrders(backendOrders);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch open orders');
        } finally {
            setLoading(false);
        }
    }, [walletAddress, exchange]);

    useEffect(() => {
        getOrders();
        const interval = setInterval(getOrders, 30000);
        return () => clearInterval(interval);
    }, [getOrders]);

    return { orders, loading, error, refresh: getOrders };
};
