import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTrading } from '../hooks/useTrading';
import { trackAsterDeposit, getAsterDepositStatus, AsterDepositStatus, withdrawFunds } from '../services/api';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { parseUnits, createPublicClient, http } from 'viem';
import { DEPOSIT_CONTRACTS, ERC20_ABI, DEPOSIT_CONTRACT_ABI, TOKEN_CONFIG, HYPERLIQUID_DEPOSIT_CONTRACTS } from '../config/contracts';
import { mainnet, arbitrum, bsc, sepolia, arbitrumSepolia } from 'viem/chains';
import { useSolanaDeposit } from '../hooks/useSolanaDeposit';
import { usePacificaSetup } from '../hooks/usePacificaSetup';
import { motion, AnimatePresence } from 'framer-motion';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDepositSuccess?: () => void;
    exchange: string;
    walletAddress: string;
}

type ModalMode = 'deposit' | 'withdraw';

const DepositModal = ({ isOpen, onClose, onDepositSuccess, exchange, walletAddress }: DepositModalProps) => {
    const [mode, setMode] = useState<ModalMode>('deposit');
    const [amount, setAmount] = useState('');
    const [token, setToken] = useState('USDC');
    const [selectedExchange, setSelectedExchange] = useState(exchange);
    const { executeDeposit, loading: apiLoading, error: apiError } = useTrading();
    const [localLoading, setLocalLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [depositPolling, setDepositPolling] = useState(false);

    const { primaryWallet, network } = useDynamicContext();
    const { depositToAster: depositSolanaToAster, loading: solanaLoading, status: solanaStatus } = useSolanaDeposit();
    const { tradingAddress: pacificaTradingAddress, hasApiKey: hasPacificaApiKey, enableTrading: enablePacificaTrading, isGenerating: pacificaIsGenerating } = usePacificaSetup();

    // Detect if using Solana wallet
    const isSolanaWallet = primaryWallet?.chain === 'SOL';

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setStatus('');
            setLocalLoading(false);
            setSelectedExchange(exchange);
        }
    }, [isOpen, exchange]);

    // Cleanup polling on unmount or close
    useEffect(() => {
        return () => {
            setDepositPolling(false);
        };
    }, []);

    if (!isOpen) return null;

    const getChain = (chainId: number) => {
        if (chainId === 1) return mainnet;
        if (chainId === 42161) return arbitrum;
        if (chainId === 56) return bsc;
        if (chainId === 11155111) return sepolia;
        if (chainId === 421614) return arbitrumSepolia;
        return mainnet;
    };

    const handleDeposit = async () => {
        if (!primaryWallet) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        // Handle Solana deposits for Aster
        if (isSolanaWallet && selectedExchange.toLowerCase() === 'aster') {
            if (token !== 'USDC' && token !== 'USDT') {
                toast.error('Only USDC and USDT supported for Solana deposits');
                return;
            }

            const result = await depositSolanaToAster(token as 'USDC' | 'USDT', amount);

            if (result.success) {
                toast.success(`Deposit successful! TX: ${result.signature?.slice(0, 8)}...`);
                if (onDepositSuccess) {
                    onDepositSuccess();
                } else {
                    onClose();
                }
            } else {
                toast.error(`Deposit failed: ${result.error}`);
            }
            return;
        }

        // Handle Pacifica deposits (Solana SPL transfer to trading address)
        if (selectedExchange.toLowerCase() === 'pacifica') {
            if (!isSolanaWallet) {
                toast.error('Pacifica requires a Solana wallet. Please connect a Solana wallet.');
                return;
            }

            if (token !== 'USDC') {
                toast.error('Only USDC supported for Pacifica deposits');
                return;
            }

            // Ensure trading is enabled (API key exists)
            if (!hasPacificaApiKey) {
                setLocalLoading(true);
                setStatus('Setting up Pacifica trading account...');
                const setupSuccess = await enablePacificaTrading();
                if (!setupSuccess) {
                    setLocalLoading(false);
                    setStatus('');
                    toast.error('Failed to setup Pacifica trading. Please try again.');
                    return;
                }
            }

            if (!pacificaTradingAddress) {
                toast.error('Pacifica trading address not available. Please try again.');
                return;
            }

            setLocalLoading(true);
            setStatus('Preparing Pacifica deposit...');

            try {
                const walletAddress = primaryWallet.address;
                if (!walletAddress) throw new Error('No wallet address');

                // USDC on Solana mainnet
                const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
                const USDC_DECIMALS = 6;

                const connection = new Connection(SOLANA_RPC, 'confirmed');
                const userPubkey = new PublicKey(walletAddress);
                const mintPubkey = new PublicKey(USDC_MINT);
                const destinationPubkey = new PublicKey(pacificaTradingAddress);

                // Get user's token account
                setStatus('Finding token account...');
                const userAta = await getAssociatedTokenAddress(mintPubkey, userPubkey);

                // Verify user has the token account
                try {
                    await getAccount(connection, userAta);
                } catch {
                    throw new Error('No USDC token account found. Please add USDC to your wallet first.');
                }

                // Get destination token account (Pacifica trading address)
                const destAta = await getAssociatedTokenAddress(mintPubkey, destinationPubkey);

                // Calculate amount in base units
                const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, USDC_DECIMALS)));

                // Create transfer instruction
                setStatus('Building transaction...');
                const transferIx = createTransferInstruction(
                    userAta,           // source
                    destAta,           // destination (Pacifica trading address)
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

                // Sign and send transaction
                setStatus('Please approve in your wallet...');
                // @ts-ignore - Dynamic.xyz Solana wallet interface
                const signer = await primaryWallet.connector?.getSigner();
                if (!signer) throw new Error('Could not get Solana signer');

                const signedTx = await signer.signTransaction(transaction);

                setStatus('Sending transaction...');
                const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                });

                setStatus('Waiting for confirmation...');
                const confirmation = await connection.confirmTransaction(signature, 'confirmed');

                if (confirmation.value.err) {
                    throw new Error('Transaction failed on-chain');
                }

                setLocalLoading(false);
                setStatus('');
                toast.success(`Deposit successful! TX: ${signature.slice(0, 8)}...`);
                if (onDepositSuccess) {
                    onDepositSuccess();
                } else {
                    onClose();
                }
            } catch (error: any) {
                console.error('Pacifica deposit error:', error);
                let errorMessage = error.message || 'Unknown error';
                if (errorMessage.includes('User rejected')) {
                    errorMessage = 'Transaction rejected by user';
                }
                toast.error(`Deposit failed: ${errorMessage}`);
                setLocalLoading(false);
                setStatus('');
            }
            return;
        }

        setLocalLoading(true);
        setStatus('Initializing...');

        try {
            // @ts-ignore
            const walletClient = await primaryWallet.connector.getWalletClient();
            if (!walletClient) throw new Error('No wallet client available');

            const chainId = await walletClient.getChainId();
            console.log('Detected chainId:', chainId);

            // Determine network key based on chainId
            let networkKey: keyof typeof DEPOSIT_CONTRACTS | null = null;
            if (chainId === 1) networkKey = 'ethereum';
            else if (chainId === 42161) networkKey = 'arbitrum';
            else if (chainId === 56) networkKey = 'bnb';
            else if (chainId === 11155111) networkKey = 'sepolia';
            else if (chainId === 421614) networkKey = 'arbitrumSepolia';

            if (!networkKey) throw new Error('Unsupported network. Please switch to Ethereum, Arbitrum, or BNB Chain.');

            // Validate exchange/network compatibility
            const exchangeLower = selectedExchange.toLowerCase();
            if (exchangeLower === 'hyperliquid' && !['arbitrum', 'arbitrumSepolia'].includes(networkKey)) {
                throw new Error('Hyperliquid deposits require Arbitrum network. Please switch networks.');
            }
            if (exchangeLower === 'lighter' && !['ethereum', 'arbitrum'].includes(networkKey)) {
                throw new Error('Lighter deposits require Ethereum mainnet or Arbitrum. Please switch networks.');
            }
            if (exchangeLower === 'aster' && !['arbitrum', 'bnb'].includes(networkKey)) {
                throw new Error('Aster deposits require Arbitrum, BNB Chain, or Solana. Please switch networks.');
            }

            // Get contract config
            let contractConfig;
            if (exchangeLower === 'hyperliquid') {
                // @ts-ignore
                contractConfig = HYPERLIQUID_DEPOSIT_CONTRACTS[networkKey];
                if (!contractConfig) throw new Error(`Hyperliquid not supported on ${networkKey}`);
            } else {
                // @ts-ignore
                contractConfig = DEPOSIT_CONTRACTS[networkKey];
            }

            if (!contractConfig) throw new Error(`Deposit not supported on ${networkKey}`);

            // Get Token Config
            // @ts-ignore
            const tokenInfo = TOKEN_CONFIG[networkKey]?.[token];
            if (!tokenInfo) throw new Error(`Token ${token} not supported on ${networkKey}`);

            const publicClient = createPublicClient({
                chain: getChain(chainId),
                transport: http()
            });

            const amountBigInt = parseUnits(amount, tokenInfo.decimals);
            const spender = contractConfig.address;

            // 1. Check Token Balance FIRST (prevents gas estimation errors)
            setStatus('Checking balance...');
            const balance = await publicClient.readContract({
                address: tokenInfo.address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`]
            }) as bigint;

            if (balance < amountBigInt) {
                const balanceFormatted = (Number(balance) / 10 ** tokenInfo.decimals).toFixed(2);
                throw new Error(`Insufficient ${token} balance. You have ${balanceFormatted} ${token}.`);
            }

            // 2. Check & Handle Allowance
            setStatus('Checking allowance...');
            const allowance = await publicClient.readContract({
                address: tokenInfo.address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [walletAddress as `0x${string}`, spender as `0x${string}`]
            }) as bigint;

            if (allowance < amountBigInt) {
                setStatus('Approving token spend...');
                const approveHash = await walletClient.writeContract({
                    address: tokenInfo.address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [spender as `0x${string}`, amountBigInt],
                    chain: getChain(chainId),
                    account: walletAddress as `0x${string}`
                });
                setStatus('Waiting for approval confirmation...');
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }

            // 3. Execute Deposit Transaction Directly (let wallet handle gas estimation)
            setStatus('Executing deposit...');

            let depositHash: `0x${string}`;

            if (exchangeLower === 'hyperliquid') {
                // Hyperliquid: Direct ERC20 transfer to bridge address
                depositHash = await walletClient.writeContract({
                    address: tokenInfo.address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'transfer',
                    args: [contractConfig.address as `0x${string}`, amountBigInt],
                    chain: getChain(chainId),
                    account: walletAddress as `0x${string}`
                });
            } else {
                // Lighter / Aster: Use deposit contract
                depositHash = await walletClient.writeContract({
                    address: contractConfig.address as `0x${string}`,
                    abi: DEPOSIT_CONTRACT_ABI,
                    functionName: 'deposit',
                    args: [tokenInfo.address as `0x${string}`, amountBigInt, BigInt(1000)],
                    chain: getChain(chainId),
                    account: walletAddress as `0x${string}`
                });
            }

            // 4. Wait for deposit confirmation
            setStatus('Waiting for deposit confirmation...');
            const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });

            if (receipt.status === 'success') {
                // For Aster: Start tracking deposit for automatic spot-to-futures transfer
                if (exchangeLower === 'aster') {
                    setStatus('Deposit confirmed! Waiting for funds to arrive in Aster...');

                    // Notify backend to start tracking
                    try {
                        const trackResult = await trackAsterDeposit(walletAddress, amount, token);
                        if (!trackResult.success) {
                            console.warn('Failed to start deposit tracking:', trackResult.error);
                        }
                    } catch (err) {
                        console.warn('Error starting deposit tracking:', err);
                    }

                    // Start polling for status
                    setDepositPolling(true);
                    let pollCount = 0;
                    const maxPolls = 360; // 30 minutes at 5s intervals

                    const pollStatus = async () => {
                        if (pollCount >= maxPolls) {
                            setDepositPolling(false);
                            setLocalLoading(false);
                            setStatus('Deposit timed out. Please check your Aster account.');
                            return;
                        }

                        try {
                            const statusResult = await getAsterDepositStatus(walletAddress, token);
                            const depositStatus = statusResult.data;

                            if (depositStatus) {
                                setStatus(depositStatus.message || `Status: ${depositStatus.status}`);

                                if (depositStatus.status === 'complete') {
                                    setDepositPolling(false);
                                    setLocalLoading(false);
                                    setStatus('');
                                    toast.success(`Deposit successful! Funds transferred to Futures account. TX: ${depositHash}`);
                                    if (onDepositSuccess) {
                                        onDepositSuccess();
                                    } else {
                                        onClose();
                                    }
                                    return;
                                } else if (depositStatus.status === 'failed') {
                                    setDepositPolling(false);
                                    setLocalLoading(false);
                                    toast.error(`Deposit arrived but transfer to Futures failed. TX: ${depositHash}\n\nPlease transfer manually from your Aster spot account.`);
                                    if (onDepositSuccess) {
                                        onDepositSuccess();
                                    } else {
                                        onClose();
                                    }
                                    return;
                                } else if (depositStatus.status === 'timeout') {
                                    setDepositPolling(false);
                                    setLocalLoading(false);
                                    setStatus('Deposit timed out. Please check your Aster account.');
                                    return;
                                }
                            } else {
                                // No status means not tracking (may have completed)
                                setStatus('Checking deposit status...');
                            }
                        } catch (err) {
                            console.warn('Error polling deposit status:', err);
                        }

                        pollCount++;
                        setTimeout(pollStatus, 5000); // Poll every 5 seconds
                    };

                    // Start polling after a short delay
                    setTimeout(pollStatus, 3000);
                } else {
                    setLocalLoading(false);
                    setStatus('');
                    toast.success(`Deposit successful! TX: ${depositHash}`);
                    // Call success callback to refresh balances
                    if (onDepositSuccess) {
                        onDepositSuccess();
                    } else {
                        onClose();
                    }
                }
            } else {
                throw new Error('Transaction failed on-chain');
            }

        } catch (e: any) {
            console.error('Deposit error:', e);
            // Extract user-friendly error message
            let errorMessage = e.message || 'Unknown error';
            if (errorMessage.includes('User rejected')) {
                errorMessage = 'Transaction was rejected by user';
            } else if (errorMessage.includes('insufficient funds')) {
                errorMessage = 'Insufficient gas for transaction';
            }
            toast.error('Deposit failed: ' + errorMessage);
        } finally {
            // Only reset loading if not polling (Aster continues polling)
            if (!depositPolling) {
                setLocalLoading(false);
                setStatus('');
            }
        }
    };

    const handleWithdraw = async () => {
        if (!primaryWallet) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setLocalLoading(true);
        setStatus('Processing withdrawal...');

        try {
            const exchangeLower = selectedExchange.toLowerCase();

            // @ts-ignore
            const walletClient = await primaryWallet.connector.getWalletClient();
            if (!walletClient) throw new Error('No wallet client available');
            const chainId = await walletClient.getChainId();

            let result;

            if (exchangeLower === 'hyperliquid') {
                // Hyperliquid withdrawal with user EIP-712 signing
                // Must be on Arbitrum for signing
                if (chainId !== 42161) {
                    throw new Error('Please switch to Arbitrum network for Hyperliquid withdrawals.');
                }

                setStatus('Preparing Hyperliquid withdrawal...');

                // Generate nonce (current timestamp in milliseconds)
                const nonce = Date.now();

                // EIP-712 typed data for Hyperliquid withdraw3
                const typedData = {
                    domain: {
                        name: 'HyperliquidSignTransaction',
                        version: '1',
                        chainId: 42161,
                        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`
                    },
                    types: {
                        'HyperliquidTransaction:Withdraw': [
                            { name: 'hyperliquidChain', type: 'string' },
                            { name: 'destination', type: 'string' },
                            { name: 'amount', type: 'string' },
                            { name: 'time', type: 'uint64' }
                        ]
                    },
                    primaryType: 'HyperliquidTransaction:Withdraw' as const,
                    message: {
                        hyperliquidChain: 'Mainnet',
                        destination: walletAddress,
                        amount: amount,
                        time: nonce
                    }
                };

                setStatus('Please sign the withdrawal request...');

                // Sign with user wallet
                const signature = await walletClient.signTypedData(typedData);

                setStatus('Submitting withdrawal to Hyperliquid...');

                // Submit to backend
                result = await withdrawFunds(
                    'hyperliquid',
                    {
                        amount: amount,
                        destination: walletAddress,
                        // Include signature data
                        userSignature: signature,
                        nonce: nonce.toString()
                    },
                    walletAddress
                );
            } else if (exchangeLower === 'aster') {
                // Aster withdrawal with user EIP-712 signing
                setStatus('Preparing EIP-712 signature...');

                // Get chain name for EIP-712
                const chainNameMap: Record<number, string> = {
                    56: 'BSC',
                    42161: 'Arbitrum',
                    1: 'ETH'
                };
                const chainName = chainNameMap[chainId];
                if (!chainName) {
                    throw new Error(`Unsupported chain for Aster withdrawal. Please switch to Arbitrum, BSC, or Ethereum.`);
                }

                // Generate nonce (timestamp * 1000)
                const nonce = BigInt(Date.now() * 1000);

                // Estimate fee (hardcoded for now, could call API)
                const estimatedFee = '0.5';

                // EIP-712 typed data per Aster docs
                const typedData = {
                    domain: {
                        name: 'Aster',
                        version: '1',
                        chainId: chainId,
                        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`
                    },
                    types: {
                        Action: [
                            { name: 'type', type: 'string' },
                            { name: 'destination', type: 'address' },
                            { name: 'destination Chain', type: 'string' },
                            { name: 'token', type: 'string' },
                            { name: 'amount', type: 'string' },
                            { name: 'fee', type: 'string' },
                            { name: 'nonce', type: 'uint256' },
                            { name: 'aster chain', type: 'string' }
                        ]
                    },
                    primaryType: 'Action' as const,
                    message: {
                        type: 'Withdraw',
                        destination: walletAddress as `0x${string}`,
                        'destination Chain': chainName,
                        token: token,
                        amount: amount,
                        fee: estimatedFee,
                        nonce: nonce,
                        'aster chain': 'Mainnet'
                    }
                };

                setStatus('Please sign the withdrawal request...');

                // Sign with user wallet
                const signature = await walletClient.signTypedData(typedData);

                setStatus('Submitting withdrawal...');

                // Submit to backend which forwards to Aster
                result = await withdrawFunds(
                    'aster',
                    {
                        amount: amount,
                        walletAddress: walletAddress,
                        chainId: chainId,
                        asset: token,
                        receiver: walletAddress,
                        accountType: 'perp',
                        // Include signature data
                        userSignature: signature,
                        nonce: nonce.toString(),
                        fee: estimatedFee
                    },
                    walletAddress
                );
            } else if (exchangeLower === 'lighter') {
                // Lighter withdrawals require contract interaction
                // Direct user to Lighter's official interface for now
                setStatus('');
                setLocalLoading(false);
                window.open('https://app.lighter.xyz/portfolio', '_blank');
                toast('Opening Lighter portfolio page. Please use their official interface for withdrawals.', { icon: 'ℹ️' });
                return;
            } else if (exchangeLower === 'pacifica') {
                // Pacifica withdrawals are handled by backend
                // Backend uses the server-managed keypair to sign withdrawal
                if (!isSolanaWallet) {
                    throw new Error('Pacifica requires a Solana wallet.');
                }

                setStatus('Processing Pacifica withdrawal...');

                result = await withdrawFunds(
                    'pacifica',
                    {
                        amount: amount,
                        destination: walletAddress, // User's Solana wallet to receive funds
                    },
                    walletAddress
                );
            } else {
                throw new Error(`Withdrawals not supported for ${selectedExchange}`);
            }

            if (result.success) {
                toast.success(`Withdrawal initiated successfully!${result.data?.withdrawId ? ` Withdraw ID: ${result.data.withdrawId}` : ''}`);
                if (onDepositSuccess) {
                    onDepositSuccess();
                } else {
                    onClose();
                }
            } else {
                throw new Error(result.error || 'Withdrawal failed');
            }

        } catch (e: any) {
            console.error('Withdraw error:', e);
            let errorMessage = e.message || 'Unknown error';
            toast.error('Withdrawal failed: ' + errorMessage);
        } finally {
            setLocalLoading(false);
            setStatus('');
        }
    };

    const isLoading = localLoading || apiLoading || solanaLoading || pacificaIsGenerating;
    const displayStatus = status || solanaStatus;

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal - slides up on mobile, scales in on desktop */}
                    <motion.div
                        className="relative w-full sm:w-[420px] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#1a1f3c] to-[#0f1225] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl"
                        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 400,
                            mass: 0.8
                        }}
                    >
                        {/* Handle bar for mobile */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col gap-5">
                            {/* Header */}
                            <motion.div
                                className="flex items-center justify-between"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <h2 className="text-white text-xl font-semibold">
                                    {mode === 'deposit' ? 'Deposit' : 'Withdraw'} Funds
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </motion.div>

                            {/* Mode Toggle */}
                            <motion.div
                                className="flex p-1.5 bg-white/5 rounded-2xl"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                {(['deposit', 'withdraw'] as const).map((m) => (
                                    <motion.button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all relative ${mode === m ? 'text-white' : 'text-white/40 hover:text-white/60'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {mode === m && (
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl"
                                                layoutId="activeTab"
                                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                            />
                                        )}
                                        <span className="relative z-10 capitalize">{m}</span>
                                    </motion.button>
                                ))}
                            </motion.div>

                            {/* Exchange Selector */}
                            <motion.div
                                className="flex flex-col gap-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Exchange</label>
                                <div className="relative">
                                    <select
                                        value={selectedExchange}
                                        onChange={(e) => setSelectedExchange(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm font-medium outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Hyperliquid" className="bg-[#1a1f3c]">Hyperliquid</option>
                                        <option value="Aster" className="bg-[#1a1f3c]">Aster</option>
                                        <option value="Lighter" className="bg-[#1a1f3c]">Lighter</option>
                                        <option value="Pacifica" className="bg-[#1a1f3c]">Pacifica</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Solana indicator for Aster/Pacifica */}
                                <AnimatePresence>
                                    {(selectedExchange === 'Aster' && isSolanaWallet) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            <span className="text-purple-300 text-xs font-medium">Solana Network Detected</span>
                                        </motion.div>
                                    )}
                                    {selectedExchange === 'Pacifica' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex flex-col gap-2"
                                        >
                                            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                                <span className="text-purple-300 text-xs font-medium">Pacifica uses Solana Network</span>
                                            </div>
                                            {!isSolanaWallet && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                    <span className="text-yellow-300 text-xs font-medium">Please connect a Solana wallet for Pacifica</span>
                                                </div>
                                            )}
                                            {pacificaTradingAddress && (
                                                <div className="flex flex-col gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                                                    <span className="text-white/50 text-xs">Deposit to your trading address:</span>
                                                    <span className="text-white text-xs font-mono truncate">{pacificaTradingAddress}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Amount Input */}
                            <motion.div
                                className="flex flex-col gap-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                            >
                                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Amount</label>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="bg-transparent text-white text-lg font-semibold w-full outline-none placeholder:text-white/20"
                                    />
                                    <select
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="bg-white/10 text-white text-sm font-medium px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-white/15 transition-colors appearance-none"
                                    >
                                        <option value="USDC">USDC</option>
                                        <option value="USDT">USDT</option>
                                        {!isSolanaWallet && <option value="ETH">ETH</option>}
                                    </select>
                                </div>
                            </motion.div>

                            {/* Withdraw Info */}
                            <AnimatePresence>
                                {mode === 'withdraw' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="text-xs text-white/50 bg-white/5 border border-white/5 rounded-xl p-4">
                                            <p className="mb-2">Funds will be withdrawn to:</p>
                                            <p className="text-white font-mono text-sm bg-white/5 px-3 py-2 rounded-lg truncate">
                                                {walletAddress}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Status Messages */}
                            <AnimatePresence mode="wait">
                                {displayStatus && (
                                    <motion.div
                                        key="status"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="flex items-center justify-center gap-2 py-2"
                                    >
                                        <motion.div
                                            className="w-2 h-2 rounded-full bg-blue-400"
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        />
                                        <span className="text-blue-400 text-sm font-medium">{displayStatus}</span>
                                    </motion.div>
                                )}
                                {apiError && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3"
                                    >
                                        {apiError}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action Buttons */}
                            <motion.div
                                className="flex gap-3 pt-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.button
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all font-semibold text-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
                                    disabled={isLoading}
                                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                >
                                    {isLoading && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                        />
                                    )}
                                    <span className="relative z-10">
                                        {isLoading ? 'Processing...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
                                    </span>
                                </motion.button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DepositModal;
