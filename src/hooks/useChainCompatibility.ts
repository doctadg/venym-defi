import { useCallback, useMemo } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import toast from 'react-hot-toast';
import { DexMode } from '../contexts/DexModeContext';

/**
 * Chain requirements for each exchange
 */
const EXCHANGE_CHAIN_REQUIREMENTS: Record<Exclude<DexMode, 'auto'>, 'SOL' | 'EVM'> = {
    pacifica: 'SOL',
    hyperliquid: 'EVM',
    aster: 'EVM',
    lighter: 'EVM',
    avantis: 'EVM',
};

/**
 * Hook to detect wallet chain compatibility with exchanges.
 * Provides helpers to check if current wallet supports an exchange
 * and show appropriate toast notifications.
 */
export const useChainCompatibility = () => {
    const { primaryWallet, setShowAuthFlow } = useDynamicContext();
    const userWallets = useUserWallets();

    // Check what chain types user has connected
    const hasSolanaWallet = useMemo(
        () => userWallets.some((w) => w.chain === 'SOL'),
        [userWallets]
    );
    const hasEVMWallet = useMemo(
        () => userWallets.some((w) => w.chain === 'EVM'),
        [userWallets]
    );

    // Current active wallet chain
    const currentChain = primaryWallet?.chain;
    const isSolanaActive = currentChain === 'SOL';
    const isEVMActive = currentChain === 'EVM';

    /**
     * Get the required chain for an exchange
     */
    const getRequiredChain = useCallback((exchange: DexMode): 'SOL' | 'EVM' | null => {
        if (exchange === 'auto') return null;
        return EXCHANGE_CHAIN_REQUIREMENTS[exchange];
    }, []);

    /**
     * Check if current wallet is compatible with an exchange
     */
    const isCompatible = useCallback(
        (exchange: DexMode): boolean => {
            if (exchange === 'auto') return true;
            if (!primaryWallet) return false;

            const required = EXCHANGE_CHAIN_REQUIREMENTS[exchange];
            return currentChain === required;
        },
        [primaryWallet, currentChain]
    );

    /**
     * Check if user has any wallet that supports the exchange
     */
    const hasCompatibleWallet = useCallback(
        (exchange: DexMode): boolean => {
            if (exchange === 'auto') return true;
            const required = EXCHANGE_CHAIN_REQUIREMENTS[exchange];
            return required === 'SOL' ? hasSolanaWallet : hasEVMWallet;
        },
        [hasSolanaWallet, hasEVMWallet]
    );

    /**
     * Get a friendly chain name for display
     */
    const getChainDisplayName = useCallback((chain: 'SOL' | 'EVM'): string => {
        return chain === 'SOL' ? 'Solana' : 'EVM';
    }, []);

    /**
     * Get a friendly exchange name for display
     */
    const getExchangeDisplayName = useCallback((exchange: DexMode): string => {
        if (exchange === 'auto') return 'Auto';
        return exchange.charAt(0).toUpperCase() + exchange.slice(1);
    }, []);

    /**
     * Show a toast notification about chain incompatibility.
     * Returns true if a toast was shown (incompatible), false if compatible.
     */
    const showChainIncompatibilityToast = useCallback(
        (exchange: DexMode): boolean => {
            if (exchange === 'auto') return false;
            if (isCompatible(exchange)) return false;

            const required = EXCHANGE_CHAIN_REQUIREMENTS[exchange];
            const chainName = getChainDisplayName(required);
            const exchangeName = getExchangeDisplayName(exchange);

            if (hasCompatibleWallet(exchange)) {
                // User has a compatible wallet but it's not active
                toast(
                    `Please switch to your ${chainName} wallet to trade on ${exchangeName}.`,
                    {
                        icon: '🔄',
                        duration: 5000,
                    }
                );
            } else {
                // User needs to connect a compatible wallet
                toast(
                    `${exchangeName} requires a ${chainName} wallet. Please connect a ${chainName} wallet.`,
                    {
                        icon: '⚠️',
                        duration: 5000,
                    }
                );
            }

            return true;
        },
        [isCompatible, hasCompatibleWallet, getChainDisplayName, getExchangeDisplayName]
    );

    /**
     * Show toast and optionally open wallet connector
     */
    const handleChainIncompatibility = useCallback(
        (exchange: DexMode, openConnector: boolean = false): boolean => {
            const wasIncompatible = showChainIncompatibilityToast(exchange);

            if (wasIncompatible && openConnector && !hasCompatibleWallet(exchange)) {
                // Small delay to let toast appear first
                setTimeout(() => {
                    setShowAuthFlow(true);
                }, 500);
            }

            return wasIncompatible;
        },
        [showChainIncompatibilityToast, hasCompatibleWallet, setShowAuthFlow]
    );

    return {
        // State
        currentChain,
        hasSolanaWallet,
        hasEVMWallet,
        isSolanaActive,
        isEVMActive,

        // Helpers
        getRequiredChain,
        isCompatible,
        hasCompatibleWallet,
        getChainDisplayName,
        getExchangeDisplayName,

        // Actions
        showChainIncompatibilityToast,
        handleChainIncompatibility,
    };
};
