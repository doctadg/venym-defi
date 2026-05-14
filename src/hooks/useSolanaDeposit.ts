import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { DEPOSIT_CONTRACTS, TOKEN_CONFIG } from '@/config/contracts';
import { trackAsterDeposit } from '@/services/api';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface SolanaDepositResult {
    success: boolean;
    signature?: string;
    error?: string;
}

export const useSolanaDeposit = () => {
    const { primaryWallet } = useDynamicContext();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const depositToAster = useCallback(async (
        token: 'USDC' | 'USDT',
        amount: string
    ): Promise<SolanaDepositResult> => {
        if (!primaryWallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        // Check if this is a Solana wallet
        const walletChain = primaryWallet.chain;
        if (walletChain !== 'SOL') {
            return { success: false, error: 'Please connect a Solana wallet for Solana deposits' };
        }

        setLoading(true);
        setStatus('Initializing...');

        try {
            const walletAddress = primaryWallet.address;
            if (!walletAddress) {
                throw new Error('No wallet address');
            }

            // Get token config
            const tokenConfig = TOKEN_CONFIG.solana[token];
            if (!tokenConfig || !tokenConfig.tokenVault) {
                throw new Error(`Token ${token} not supported for Solana deposits`);
            }

            const solanaConfig = DEPOSIT_CONTRACTS.solana;
            const connection = new Connection(SOLANA_RPC, 'confirmed');

            // Parse addresses
            const userPubkey = new PublicKey(walletAddress);
            const mintPubkey = new PublicKey(tokenConfig.mint);
            const vaultPubkey = new PublicKey(tokenConfig.tokenVault);

            // Get user's token account
            setStatus('Finding token account...');
            const userAta = await getAssociatedTokenAddress(mintPubkey, userPubkey);

            // Verify user has the token account
            try {
                await getAccount(connection, userAta);
            } catch {
                throw new Error(`No ${token} token account found. Please add ${token} to your wallet first.`);
            }

            // Calculate amount in base units
            const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, tokenConfig.decimals)));

            // Create transfer instruction
            setStatus('Building transaction...');
            const transferIx = createTransferInstruction(
                userAta,           // source
                vaultPubkey,       // destination (Aster vault)
                userPubkey,        // owner
                amountInBaseUnits,
                [],
                TOKEN_PROGRAM_ID
            );

            // Build transaction
            const transaction = new Transaction().add(transferIx);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = userPubkey;

            // Sign and send transaction using Dynamic wallet
            setStatus('Please approve in your wallet...');

            // @ts-ignore - Dynamic.xyz Solana wallet interface
            const signer = await primaryWallet.connector?.getSigner();
            if (!signer) {
                throw new Error('Could not get Solana signer');
            }

            // Sign transaction
            const signedTx = await signer.signTransaction(transaction);

            // Send transaction
            setStatus('Sending transaction...');
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Wait for confirmation
            setStatus('Waiting for confirmation...');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed on-chain');
            }

            // Track deposit with backend for auto-transfer to futures
            setStatus('Tracking deposit...');
            try {
                await trackAsterDeposit(walletAddress, amount, token);
            } catch (trackError) {
                console.warn('Failed to track deposit:', trackError);
                // Don't fail the deposit if tracking fails
            }

            setStatus('');
            setLoading(false);

            return {
                success: true,
                signature,
            };

        } catch (error: any) {
            console.error('Solana deposit error:', error);
            setStatus('');
            setLoading(false);

            let errorMessage = error.message || 'Unknown error';
            if (errorMessage.includes('User rejected')) {
                errorMessage = 'Transaction rejected by user';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }, [primaryWallet]);

    return {
        depositToAster,
        loading,
        status,
    };
};
