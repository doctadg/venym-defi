import { useEffect, useState, useCallback } from 'react';
import { StandardizedAsset } from '@/types/asset';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

const CACHE_VERSION = 1;
const CACHE_KEY = `tokenList_v${CACHE_VERSION}`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const BACKGROUND_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export const useTokens = () => {
  const [tokens, setTokens] = useState<StandardizedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchTokens = useCallback(async (forceRefresh = false) => {
    // Try to load from cache first unless forcing refresh
    if (!forceRefresh) {
      try {
        const compressedData = localStorage.getItem(CACHE_KEY);
        if (compressedData) {
          const jsonData = decompressFromUTF16(compressedData);
          if (jsonData) {
            const { timestamp, data } = JSON.parse(jsonData);
            
            // Use cache if within duration
            if (Date.now() - timestamp < CACHE_DURATION) {
              setTokens(data);
              setLoading(false);
              setIsCached(true);
              
              // Refresh in background if cache is stale
              if (Date.now() - timestamp > BACKGROUND_REFRESH_INTERVAL) {
                fetchTokens(true);
              }
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to read from cache", e);
      }
    }

    setLoading(true);
    setIsCached(false);

    try {
      const response = await fetch('/api/v1/assets', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.statusText}`);
      }
      
      const data: StandardizedAsset[] = await response.json();
      
      const sortedTokens = data.sort((a, b) => {
        const aPriority = a.priorityOrder !== undefined ? a.priorityOrder : Infinity;
        const bPriority = b.priorityOrder !== undefined ? b.priorityOrder : Infinity;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.symbol.localeCompare(b.symbol);
      });

      setTokens(sortedTokens);
      setLoading(false);

      // Save to cache with compression
      try {
        const cacheData = {
          timestamp: Date.now(),
          data: sortedTokens
        };
        const jsonData = JSON.stringify(cacheData);
        const compressedData = compressToUTF16(jsonData);
        localStorage.setItem(CACHE_KEY, compressedData);
      } catch (e) {
        console.error("Failed to write to cache", e);
      }

    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchTokens(true);
    }, BACKGROUND_REFRESH_INTERVAL * 2);
    
    return () => clearInterval(refreshInterval);
  }, [fetchTokens]);

  const refetchTokens = useCallback(() => {
    fetchTokens(true);
  }, [fetchTokens]);

  return { 
    tokens, 
    loading, 
    error,
    isCached,
    refetchTokens,
  };
};
