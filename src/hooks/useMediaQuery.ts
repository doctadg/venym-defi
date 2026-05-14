'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect media query matches for responsive design
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        // Check if window is available (client-side only)
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Create listener
        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Add listener
        mediaQuery.addEventListener('change', handler);

        // Cleanup
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

// Common breakpoint hooks
export function useIsMobile(): boolean {
    return !useMediaQuery('(min-width: 768px)');
}

export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 768px)') && !useMediaQuery('(min-width: 1024px)');
}

export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1024px)');
}

export default useMediaQuery;
