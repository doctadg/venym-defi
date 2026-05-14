import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPearPositions, fetchPearOpenOrders, fetchPearTwapOrders } from '../services/pearApi';
import type { PearPosition, PearOrder } from '../types/pear';

const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook that polls Pear Protocol positions and orders.
 * Uses deep-equality checks so state only updates when data actually changes,
 * preventing unnecessary re-renders of the positions table.
 */
export const usePearPositions = (accessToken: string | null) => {
    const [positions, setPositions] = useState<PearPosition[]>([]);
    const [openOrders, setOpenOrders] = useState<PearOrder[]>([]);
    const [twapOrders, setTwapOrders] = useState<PearOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Refs to cache serialized previous values for deep comparison
    const prevPositionsJson = useRef<string>('[]');
    const prevOrdersJson = useRef<string>('[]');
    const prevTwapsJson = useRef<string>('[]');

    const fetchAll = useCallback(async () => {
        if (!accessToken) return;

        try {
            const [pos, orders, twaps] = await Promise.all([
                fetchPearPositions(accessToken),
                fetchPearOpenOrders(accessToken),
                fetchPearTwapOrders(accessToken),
            ]);

            // Only update state when data has actually changed
            const posJson = JSON.stringify(pos);
            if (posJson !== prevPositionsJson.current) {
                prevPositionsJson.current = posJson;
                setPositions(pos);
            }

            const ordersJson = JSON.stringify(orders);
            if (ordersJson !== prevOrdersJson.current) {
                prevOrdersJson.current = ordersJson;
                setOpenOrders(orders);
            }

            const twapsJson = JSON.stringify(twaps);
            if (twapsJson !== prevTwapsJson.current) {
                prevTwapsJson.current = twapsJson;
                setTwapOrders(twaps);
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
    }, [accessToken]);

    // Initial fetch + polling
    useEffect(() => {
        if (!accessToken) {
            setPositions([]);
            setOpenOrders([]);
            setTwapOrders([]);
            prevPositionsJson.current = '[]';
            prevOrdersJson.current = '[]';
            prevTwapsJson.current = '[]';
            return;
        }

        setIsLoading(true);
        fetchAll().finally(() => setIsLoading(false));

        intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [accessToken, fetchAll]);

    return {
        positions,
        openOrders,
        twapOrders,
        isLoading,
        error,
        refetch: fetchAll,
    };
};
