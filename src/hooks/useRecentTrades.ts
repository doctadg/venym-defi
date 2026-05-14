import { useState, useEffect, useRef } from 'react';
import { fetchRecentTrades, subscribeToTrades, Subscription } from '../services/api';
import { Trade } from '../types';

export const useRecentTrades = (symbol: string, limit: number = 50) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let eventSource: Subscription | null = null;
        const tradeBufferRef = { current: [] as Trade[] };
        let intervalId: NodeJS.Timeout;

        const loadInitialTrades = async () => {
            try {
                const data = await fetchRecentTrades(symbol, limit);
                setTrades(data);
            } catch (error) {
                console.error('Failed to load trades', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialTrades();

        // Subscribe to real-time updates
        eventSource = subscribeToTrades(symbol, (trade: Trade) => {
            tradeBufferRef.current.push(trade);
        });

        // Throttle updates to UI
        intervalId = setInterval(() => {
            const bufferedTrades = tradeBufferRef.current;
            if (bufferedTrades.length > 0) {
                tradeBufferRef.current = []; // Clear buffer
                setTrades(prevTrades => {
                    // Add new trades to the beginning (newest first)
                    // Buffer has [oldest, ..., newest], so we reverse it
                    const newTrades = [...bufferedTrades.reverse(), ...prevTrades];
                    return newTrades.slice(0, limit);
                });
            }
        }, 500); // Update every 500ms

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            clearInterval(intervalId);
        };
    }, [symbol, limit]);

    return { trades, loading };
};

