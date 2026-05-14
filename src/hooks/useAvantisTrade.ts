import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { base } from 'viem/chains';
import { Attribution } from 'ox/erc8021';
import { BASE_CHAIN_ID, BASE_BUILDER_CODE } from '../services/avantis/constants';

// ERC-8021: Generate dataSuffix for Base Builder Code attribution
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BASE_BUILDER_CODE] });
import {
    openAvantisTrade,
    closeAvantisTrade,
    closeAvantisTradeBySymbol,
    type AvantisTradeParams,
    type AvantisCloseParams,
    type AvantisTradeResult,
} from '../services/avantis/trade';

const BASE_CHAIN_ID_HEX = `0x${BASE_CHAIN_ID.toString(16)}`;

/**
 * Switch the wallet to Base network.
 * Uses wallet_switchEthereumChain, falling back to wallet_addEthereumChain
 * if the chain hasn't been added to the user's wallet yet.
 */
async function ensureBaseNetwork(provider: any): Promise<void> {
    try {
        // Check current chain
        const currentChainId: string = await provider.request({ method: 'eth_chainId' });
        if (currentChainId.toLowerCase() === BASE_CHAIN_ID_HEX.toLowerCase()) {
            return; // Already on Base
        }

        // Try switching
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
    } catch (switchError: any) {
        // 4902 = chain not added to wallet yet
        if (switchError?.code === 4902) {
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
        } else if (switchError?.code === 4001) {
            throw new Error('Network switch to Base was rejected. Avantis requires the Base network.');
        } else {
            throw new Error(
                `Failed to switch to Base network: ${switchError?.message || 'Unknown error'}`
            );
        }
    }
}

/**
 * Hook for executing Avantis trades via client-side wallet signing.
 * Gets a viem WalletClient from Dynamic SDK and calls Avantis contracts directly.
 * Automatically switches the wallet to Base network before any signing operation.
 */
export const useAvantisTrade = () => {
    const { primaryWallet } = useDynamicContext();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Get a viem WalletClient from the Dynamic SDK wallet.
     * Ensures the wallet is on Base network before returning.
     */
    const getWalletClient = useCallback(async (): Promise<WalletClient> => {
        if (!primaryWallet) {
            throw new Error('Wallet not connected');
        }

        if (primaryWallet.chain !== 'EVM') {
            throw new Error('Please connect an EVM wallet to trade on Avantis');
        }

        // Get the ethereum provider from Dynamic SDK
        const connector = primaryWallet.connector;
        if (!connector) {
            throw new Error('Wallet connector not available');
        }

        // Dynamic SDK exposes the underlying provider via getSigner or getWalletClient
        let walletClientDirect: WalletClient | null = null;
        let provider: any = null;

        try {
            // Try to get the raw provider from the connector
            const wc = await (connector as any).getWalletClient?.();
            if (wc) walletClientDirect = wc as WalletClient;
        } catch {
            // Fallback: try getting the provider directly
        }

        if (!walletClientDirect) {
            try {
                provider = await (connector as any).getSigner?.();
            } catch {
                // Continue to next fallback
            }

            if (!provider) {
                try {
                    provider = await (connector as any).getProvider?.();
                } catch {
                    throw new Error('Could not get wallet provider from Dynamic SDK');
                }
            }

            if (!provider) {
                throw new Error('Could not get wallet provider');
            }
        }

        // Get the raw provider for network switching
        const rawProvider = walletClientDirect
            ? (walletClientDirect as any).transport?.value ?? await (connector as any).getProvider?.()
            : provider;

        // Switch to Base network if not already on it
        if (rawProvider?.request) {
            await ensureBaseNetwork(rawProvider);
        }

        // If we got a WalletClient directly, re-wrap it with dataSuffix for Base Builder Code attribution
        if (walletClientDirect) {
            const account = walletClientDirect.account ?? primaryWallet.address as `0x${string}`;
            const transport = (walletClientDirect as any).transport;
            return createWalletClient({
                account,
                chain: base,
                transport: custom(transport),
                dataSuffix: DATA_SUFFIX,
            });
        }

        // Create viem wallet client from the provider with Base Builder Code attribution
        const walletClient = createWalletClient({
            account: primaryWallet.address as `0x${string}`,
            chain: base,
            transport: custom(provider),
            dataSuffix: DATA_SUFFIX,
        });

        return walletClient;
    }, [primaryWallet]);

    /**
     * Open a position on Avantis
     */
    const openPosition = useCallback(async (
        params: AvantisTradeParams
    ): Promise<AvantisTradeResult> => {
        setIsLoading(true);
        setError(null);

        try {
            const walletClient = await getWalletClient();
            const result = await openAvantisTrade(walletClient, params);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to open Avantis position';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getWalletClient]);

    /**
     * Close a position on Avantis
     */
    const closePosition = useCallback(async (
        params: AvantisCloseParams
    ): Promise<string> => {
        setIsLoading(true);
        setError(null);

        try {
            const walletClient = await getWalletClient();
            const txHash = await closeAvantisTrade(walletClient, params);
            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to close Avantis position';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getWalletClient]);

    /**
     * Close a position by symbol and direction (used by PositionsTable)
     */
    const closeBySymbol = useCallback(async (
        symbol: string,
        direction: 'LONG' | 'SHORT'
    ): Promise<string> => {
        setIsLoading(true);
        setError(null);

        try {
            const walletClient = await getWalletClient();
            const txHash = await closeAvantisTradeBySymbol(walletClient, symbol, direction);
            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to close Avantis position';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getWalletClient]);

    return {
        openPosition,
        closePosition,
        closeBySymbol,
        isLoading,
        error,
    };
};
