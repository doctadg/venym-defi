import { useState, useEffect } from 'react';
import { fetchHistoricalOrders, fetchUserTrades, fetchFundingHistory } from '../services/api';
import { Order, Trade } from '../types';

export const useHistory = (exchange: string, walletAddress: string) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [funding, setFunding] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        if (!walletAddress) return;
        setLoading(true);
        try {
            const [ordersData, tradesData, fundingData] = await Promise.all([
                fetchHistoricalOrders(exchange, walletAddress),
                fetchUserTrades(exchange, walletAddress),
                fetchFundingHistory(exchange, walletAddress),
            ]);

            setOrders(ordersData);
            setTrades(tradesData.sort((a, b) => b.timestamp - a.timestamp));
            setFunding(fundingData);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exchange, walletAddress]);

    return { orders, trades, funding, loading, refresh };
};
