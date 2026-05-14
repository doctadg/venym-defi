import { useState, useEffect, useRef, useCallback } from 'react';
import { AggregatedBalance } from '../types';
import { fetchAllBalances } from '../services/api';

export const useBalances = (walletAddress: string) => {
    const [balanceData, setBalanceData] = useState<AggregatedBalance | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadBalances = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const data = await fetchAllBalances(walletAddress);
            setBalanceData(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load balances:', error);
            setLoading(false);
        }
    }, [walletAddress]);

    // Manual refresh function - call this after deposit
    const refresh = useCallback(() => {
        setLoading(true);
        loadBalances();
    }, [loadBalances]);

    useEffect(() => {
        if (!walletAddress) return;

        loadBalances();
        intervalRef.current = setInterval(loadBalances, 30000); // Poll every 30s

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [walletAddress, loadBalances]);

    return { balanceData, loading, refresh };
};
