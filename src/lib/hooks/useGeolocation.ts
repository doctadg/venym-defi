'use client';

import { useState, useEffect } from 'react';

interface GeolocationData {
  country: string;
  countryCode: string;
  currency: string;
}

interface UseGeolocationReturn {
  data: GeolocationData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to detect user's geolocation (country/currency) using a free IP geolocation API.
 * Used by SettingProvider to auto-detect fiat currency for buy/sell modes.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [data, setData] = useState<GeolocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGeolocation() {
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Geolocation request failed');
        const json = await response.json();

        if (!cancelled) {
          setData({
            country: json.country_name || 'United States',
            countryCode: json.country_code || 'US',
            currency: json.currency || 'USD',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          // Default to US
          setData({
            country: 'United States',
            countryCode: 'US',
            currency: 'USD',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGeolocation();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
