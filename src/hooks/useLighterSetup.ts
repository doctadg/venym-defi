import { useCallback, useState, useEffect } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface LighterSetupState {
    hasApiKey: boolean | null;
    isLoading: boolean;
    isImporting: boolean;
    error: string | null;
}

interface ImportCredentials {
    accountIndex: number;
    apiKeyIndex: number;
    apiPublicKey: string;
    apiPrivateKey: string;
}

export const useLighterSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address || '';


    const [state, setState] = useState<LighterSetupState>({
        hasApiKey: null,
        isLoading: false,
        isImporting: false,
        error: null,
    });

    // Check if user has valid API key
    const checkApiKey = useCallback(async () => {
        if (!walletAddress) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/trading/lighter/check-apikey/${walletAddress}`
            );
            const data = await response.json();
            console.log('[useLighterSetup] checkApiKey response:', data);

            if (data.success) {
                console.log('[useLighterSetup] hasApiKey:', data.hasApiKey);
                setState(prev => ({
                    ...prev,
                    hasApiKey: data.hasApiKey,
                    isLoading: false,
                }));
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to check API key',
            }));
        }
    }, [walletAddress]);

    // Import API key credentials
    const importCredentials = useCallback(async (credentials: ImportCredentials) => {
        if (!walletAddress) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return { success: false, error: 'Wallet not connected' };
        }

        setState(prev => ({ ...prev, isImporting: true, error: null }));

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const authToken = getAuthToken();
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/trading/lighter/import`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    walletIdOrAddress: walletAddress,
                    accountIndex: credentials.accountIndex,
                    apiKeyIndex: credentials.apiKeyIndex,
                    apiPublicKey: credentials.apiPublicKey,
                    apiPrivateKey: credentials.apiPrivateKey,
                }),
            });

            const data = await response.json();
            console.log('[useLighterSetup] importCredentials response:', data);

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    hasApiKey: true,
                    isImporting: false,
                }));
                return { success: true };
            } else {
                throw new Error(data.error || data.message || 'Failed to import credentials');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to import credentials';
            setState(prev => ({
                ...prev,
                isImporting: false,
                error: errorMessage,
            }));
            return { success: false, error: errorMessage };
        }
    }, [walletAddress]);

    // Check API key on mount/wallet change
    useEffect(() => {
        if (walletAddress) {
            checkApiKey();
        }
    }, [walletAddress, checkApiKey]);

    return {
        hasApiKey: state.hasApiKey,
        isLoading: state.isLoading,
        isImporting: state.isImporting,
        error: state.error,
        checkApiKey,
        importCredentials,
    };
};
