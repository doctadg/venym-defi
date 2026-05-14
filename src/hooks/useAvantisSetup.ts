import { useState, useCallback, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { BASE_CHAIN_ID } from '../services/avantis/constants';

const BASE_CHAIN_ID_HEX = `0x${BASE_CHAIN_ID.toString(16)}`;

/**
 * Avantis setup hook.
 * 
 * Unlike other exchanges that require API keys or delegation setup,
 * Avantis trades are signed directly by the user's wallet on Base.
 * This hook checks that an EVM wallet is connected and switches to Base network.
 */
export const useAvantisSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address;
    const isEVMWallet = primaryWallet?.chain === 'EVM';

    const [state, setState] = useState({
        hasApiKey: false,
        isLoading: false,
        isApproving: false,
        error: null as string | null,
    });

    /**
     * Switch wallet to Base network if needed
     */
    const switchToBase = useCallback(async (): Promise<boolean> => {
        if (!primaryWallet || !isEVMWallet) return false;

        try {
            const connector = primaryWallet.connector;
            if (!connector) return false;

            const provider = await (connector as any).getProvider?.();
            if (!provider?.request) return false;

            const currentChainId: string = await provider.request({ method: 'eth_chainId' });
            if (currentChainId.toLowerCase() === BASE_CHAIN_ID_HEX.toLowerCase()) {
                return true; // Already on Base
            }

            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_CHAIN_ID_HEX }],
                });
                return true;
            } catch (switchErr: any) {
                if (switchErr?.code === 4902) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: BASE_CHAIN_ID_HEX,
                            chainName: 'Base',
                            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://mainnet.base.org'],
                            blockExplorerUrls: ['https://basescan.org'],
                        }],
                    });
                    return true;
                }
                throw switchErr;
            }
        } catch (err: any) {
            console.error('Failed to switch to Base:', err);
            return false;
        }
    }, [primaryWallet, isEVMWallet]);

    /**
     * Check if wallet is ready for Avantis trading.
     * No API key needed — just an EVM wallet.
     */
    const checkApiKey = useCallback(async (): Promise<boolean> => {
        if (!walletAddress || !isEVMWallet) {
            setState(prev => ({ ...prev, hasApiKey: false, isLoading: false }));
            return false;
        }

        setState(prev => ({ ...prev, hasApiKey: true, isLoading: false }));
        return true;
    }, [walletAddress, isEVMWallet]);

    /**
     * Enable trading — switches to Base network and confirms readiness.
     */
    const enableTrading = useCallback(async (): Promise<boolean> => {
        if (!walletAddress || !isEVMWallet) {
            setState(prev => ({
                ...prev,
                error: 'Please connect an EVM wallet to trade on Avantis',
            }));
            return false;
        }

        setState(prev => ({ ...prev, isApproving: true, error: null }));

        try {
            // Proactively switch to Base network
            const switched = await switchToBase();
            if (!switched) {
                setState(prev => ({
                    ...prev,
                    isApproving: false,
                    error: 'Please switch your wallet to Base network to trade on Avantis',
                }));
                return false;
            }

            setState(prev => ({ ...prev, hasApiKey: true, isApproving: false, error: null }));
            return true;
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                isApproving: false,
                error: err?.code === 4001
                    ? 'Network switch was rejected. Avantis requires Base network.'
                    : `Failed to switch to Base: ${err?.message || 'Unknown error'}`,
            }));
            return false;
        }
    }, [walletAddress, isEVMWallet, switchToBase]);

    // Auto-check when wallet changes
    useEffect(() => {
        if (walletAddress && isEVMWallet) {
            setState(prev => ({ ...prev, hasApiKey: true, isLoading: false }));
        } else {
            setState({
                hasApiKey: false,
                isLoading: false,
                isApproving: false,
                error: null,
            });
        }
    }, [walletAddress, isEVMWallet]);

    return {
        hasApiKey: state.hasApiKey,
        isLoading: state.isLoading,
        isApproving: state.isApproving,
        error: state.error,
        walletAddress,

        checkApiKey,
        enableTrading,
    };
};
