import { useState, useCallback, useEffect } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PACIFICA_API_URL = 'https://api.pacifica.fi/api/v1';

interface PacificaApiKey {
    id: string;
    solanaPublicKey: string;
    network: string;
    isActive: boolean;
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
}

interface SetupState {
    hasApiKey: boolean;
    isLoading: boolean;
    isGenerating: boolean;
    error: string | null;
    apiKey: PacificaApiKey | null;
    hasSolanaWallet: boolean;
}

/**
 * Helper to sign a message for Pacifica API
 */
function signPacificaMessage(
    header: { timestamp: number; expiry_window: number; type: string },
    payload: Record<string, unknown>,
    keypair: Keypair
): { signature: string } {
    const headerBytes = Buffer.from(JSON.stringify(header));
    const payloadBytes = Buffer.from(JSON.stringify(payload));
    const message = Buffer.concat([headerBytes, payloadBytes]);

    const signature = nacl.sign.detached(message, keypair.secretKey);
    return { signature: bs58.encode(signature) };
}

/**
 * Hook for Pacifica DEX setup.
 * 
 * Flow:
 * 1. User connects wallet to frontend (handled by Dynamic SDK)
 * 2. If user has Solana wallet connected → generate API key client-side
 * 3. If user only has EVM wallet → use server-side generation (requires server wallet)
 * 
 * For client-side generation:
 * - Generate a new Solana keypair (agent wallet) in the browser
 * - User signs the bind request with their connected Solana wallet
 * - Agent wallet is stored locally and in backend for reference
 */
export const usePacificaSetup = () => {
    const { primaryWallet } = useDynamicContext();
    const walletAddress = primaryWallet?.address;
    const isSolanaWallet = primaryWallet?.chain === 'SOL';

    const [state, setState] = useState<SetupState>({
        hasApiKey: false,
        isLoading: false,
        isGenerating: false,
        error: null,
        apiKey: null,
        hasSolanaWallet: false,
    });

    // Update hasSolanaWallet when wallet changes
    useEffect(() => {
        setState(prev => ({ ...prev, hasSolanaWallet: isSolanaWallet }));
    }, [isSolanaWallet]);

    /**
     * Get auth headers for API calls
     */
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (walletAddress) {
            headers['x-wallet-id'] = walletAddress;
        }
        return headers;
    }, [walletAddress]);

    /**
     * Check if user already has an active Pacifica API key
     */
    const checkApiKey = useCallback(async (): Promise<boolean> => {
        if (!walletAddress) return false;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/pacifica/apikey/${walletAddress}`,
                { headers: getHeaders() }
            );
            const data = await response.json();

            if (data.success && data.data) {
                const hasActive = data.data.isActive === true;
                setState(prev => ({
                    ...prev,
                    hasApiKey: hasActive,
                    apiKey: data.data,
                    isLoading: false,
                }));
                return hasActive;
            } else {
                // No API key found
                setState(prev => ({
                    ...prev,
                    hasApiKey: false,
                    apiKey: null,
                    isLoading: false,
                }));
                return false;
            }
        } catch (error) {
            console.error('[usePacificaSetup] Error checking API key:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                hasApiKey: false,
                error: error instanceof Error ? error.message : 'Failed to check API key',
            }));
            return false;
        }
    }, [walletAddress, getHeaders]);

    /**
     * Generate API key using connected Solana wallet (client-side)
     * This is the preferred method when user has a Solana wallet connected.
     */
    const generateApiKeyClientSide = useCallback(async (): Promise<boolean> => {
        if (!primaryWallet || !isSolanaWallet || !walletAddress) {
            setState(prev => ({ ...prev, error: 'Solana wallet not connected' }));
            return false;
        }

        setState(prev => ({ ...prev, isGenerating: true, error: null }));

        try {
            console.log('[usePacificaSetup] Generating API key client-side with Solana wallet');

            // Step 1: Generate a new agent wallet keypair
            const agentKeypair = Keypair.generate();
            const agentPublicKey = agentKeypair.publicKey.toBase58();
            const agentPrivateKey = bs58.encode(agentKeypair.secretKey);

            console.log('[usePacificaSetup] Generated agent wallet:', agentPublicKey);

            // Step 2: Create bind message
            const timestamp = Date.now();
            const signatureHeader = {
                timestamp,
                expiry_window: 5_000,
                type: 'bind_agent_wallet',
            };
            const signaturePayload = {
                agent_wallet: agentPublicKey,
            };

            // Step 3: Sign with user's connected Solana wallet
            // @ts-ignore - Dynamic.xyz Solana wallet interface
            const signer = await primaryWallet.connector?.getSigner();
            if (!signer) {
                throw new Error('Could not get Solana signer');
            }

            // Create message in Pacifica's expected format:
            // {data: {...}, expiry_window, timestamp, type} with keys sorted alphabetically
            const messageObject = {
                data: signaturePayload,
                expiry_window: signatureHeader.expiry_window,
                timestamp: signatureHeader.timestamp,
                type: signatureHeader.type,
            };

            // Pacifica requires sorted keys - this object already has them in alphabetical order
            const messageStr = JSON.stringify(messageObject);
            const messageToSign = new TextEncoder().encode(messageStr);

            console.log('[usePacificaSetup] Signing message:', messageStr);

            // Sign message with user's wallet
            const signResult = await signer.signMessage(messageToSign);

            // Handle different return formats from Dynamic wallet
            let signatureBytes: Uint8Array;
            if (signResult instanceof Uint8Array) {
                signatureBytes = signResult;
            } else if (signResult?.signature instanceof Uint8Array) {
                signatureBytes = signResult.signature;
            } else if (typeof signResult === 'object' && signResult !== null) {
                // Try to extract signature from object
                const sig = (signResult as any).signature || signResult;
                signatureBytes = sig instanceof Uint8Array ? sig : new Uint8Array(Object.values(sig));
            } else {
                throw new Error('Unexpected signature format from wallet');
            }

            const signature = bs58.encode(signatureBytes);

            console.log('[usePacificaSetup] Message signed, binding agent wallet...');

            // Step 4: Call Pacifica API to bind agent wallet
            const bindResponse = await fetch(`${PACIFICA_API_URL}/agent/bind`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: walletAddress,
                    signature,
                    timestamp: signatureHeader.timestamp,
                    expiry_window: signatureHeader.expiry_window,
                    agent_wallet: agentPublicKey,
                }),
            });

            if (!bindResponse.ok) {
                const errorData = await bindResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to bind agent wallet: ${bindResponse.status}`);
            }

            console.log('[usePacificaSetup] Agent wallet bound successfully');

            // Step 5: Store the API key in our backend for reference
            const storeResponse = await fetch(
                `${API_BASE_URL}/api/pacifica/apikey/${walletAddress}/store`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        solanaPublicKey: agentPublicKey,
                        solanaPrivateKey: agentPrivateKey,
                        network: 'mainnet',
                        isClientGenerated: true,
                    }),
                }
            );

            const storeData = await storeResponse.json();

            if (!storeData.success) {
                console.warn('[usePacificaSetup] Failed to store API key in backend:', storeData.error);
                // Continue anyway - the agent wallet is bound on Pacifica
            }

            setState(prev => ({
                ...prev,
                isGenerating: false,
                hasApiKey: true,
                apiKey: {
                    id: storeData.data?.id || 'client-generated',
                    solanaPublicKey: agentPublicKey,
                    network: 'mainnet',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    expiresAt: null,
                    lastUsedAt: null,
                },
                error: null,
            }));

            // Store agent private key in localStorage for trading
            // This is encrypted in production
            localStorage.setItem(`pacifica_agent_${walletAddress}`, agentPrivateKey);

            return true;
        } catch (error) {
            console.error('[usePacificaSetup] Error generating API key client-side:', error);
            setState(prev => ({
                ...prev,
                isGenerating: false,
                error: error instanceof Error ? error.message : 'Failed to generate API key',
            }));
            return false;
        }
    }, [primaryWallet, isSolanaWallet, walletAddress, getHeaders]);

    /**
     * Generate API key using server-side generation (for EVM-only wallets)
     */
    const generateApiKeyServerSide = useCallback(async (): Promise<boolean> => {
        if (!walletAddress) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return false;
        }

        setState(prev => ({ ...prev, isGenerating: true, error: null }));

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/pacifica/apikey/${walletAddress}/generate`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        expiryDays: 0, // Never expires
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                console.log('[usePacificaSetup] API key generated:', data.data.solanaPublicKey);

                setState(prev => ({
                    ...prev,
                    isGenerating: false,
                    hasApiKey: true,
                    apiKey: {
                        id: data.data.id,
                        solanaPublicKey: data.data.solanaPublicKey,
                        network: data.data.network,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        expiresAt: data.data.expiresAt,
                        lastUsedAt: null,
                    },
                    error: null,
                }));
                return true;
            } else {
                // Handle specific error cases
                const errorMsg = data.error || 'Failed to generate API key';

                // Check if key already exists
                if (errorMsg.includes('already exists')) {
                    // Refresh the key info
                    await checkApiKey();
                    return true;
                }

                // Check for SVM wallet not initialized error
                if (errorMsg.includes('SVM wallet not initialized') || errorMsg.includes('Invalid encrypted data')) {
                    throw new Error(
                        'Server wallet not available for Pacifica. Please connect a Solana wallet (like Phantom) to enable trading.'
                    );
                }

                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('[usePacificaSetup] Error generating API key:', error);
            setState(prev => ({
                ...prev,
                isGenerating: false,
                error: error instanceof Error ? error.message : 'Failed to generate API key',
            }));
            return false;
        }
    }, [walletAddress, getHeaders, checkApiKey]);

    /**
     * Generate a new Pacifica API key
     * Automatically chooses client-side or server-side based on wallet type
     */
    const generateApiKey = useCallback(async (): Promise<boolean> => {
        if (isSolanaWallet) {
            console.log('[usePacificaSetup] Using client-side generation (Solana wallet detected)');
            return generateApiKeyClientSide();
        } else {
            console.log('[usePacificaSetup] Using server-side generation (EVM wallet)');
            return generateApiKeyServerSide();
        }
    }, [isSolanaWallet, generateApiKeyClientSide, generateApiKeyServerSide]);

    /**
     * One-click enable trading: checks for existing key, generates if needed
     */
    const enableTrading = useCallback(async (): Promise<boolean> => {
        if (!walletAddress) {
            setState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return false;
        }

        // First check if we already have a key
        const hasKey = await checkApiKey();
        if (hasKey) {
            return true;
        }

        // No active key, generate one
        return generateApiKey();
    }, [walletAddress, checkApiKey, generateApiKey]);

    // Auto-check for API key when wallet changes
    useEffect(() => {
        if (walletAddress) {
            checkApiKey();
        } else {
            setState({
                hasApiKey: false,
                isLoading: false,
                isGenerating: false,
                error: null,
                apiKey: null,
                hasSolanaWallet: false,
            });
        }
    }, [walletAddress, checkApiKey]);

    return {
        // State
        hasApiKey: state.hasApiKey,
        isLoading: state.isLoading,
        isGenerating: state.isGenerating,
        error: state.error,
        apiKey: state.apiKey,
        walletAddress,
        hasSolanaWallet: state.hasSolanaWallet,

        // The Solana trading address (agent wallet for trading)
        tradingAddress: state.apiKey?.solanaPublicKey || null,

        // Actions
        checkApiKey,
        generateApiKey,
        generateApiKeyClientSide,
        generateApiKeyServerSide,
        enableTrading,
    };
};
