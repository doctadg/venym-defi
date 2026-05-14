import { useEffect, useRef } from 'react';
import { subscribeToCandles, Subscription } from '../services/api';

export const useChartStream = (symbol: string, interval: string, onUpdate: (candle: any) => void) => {
    const eventSourceRef = useRef<Subscription | null>(null);
    const onUpdateRef = useRef(onUpdate);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Create new connection with a stable callback wrapper
        const handleUpdate = (data: any) => {
            onUpdateRef.current(data);
        };

        eventSourceRef.current = subscribeToCandles(symbol, interval, handleUpdate);

        // Cleanup on unmount or dependency change
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [symbol, interval]); // Removed onUpdate from dependencies
};
