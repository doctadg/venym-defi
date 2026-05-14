import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApprovalState {
    hasApiKey: boolean | null;
    isLoading: boolean;
    isPreparing: boolean;
    isApproving: boolean;
    error: string | null;
    message: string | null;
    signerAddress: string | null;
}

export const useAsterSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address;

    const [state, setState] = useState<ApprovalState>({
        hasApiKey: null,
        isLoading: false,
        isPreparing: false,
        isApproving: false,
        error: null,
        message: null,
        signerAddress: null,
    });

    // Check if user has valid key
    const checkApiKey = useCallback(async () => {
        if (!walletAddress) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/aster/broker/has-api-key/${walletAddress}`
            );
            const data = await response.json();
            console.log('[useAsterSetup] checkApiKey response:', data);

            if (data.success) {
                console.log('[useAsterSetup] hasApiKey:', data.hasApiKey);
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

    // Step 1: Prepare approval (get message to sign)
    const prepareApproval = useCallback(async () => {
        if (!walletAddress) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return null;
        }

        setState(prev => ({ ...prev, isPreparing: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/aster/broker/prepare-approval`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    isPreparing: false,
                    message: data.data.message, // Backend returns { success, data: { nonce, message } }
                }));
                return data.data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isPreparing: false,
                error: error instanceof Error ? error.message : 'Failed to prepare approval',
            }));
            return null;
        }
    }, [walletAddress]);

    // Step 2: Sign and complete approval
    const completeApproval = useCallback(async () => {
        if (!walletAddress || !primaryWallet) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return false;
        }

        setState(prev => ({ ...prev, isApproving: true, error: null }));

        try {
            // Get message if not already prepared
            let message = state.message;
            if (!message) {
                const prepareResult = await prepareApproval();
                if (!prepareResult) return false;
                message = prepareResult.message;
            }

            // Get viem wallet client from Dynamic connector
            // @ts-ignore - connector types may vary
            const walletClient = await primaryWallet.connector?.getWalletClient();

            if (!walletClient) {
                throw new Error('Unable to get wallet client');
            }

            // Sign message using viem wallet client (Aster uses personal_sign, not typed data)
            const signature = await walletClient.signMessage({
                account: walletAddress as `0x${string}`,
                message: message as string,
            });

            if (!signature) {
                throw new Error('User rejected signature');
            }

            // Send signature to backend to complete approval
            const response = await fetch(
                `${API_BASE_URL}/api/aster/broker/complete-approval`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress,
                        signature,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    isApproving: false,
                    hasApiKey: true,
                    message: null,
                    signerAddress: data.data?.signerAddress || data.signerAddress, // Backend wraps in data field
                }));
                return true;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isApproving: false,
                error: error instanceof Error ? error.message : 'Failed to complete approval',
            }));
            return false;
        }
    }, [walletAddress, primaryWallet, state.message, prepareApproval]);

    // Combined function: prepare + sign + complete in one step
    const enableTrading = useCallback(async () => {
        const prepared = await prepareApproval();
        if (!prepared) return false;
        return completeApproval();
    }, [prepareApproval, completeApproval]);

    return {
        ...state,
        walletAddress,
        checkApiKey,
        prepareApproval,
        completeApproval,
        enableTrading,
    };
};
