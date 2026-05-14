import { useState, useEffect, useCallback } from 'react';
import { fetchPearActiveMarkets, fetchPearMarkets } from '../services/pearApi';
import type { PearMarket, PearActiveMarkets } from '../types/pear';

/**
 * Hook for fetching and searching Pear Protocol pair markets.
 */
export const usePearMarkets = () => {
    const [activeMarkets, setActiveMarkets] = useState<PearActiveMarkets | null>(null);
    const [searchResults, setSearchResults] = useState<PearMarket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadActiveMarkets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchPearActiveMarkets();
            setActiveMarkets(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load markets');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const searchMarkets = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const data = await fetchPearMarkets({ search: query, limit: 20 });
            setSearchResults(data.markets);
        } catch (err) {
            console.error('[usePearMarkets] Search error:', err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Load active markets on mount
    useEffect(() => {
        loadActiveMarkets();
    }, [loadActiveMarkets]);

    return {
        activeMarkets,
        searchResults,
        isLoading,
        isSearching,
        error,
        loadActiveMarkets,
        searchMarkets,
    };
};
