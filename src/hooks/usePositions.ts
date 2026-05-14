import { useState, useEffect, useRef } from 'react';
import { fetchOpenPositions } from '../services/api';
import { Position } from '../types';

export const usePositions = (walletAddress: string) => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const isFetching = useRef(false);

    useEffect(() => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        const loadPositions = async () => {
            if (isFetching.current) return;
            isFetching.current = true;
            try {
                // All positions come from the backend, including Avantis
                const allPositions = await fetchOpenPositions(walletAddress);
                setPositions(allPositions);
            } catch (error) {
                console.error('Failed to load positions', error);
            } finally {
                setLoading(false);
                isFetching.current = false;
            }
        };

        loadPositions();
        intervalRef.current = setInterval(loadPositions, 30000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [walletAddress]);

    return { positions, loading };
};
