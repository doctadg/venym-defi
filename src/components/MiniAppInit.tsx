'use client';

import { sdk, Context } from '@farcaster/miniapp-sdk';
import { useEffect, useCallback, useState } from 'react';

/**
 * MiniAppInit - Initializes the Base mini-app SDK
 * Calls sdk.actions.ready() to hide the splash screen when the app is ready
 */
export function MiniAppInit() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [context, setContext] = useState<Context.MiniAppContext | undefined>();

    useEffect(() => {
        const load = async () => {
            const ctx = await sdk.context;
            setContext(ctx);
            setIsSDKLoaded(true);
        };
        load();
    }, []);

    useEffect(() => {
        if (!isSDKLoaded) {
            return;
        }
        sdk.actions.ready({});
    }, [isSDKLoaded]);

    // Log context for debugging (can be removed in production)
    useEffect(() => {
        if (context) {
            console.debug('MiniApp context loaded:', context.client?.clientFid);
        }
    }, [context]);

    return null;
}

export default MiniAppInit;
