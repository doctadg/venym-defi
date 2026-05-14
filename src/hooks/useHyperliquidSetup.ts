import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApprovalState {
    hasApiKey: boolean | null;
    isLoading: boolean;
    isPreparing: boolean;
    isApproving: boolean;
    error: string | null;
    typedData: any | null;
    apiWalletAddress: string | null;
}

export const useHyperliquidSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address;

    const [state, setState] = useState<ApprovalState>({
        hasApiKey: null,
        isLoading: false,
        isPreparing: false,
        isApproving: false,
        error: null,
        typedData: null,
        apiWalletAddress: null,
    });

    // Check if user has valid API key
    const checkApiKey = useCallback(async () => {
        if (!walletAddress) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/trading/hyperliquid/check-apikey/${walletAddress}`
            );
            const data = await response.json();
            console.log('[useHyperliquidSetup] checkApiKey response:', data);

            if (data.success) {
                console.log('[useHyperliquidSetup] hasValidApiKey:', data.data.hasValidApiKey);
                setState(prev => ({
                    ...prev,
                    hasApiKey: data.data.hasValidApiKey,
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

    // Step 1: Prepare approval (get typed data to sign)
    const prepareApproval = useCallback(async () => {
        if (!walletAddress) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return null;
        }

        setState(prev => ({ ...prev, isPreparing: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/trading/hyperliquid/prepare-approval`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress,
                        apiWalletName: 'TideAG',
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    isPreparing: false,
                    typedData: data.data.typedData,
                    apiWalletAddress: data.data.apiWalletAddress,
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
            // Get typed data if not already prepared
            let typedData = state.typedData;
            if (!typedData) {
                const prepareResult = await prepareApproval();
                if (!prepareResult) return false;
                typedData = prepareResult.typedData;
            }

            // Get viem wallet client from Dynamic connector
            // @ts-ignore - connector types may vary
            const walletClient = await primaryWallet.connector?.getWalletClient();

            if (!walletClient) {
                throw new Error('Unable to get wallet client');
            }

            // Sign typed data using viem wallet client
            const signature = await walletClient.signTypedData({
                account: walletAddress as `0x${string}`,
                domain: typedData.domain,
                types: typedData.types,
                primaryType: typedData.primaryType,
                message: typedData.message,
            });

            if (!signature) {
                throw new Error('User rejected signature');
            }

            // Send signature to backend to complete approval
            const response = await fetch(
                `${API_BASE_URL}/api/trading/hyperliquid/complete-approval`,
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
                    typedData: null,
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
    }, [walletAddress, primaryWallet, state.typedData, prepareApproval]);

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
