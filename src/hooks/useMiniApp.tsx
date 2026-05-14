'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';

/**
 * Hook to detect if we're running inside a Base mini-app context
 * and provide access to SDK features
 */
export function useMiniApp() {
    const [isMiniApp, setIsMiniApp] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const checkContext = async () => {
            try {
                // Check if SDK context is available
                const context = await sdk.context;
                setIsMiniApp(!!context?.client);
                setIsReady(true);
            } catch {
                setIsMiniApp(false);
                setIsReady(true);
            }
        };

        checkContext();
    }, []);

    return {
        isMiniApp,
        isReady,
        sdk
    };
}

export default useMiniApp;
