import { useState, useCallback, useRef, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import {
    fetchPearEIP712Message,
    authenticatePear,
    refreshPearToken,
    fetchPearAgentWallet,
    createPearAgentWallet,
} from '../services/pearApi';
import type { PearAuthTokens } from '../types/pear';

const STORAGE_KEY_PREFIX = 'pear_auth_';
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh when < 5 min remaining

interface PearSetupState {
    isAuthenticated: boolean;
    hasAgentWallet: boolean;
    isLoading: boolean;
    isPreparing: boolean;
    isApproving: boolean;
    error: string | null;
    accessToken: string | null;
    refreshToken: string | null;
}

/**
 * Hook for Pear Protocol setup — handles EIP-712 auth flow, agent wallet creation,
 * and automatic token refresh.
 */
export const usePearSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address;
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<PearSetupState>({
        isAuthenticated: false,
        hasAgentWallet: false,
        isLoading: false,
        isPreparing: false,
        isApproving: false,
        error: null,
        accessToken: null,
        refreshToken: null,
    });

    // Save tokens to localStorage
    const saveTokens = useCallback((tokens: PearAuthTokens) => {
        if (!walletAddress) return;
        const toStore = {
            ...tokens,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
        };
        localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`,
            JSON.stringify(toStore)
        );
    }, [walletAddress]);

    // Schedule auto-refresh
    const scheduleRefresh = useCallback((expiresAt: number, currentRefreshToken: string) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        const msUntilRefresh = Math.max((expiresAt - Date.now()) - REFRESH_THRESHOLD_MS, 1000);
        refreshTimerRef.current = setTimeout(async () => {
            try {
                const newTokens = await refreshPearToken(walletAddress || '', currentRefreshToken);
                saveTokens(newTokens);
                setState(prev => ({
                    ...prev,
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken,
                }));
                // Schedule next refresh
                scheduleRefresh(
                    Date.now() + newTokens.expiresIn * 1000,
                    newTokens.refreshToken
                );
            } catch {
                // Refresh failed — clear auth state
                if (walletAddress) {
                    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`);
                }
                setState(prev => ({
                    ...prev,
                    isAuthenticated: false,
                    accessToken: null,
                    refreshToken: null,
                    error: 'Session expired — please re-authenticate',
                }));
            }
        }, msUntilRefresh);
    }, [walletAddress, saveTokens]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []);

    // Try to restore tokens from localStorage
    const restoreTokens = useCallback(() => {
        if (!walletAddress) return null;
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`);
        if (stored) {
            try {
                const tokens: PearAuthTokens & { expiresAt: number } = JSON.parse(stored);
                if (tokens.expiresAt > Date.now()) {
                    setState(prev => ({
                        ...prev,
                        isAuthenticated: true,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    }));
                    // Schedule auto-refresh
                    scheduleRefresh(tokens.expiresAt, tokens.refreshToken);
                    return tokens.accessToken;
                }
                // Expired — clear
                localStorage.removeItem(`${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`);
            } catch { /* ignore parse errors */ }
        }
        return null;
    }, [walletAddress, scheduleRefresh]);

    // Check authentication status
    const checkAuth = useCallback(async (): Promise<boolean> => {
        const existing = restoreTokens();
        if (existing) {
            setState(prev => ({ ...prev, isAuthenticated: true, accessToken: existing }));
            return true;
        }
        setState(prev => ({ ...prev, isAuthenticated: false, accessToken: null }));
        return false;
    }, [restoreTokens]);

    // Full authenticate flow: get EIP-712 message → sign → exchange for JWT
    // Returns the access token string on success, null on failure
    const authenticate = useCallback(async (): Promise<string | null> => {
        if (!walletAddress || !primaryWallet) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return null;
        }

        setState(prev => ({ ...prev, isPreparing: true, error: null }));

        try {
            // Step 1: Get EIP-712 typed data
            const eip712Data = await fetchPearEIP712Message(walletAddress);

            setState(prev => ({ ...prev, isPreparing: false, isApproving: true }));

            // Step 2: Sign with wallet
            // @ts-ignore - connector types may vary
            const walletClient = await primaryWallet.connector?.getWalletClient();
            if (!walletClient) throw new Error('Unable to get wallet client');

            const signature = await walletClient.signTypedData({
                account: walletAddress as `0x${string}`,
                domain: eip712Data.domain,
                types: eip712Data.types,
                primaryType: eip712Data.primaryType,
                message: eip712Data.message,
            });

            if (!signature) throw new Error('User rejected signature');

            // Step 3: Exchange signature for JWT
            // Must use the timestamp from the EIP-712 message, NOT Date.now()
            const eip712Timestamp = eip712Data.timestamp || eip712Data.message?.timestamp || Date.now();
            const tokens = await authenticatePear(walletAddress, signature, eip712Timestamp);

            // Save tokens
            saveTokens(tokens);

            setState(prev => ({
                ...prev,
                isApproving: false,
                isAuthenticated: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            }));

            // Return the token directly so callers don't rely on stale state
            return tokens.accessToken;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isPreparing: false,
                isApproving: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
            }));
            return null;
        }
    }, [walletAddress, primaryWallet, saveTokens]);

    // Check / create agent wallet
    // Accepts an optional token param to avoid stale closure reads of state.accessToken
    const ensureAgentWallet = useCallback(async (tokenOverride?: string): Promise<boolean> => {
        const token = tokenOverride || state.accessToken;
        if (!token) {
            setState(prev => ({ ...prev, error: 'Not authenticated' }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Check if agent wallet exists
            let wallet = await fetchPearAgentWallet(token);
            if (!wallet) {
                // Create one
                wallet = await createPearAgentWallet(token);
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                hasAgentWallet: true,
            }));
            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Agent wallet setup failed',
            }));
            return false;
        }
    }, [state.accessToken]);

    // Combined: authenticate → ensure agent wallet
    const enablePairTrading = useCallback(async (): Promise<boolean> => {
        // Try restoring first
        const hasAuth = await checkAuth();
        let token = state.accessToken;

        if (!hasAuth) {
            token = await authenticate();
            if (!token) return false;
        }

        // Pass token directly to avoid stale closure issue
        return ensureAgentWallet(token || undefined);
    }, [checkAuth, authenticate, ensureAgentWallet, state.accessToken]);

    const isReady = state.isAuthenticated && state.hasAgentWallet;
    const isBusy = state.isLoading || state.isPreparing || state.isApproving;

    return {
        ...state,
        isReady,
        isBusy,
        walletAddress,
        checkAuth,
        authenticate,
        ensureAgentWallet,
        enablePairTrading,
        restoreTokens,
    };
};
