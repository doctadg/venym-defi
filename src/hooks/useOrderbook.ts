import { useState, useEffect, useRef } from 'react';
import { fetchOrderbook, subscribeToOrderbook, OrderbookData, normalizeOrderbookData } from '../services/api';

export const useOrderbook = (symbol: string) => {
    const [data, setData] = useState<OrderbookData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let eventSource: EventSource | null = null;
        const latestDataRef = { current: null as OrderbookData | null };
        let intervalId: NodeJS.Timeout;

        const loadInitialData = async () => {
            try {
                const orderbookData = await fetchOrderbook(symbol);
                setData(orderbookData);
                latestDataRef.current = orderbookData;
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        // Initial load
        loadInitialData();

        // Subscribe to real-time updates
        eventSource = subscribeToOrderbook(symbol, (update: any) => {
            latestDataRef.current = normalizeOrderbookData(update);
        });

        // Throttle updates to UI
        intervalId = setInterval(() => {
            if (latestDataRef.current) {
                setData(latestDataRef.current);
            }
        }, 500); // Update every 500ms

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            clearInterval(intervalId);
        };
    }, [symbol]);

    return { data, loading, error };
};

