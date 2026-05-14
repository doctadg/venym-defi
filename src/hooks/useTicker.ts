import { useState, useEffect, useRef } from 'react';
import { fetchTicker } from '../services/api';
import { TickerData } from '../types';

export const useTicker = (symbol: string, refreshInterval: number = 5000) => {
  const [data, setData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTicker = async () => {
      try {
        setError(null);
        const tickerData = await fetchTicker(symbol);
        if (isMounted) {
          setData(tickerData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch ticker data');
          setLoading(false);
        }
      }
    };

    // Initial load
    loadTicker();

    // Set up polling if refreshInterval is provided
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadTicker();
      }, refreshInterval);
    }

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [symbol, refreshInterval]);

  return { data, loading, error };
};

