'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StandardizedAsset } from '@/types/asset'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, Clock, Zap, DollarSign, TrendingUp, AlertCircle, Shield, ArrowRight, Info, Copy, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { useTokens } from '@/lib/hooks/useTokens'
import { useImprovedAutoQuote, QuoteResult } from '@/lib/hooks/useImprovedAutoQuote'
import { useSwap } from '@/app/api/v1/swap/useSwap'
import { TransactionErrorDisplay } from '@/components/ui/error-display'
import { useUrlParams, findTokenByParams, getChainIdentifierFromToken } from '@/lib/hooks/useUrlParams'
import { toast } from 'sonner'
import TokenSelectionModal from './TokenSelectionModal'
import ReviewSwapModal from './ReviewSwapModal'
import SwapStatusModal from './SwapStatusModal'
import RouteComponent from './RouteComponent'
import SideShiftPreviewModal from '@/components/swap/SideShiftPreviewModal'
import LifiPreviewModal from '@/components/swap/LifiPreviewModal'
import SideShiftTransactionStatusModal from '@/components/swap/SideShiftTransactionStatusModal'
import { WalletSelector } from '@/components/swap/WalletSelector'
import { LiFiQuote } from '@/services/swap/providers/lifi'
import { TokenAvatar } from '@/components/ui/TokenAvatar'
import { SideShiftShiftStatus } from '@/services/swap/providers/sideshift/types'
import { ChainMappingService } from '@/services/swap/chainMapping'

interface SwapStep {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'failed'; // Removed 'processing'
  txHash?: string;
  fromChain: string;
  toChain: string;
  tool: string;
  actualProvider?: string;
  progress: number;
  message: string;
}

interface ConnectedWallet {
  address: string;
  chainId: number | string;
  walletId: string;
}

export default function SwapPanel() {
  const { tokens, loading: tokensLoading } = useTokens()
  const { executeSwap, loading: swapLoading, error: swapError, clearError: clearSwapError } = useSwap()
  
  const [fromToken, setFromToken] = useState<StandardizedAsset | undefined>()
  const [toToken, setToToken] = useState<StandardizedAsset | undefined>()
  const [fromAmount, setFromAmount] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [userAmountInput, setUserAmountInput] = useState('')
  const [userAddressInput, setUserAddressInput] = useState('')
  const [hasUserInteractedWithAmount, setHasUserInteractedWithAmount] = useState(false)
  const [hasUserInteractedWithAddress, setHasUserInteractedWithAddress] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null)
  // Removed local error state - errors are now handled in SwapStatusModal
  const [preference, setPreference] = useState<'fastest' | 'lowest_cost'>('lowest_cost')
  const [walletAdapter, setWalletAdapter] = useState<any>(null)
  const [swapResult, setSwapResult] = useState<any>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [isSideShiftPreviewOpen, setSideShiftPreviewOpen] = useState(false)
  const [isLifiPreviewOpen, setLifiPreviewOpen] = useState(false)

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('SideShift preview modal state:', isSideShiftPreviewOpen);
  }, [isSideShiftPreviewOpen]);

  useEffect(() => {
    console.log('LiFi preview modal state:', isLifiPreviewOpen);
  }, [isLifiPreviewOpen]);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"from" | "to">("from")
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showSwapStatus, setShowSwapStatus] = useState(false)
  const [swapSteps, setSwapSteps] = useState<SwapStep[]>([])
  const [selectedRoute, setSelectedRoute] = useState<number>(0)
  const [routes, setRoutes] = useState<any[]>([])
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [sideshiftShiftStatus, setSideshiftShiftStatus] = useState<SideShiftShiftStatus | null>(null);

  // URL parameters management with improved reliability
  const { 
    params: urlParams, 
    updateParams, 
    updateUrlImmediate,
    isInitialized: urlInitialized,
    hasValidParams,
    errors: urlErrors
  } = useUrlParams({
    debounceMs: 500,
    updateOnChange: true,
    enableBrowserHistory: true
  })

  // Dynamic import of wallet adapter on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/wallets').then((module) => {
        setWalletAdapter(module.walletAdapter)
      })
    }
  }, [])

  // Get the from address for the connected wallet on the from chain
  const getFromAddress = () => {
    if (!connectedWallet || !fromToken) return undefined
    
    // Check if the connected wallet supports the from token's chain
    const fromChainMapping = ChainMappingService.getByLiFiChainId(fromToken.chainId)
    if (!fromChainMapping) {
      console.warn(`No chain mapping found for fromToken chain ${fromToken.chainId}`)
      return undefined
    }
    
    // Check if the connected wallet supports this chain type
    const requiredProvider = ChainMappingService.getWalletProvider(connectedWallet.walletId, fromToken.chainId)
    if (!requiredProvider) {
      console.warn(`Wallet ${connectedWallet.walletId} does not support chain ${fromToken.chainId} (${fromChainMapping.name})`)
      return undefined
    }
    
    // For multi-chain wallets like Phantom, check if they're connected to the right provider
    if (connectedWallet.walletId === 'phantom' || connectedWallet.walletId === 'backpack') {
      // Check if the wallet's connected chain type matches the required chain type
      const connectedChainMapping = ChainMappingService.getByWalletChainId(connectedWallet.chainId)
      if (connectedChainMapping?.chainType !== fromChainMapping.chainType) {
        console.warn(`Wallet connected to ${connectedChainMapping?.chainType || 'unknown'} but fromToken requires ${fromChainMapping.chainType}`)
        return undefined
      }
    }
    
    return connectedWallet.address
  }

  // Helper function to detect same-chain Solana swaps
  const isSameChainSolanaSwap = (fromToken?: StandardizedAsset, toToken?: StandardizedAsset): boolean => {
    if (!fromToken || !toToken) return false
    
    const fromIsSolana = ChainMappingService.isSolanaChain(fromToken.chainId)
    const toIsSolana = ChainMappingService.isSolanaChain(toToken.chainId)
    
    // Debug logging
    console.log('Same-chain Solana check:', {
      fromToken: { symbol: fromToken.symbol, chainId: fromToken.chainId, isSolana: fromIsSolana },
      toToken: { symbol: toToken.symbol, chainId: toToken.chainId, isSolana: toIsSolana },
      result: fromIsSolana && toIsSolana
    })
    
    return fromIsSolana && toIsSolana
  }

  // Use the improved automated quote system with multiple providers
  const { 
    quotes,
    bestQuote,
    quote, // For backward compatibility
    loading: quoteLoading, 
    error: quoteError, 
    lastUpdate, 
    isPreviewQuote,
    previewReason,
    providerErrors,
    refreshQuotes,
  } = useImprovedAutoQuote(
    fromToken, 
    toToken, 
    fromAmount, 
    preference, 
    connectedWallet ? getFromAddress() : undefined,
    destinationAddress || undefined
  )

  // State for selected quote
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState(0)
  const selectedQuote = quotes.length > 0 ? quotes[selectedQuoteIndex] : bestQuote

  // Determine if wallet connection is required based on the selected quote provider
  const requiresWalletConnection = useMemo(() => {
    if (!selectedQuote) return false
    // LiFi requires wallet connection for transaction signing
    // SideShift only needs a deposit address
    return selectedQuote.provider === 'lifi'
  }, [selectedQuote])

  // Initialize from URL parameters on load with improved error handling
  useEffect(() => {
    if (tokens.length > 0 && urlInitialized && urlParams) {
      // Only initialize if we haven't already set values and URL has valid params
      if (!fromToken && urlParams.from) {
        const foundFromToken = findTokenByParams(tokens, urlParams.from, urlParams.fromChain)
        if (foundFromToken) {
          setFromToken(foundFromToken)
        } else {
          console.warn(`Token not found for URL params: ${urlParams.from} on ${urlParams.fromChain}`)
        }
      }
      
      if (!toToken && urlParams.to) {
        const foundToToken = findTokenByParams(tokens, urlParams.to, urlParams.toChain)
        if (foundToToken) {
          setToToken(foundToToken)
        } else {
          console.warn(`Token not found for URL params: ${urlParams.to} on ${urlParams.toChain}`)
        }
      }
      
      if (!fromAmount && urlParams.amount) {
        // Validate amount before setting
        const amount = parseFloat(urlParams.amount)
        if (!isNaN(amount) && amount > 0) {
          setFromAmount(urlParams.amount)
        } else {
          console.warn(`Invalid amount in URL: ${urlParams.amount}`)
        }
      }
      
      if (!destinationAddress && urlParams.wallet && !isSameChainSolanaSwap(fromToken, toToken)) {
        setDestinationAddress(urlParams.wallet)
      }
    }
  }, [tokens, urlInitialized, urlParams, fromToken, toToken, fromAmount, destinationAddress])

  // Update URL when swap parameters change with improved reliability
  useEffect(() => {
    if (!urlInitialized) return
    
    // Only update if we're not actively editing inputs
    if (isEditingAmount || isEditingAddress) return
    
    // Only update if we have meaningful content
    if (!fromToken && !toToken && !fromAmount && !destinationAddress) return
    
    const newParams = {
      from: fromToken?.symbol,
      fromChain: fromToken ? getChainIdentifierFromToken(fromToken) : undefined,
      to: toToken?.symbol,
      toChain: toToken ? getChainIdentifierFromToken(toToken) : undefined,
      amount: fromAmount && fromAmount.trim() !== '' && !isNaN(parseFloat(fromAmount)) ? fromAmount : undefined,
      wallet: destinationAddress && destinationAddress.trim() !== '' ? destinationAddress : undefined,
    }
    
    // Use immediate update for token selection, debounced for amount/address changes
    const hasTokenChange = (fromToken && !urlParams?.from) || (toToken && !urlParams?.to)
    if (hasTokenChange) {
      updateUrlImmediate(newParams, { replace: false })
    } else if (fromAmount || destinationAddress || fromToken || toToken) {
      updateParams(newParams, { immediate: false })
    }
  }, [fromToken, toToken, fromAmount, destinationAddress, urlInitialized, isEditingAmount, isEditingAddress])

  // Removed error clearing logic - errors are now handled in SwapStatusModal

  // Reset selected quote index when quotes change
  useEffect(() => {
    if (quotes.length > 0) {
      setSelectedQuoteIndex(0)
    }
  }, [quotes])

  // Auto-set destination address when wallet connects (but don't trigger quote refresh)
  useEffect(() => {
    if (connectedWallet && !destinationAddress) {
      setDestinationAddress(connectedWallet.address)
    }
    // For same-chain Solana swaps, always use the connected wallet address
    if (connectedWallet && isSameChainSolanaSwap(fromToken, toToken)) {
      setDestinationAddress(connectedWallet.address)
    }
  }, [connectedWallet, destinationAddress, fromToken, toToken])

  // Handle wallet connection - EXACT V1 COPY
  const handleWalletConnect = (address: string, chainId: string | number, walletId: string) => {
    setConnectedWallet({ address, chainId, walletId })
  }

  // Handle wallet connection errors - EXACT V1 COPY
  const handleWalletError = (errorMessage: string) => {
    setConnectedWallet(null)
    // Errors are now handled in SwapStatusModal
  }

  // Handle wallet disconnection
  const handleWalletDisconnect = useCallback(async () => {
    try {
      if (walletAdapter) {
        await walletAdapter.disconnectWallet()
      }
      setConnectedWallet(null)
      toast.success('Wallet disconnected')
    } catch (error) {
      console.warn('Error during wallet disconnection:', error)
      setConnectedWallet(null)
    }
  }, [walletAdapter])

  const handleTokenSelect = useCallback((token: StandardizedAsset) => {
    if (modalType === "from") {
      setFromToken(token)
    } else {
      setToToken(token)
    }
    setSelectedRoute(0)
    setRoutes([])
    setIsModalOpen(false)
    
    // Immediately update URL for token selection for better UX
    const newParams = {
      from: modalType === "from" ? token.symbol : fromToken?.symbol,
      fromChain: modalType === "from" ? getChainIdentifierFromToken(token) : (fromToken ? getChainIdentifierFromToken(fromToken) : undefined),
      to: modalType === "to" ? token.symbol : toToken?.symbol,
      toChain: modalType === "to" ? getChainIdentifierFromToken(token) : (toToken ? getChainIdentifierFromToken(toToken) : undefined),
      amount: fromAmount || undefined,
      wallet: destinationAddress || undefined,
    }
    updateUrlImmediate(newParams, { replace: false })
  }, [modalType, fromToken, toToken, fromAmount, destinationAddress, updateUrlImmediate])

  const handleSwapTokens = () => {
    const tempToken = fromToken
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(quote?.toAmount || '')
    setRoutes([])
    
    // Clear destination address since we're swapping to a different chain
    setDestinationAddress('')
    setUserAddressInput('')
    setHasUserInteractedWithAddress(false)
  }

  const handleSwap = async () => {
    console.log('handleSwap called with:', {
      selectedQuote: selectedQuote?.provider,
      destinationAddress,
      fromToken: fromToken?.symbol,
      toToken: toToken?.symbol,
      fromAmount
    });

    if (!selectedQuote || !destinationAddress || !fromToken || !toToken || !fromAmount) {
      console.log('Error: Missing required fields for swap');
      return;
    }

    if (selectedQuote.provider === 'sideshift') {
      // For SideShift, show preview modal first (without deposit address)
      console.log('Opening SideShift preview modal...');
      setSideShiftPreviewOpen(true);
    } else if (selectedQuote.provider === 'lifi') {
      // For LiFi, show the review modal first
      console.log('Opening LiFi review modal...');
      setShowReviewModal(true);
    }
  };

  const handleConfirmSideShiftSwap = async () => {
    if (!selectedQuote || !destinationAddress || !fromToken || !toToken || !fromAmount) {
      console.log('Error: Missing required fields for SideShift swap');
      return;
    }

    setSideShiftPreviewOpen(false); // Close preview modal

    console.log('Creating SideShift swap with quote:', selectedQuote);

    try {
      // Debug logging
      console.log('SideShift swap parameters:', {
        quote: selectedQuote,
        quoteId: selectedQuote.quoteId,
        provider: selectedQuote.provider,
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol,
        fromAmount,
        settleAddress: destinationAddress,
        refundAddress: connectedWallet?.address || destinationAddress,
      });

      // Get a fresh quote first, then create the shift
      const result = await executeSwap({
        quote: selectedQuote,
        fromToken: fromToken,
        toToken: toToken,
        fromAmount: fromAmount,
        fromAddress: connectedWallet?.address || destinationAddress,
        settleAddress: destinationAddress,
        refundAddress: connectedWallet?.address || destinationAddress,
        walletId: connectedWallet?.walletId || 'none',
        preference: preference,
      });
      
      console.log('SideShift creation successful:', result);
      setSwapResult(result); // This result contains the shiftId (transactionId) and depositAddress

      // Only show status modal after successful creation
      const steps: SwapStep[] = [
        {
          id: '1',
          title: 'SideShift Created',
          status: 'completed',
          fromChain: fromToken.chainName || 'Unknown',
          toChain: toToken.chainName || 'Unknown',
          tool: 'SideShift',
          progress: 100,
          message: 'SideShift created successfully. Waiting for your deposit...',
          txHash: result.shiftId // Store shiftId here
        }
      ];
      setSwapSteps(steps);
      setShowSwapStatus(true); // Show status modal only after success

      // The status modal will now start polling for updates
    } catch (err) {
      console.error('SideShift creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create SideShift. Please try again.';
      
      // Show error toast instead of status modal for creation failures
      toast.error(errorMessage);
      
      // Don't show the status modal for creation failures
      // User can try again from the preview modal
    }
  };

  // Effect for polling SideShift status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const shiftId = swapResult?.shiftId; // Use shiftId from swapResult

    if (showSwapStatus && selectedQuote?.provider === 'sideshift' && shiftId) {
      const fetchSideShiftStatus = async () => {
        console.log(`Polling SideShift status for shiftId: ${shiftId}`);
        try {
          const response = await fetch(`/api/v1/sideshift/shifts/${shiftId}`);
          if (!response.ok) {
            const errorData = await response.json();
            console.error('SideShift status API error response:', errorData);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          const data: SideShiftShiftStatus = await response.json();
          setSideshiftShiftStatus(data);
          console.log('SideShift status received:', data);

          // Update swap steps based on SideShift status
          const newSteps: SwapStep[] = [];
          let overallProgress = 0;

          if (data.status === 'awaiting_deposit') {
            newSteps.push({
              id: 'deposit',
              status: 'pending',
              title: 'Awaiting Deposit',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 0,
              message: 'Waiting for your deposit...'
            });
            overallProgress = 10;
          } else if (data.status === 'processing') {
            newSteps.push({
              id: 'deposit',
              status: 'completed',
              title: 'Deposit Received',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 100,
              message: 'Deposit received.'
            });
            newSteps.push({
              id: 'processing',
              status: 'pending',
              title: 'Processing Swap',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 50,
              message: 'SideShift is processing your swap.'
            });
            overallProgress = 50;
          } else if (data.status === 'completed') {
            newSteps.push({
              id: 'deposit',
              status: 'completed',
              title: 'Deposit Received',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 100,
              message: 'Deposit received.'
            });
            newSteps.push({
              id: 'processing',
              status: 'completed',
              title: 'Swap Processed',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 100,
              message: 'Swap processed.'
            });
            newSteps.push({
              id: 'completed',
              status: 'completed',
              title: 'Transaction Completed',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 100,
              message: 'Transaction completed successfully!'
            });
            overallProgress = 100;
            clearInterval(interval); // Stop polling on completion
          } else if (data.status === 'failed' || data.status === 'expired') {
            newSteps.push({
              id: 'deposit',
              status: 'failed',
              title: 'Swap Failed',
              fromChain: fromToken?.chainName || 'Unknown',
              toChain: toToken?.chainName || 'Unknown',
              tool: 'SideShift',
              actualProvider: 'SideShift',
              progress: 0,
              message: `Swap failed: ${data.status}`
            });
            overallProgress = 0;
            clearInterval(interval); // Stop polling on failure
          }
          setSwapSteps(newSteps);
        } catch (error) {
          console.error('Failed to fetch SideShift status:', error);
          clearInterval(interval); // Stop polling on error
          setSwapSteps([{
            id: 'error',
            status: 'failed',
            title: 'Status Error',
            fromChain: fromToken?.chainName || 'Unknown',
            toChain: toToken?.chainName || 'Unknown',
            tool: 'SideShift',
            actualProvider: 'SideShift',
            progress: 0,
            message: `Failed to retrieve SideShift status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]);
        }
      };

      fetchSideShiftStatus(); // Fetch immediately
      interval = setInterval(fetchSideShiftStatus, 5000); // Poll every 5 seconds
    } else if (showSwapStatus && selectedQuote?.provider === 'sideshift' && !shiftId) {
      // If showSwapStatus is true for SideShift but no shiftId, it means creation failed
      console.error('SideShift status modal opened without a valid shiftId. Displaying creation error.');
      setSwapSteps([{
        id: 'creation_error',
        status: 'failed',
        title: 'SideShift Creation Failed',
        fromChain: fromToken?.chainName || 'Unknown',
        toChain: toToken?.chainName || 'Unknown',
        tool: 'SideShift',
        actualProvider: 'SideShift',
        progress: 0,
        message: swapError?.message || 'Failed to create SideShift. Please try again.'
      }]);
    }

    return () => clearInterval(interval); // Cleanup on unmount or dependency change
  }, [showSwapStatus, selectedQuote, swapResult, fromToken, toToken, swapError]); // Added swapError to dependencies

  const handleConfirmLifiSwap = async () => {
    console.log('handleConfirmLifiSwap called in SwapPanel', {
      selectedQuote: selectedQuote?.provider,
      destinationAddress,
      fromToken: fromToken?.symbol,
      toToken: toToken?.symbol,
      fromAmount,
      requiresWalletConnection,
      connectedWallet: connectedWallet?.address
    });

    // Basic validation - connectedWallet only required for providers that need it
    if (!selectedQuote || !destinationAddress || !fromToken || !toToken || !fromAmount) {
      console.log('Error: Missing required fields for swap');
      // Errors are now handled in SwapStatusModal
      return
    }

    // For providers that require wallet connection, ensure we have it
    if (requiresWalletConnection && !connectedWallet) {
      console.log('Error: Wallet connection required for this provider');
      // Errors are now handled in SwapStatusModal
      return
    }

    console.log('Executing swap with quote:', selectedQuote);

    // Always show the status modal when starting a swap
    setShowReviewModal(false);
    setShowSwapStatus(true);

    // Initialize swap steps
    const steps: SwapStep[] = [
      {
        id: '1',
        title: 'Initiating Swap', // Added title
        status: 'pending', // Changed to pending
        fromChain: fromToken.chainName || 'Unknown',
        toChain: toToken.chainName || 'Unknown',
        tool: selectedQuote.provider === 'lifi' ? 'LiFi' : 'SideShift',
        actualProvider: selectedQuote.actualProvider,
        progress: 0,
        message: 'Initiating swap...'
      }
    ];
    setSwapSteps(steps);

    try {
      const result = await executeSwap({
        quote: selectedQuote,
        fromToken: fromToken,
        toToken: toToken,
        fromAmount: fromAmount,
        fromAddress: connectedWallet?.address || destinationAddress, // Use destination address as fallback for SideShift
        settleAddress: destinationAddress,
        refundAddress: connectedWallet?.address || destinationAddress, // Use destination address as fallback for SideShift
        walletId: connectedWallet?.walletId || 'none',
        preference: preference,
      })
      
      console.log('LiFi swap successful:', result)
      
      // Update steps to completed
      steps[0].status = 'completed';
      steps[0].progress = 100;
      steps[0].message = 'Swap completed successfully!';
      steps[0].txHash = result.transactionId;
      setSwapSteps([...steps]);

      setSwapResult(result)
      setSideShiftPreviewOpen(false)
      setLifiPreviewOpen(false)
    } catch (err) {
      console.error('LiFi swap failed:', err)
      
      // Update steps to show failure - errors are now handled in SwapStatusModal
      const updatedSteps = swapSteps.map(step => ({
        ...step,
        status: 'failed' as const,
        message: err instanceof Error ? err.message : 'Swap failed'
      }));
      setSwapSteps(updatedSteps);
    }
  }

  const validateWalletAddress = useCallback((address: string): string | null => {
    if (!address.trim()) return null;
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    const suiRegex = /^0x[a-fA-F0-9]{64}$/;
    
    if (!ethRegex.test(address) && !solanaRegex.test(address) && !btcRegex.test(address) && !suiRegex.test(address)) {
      return "Invalid wallet address format (supports Ethereum, Solana, Bitcoin, and Sui)";
    }
    return null;
  }, []);

  const handleRetrySwap = () => {
    if (selectedQuote && destinationAddress) {
      handleSwap()
    }
  }

  const handleDismissError = () => {
    // Errors are now handled in SwapStatusModal
  }

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const handleNewSwap = () => {
    setSwapResult(null)
    setFromAmount('')
    clearSwapError()
    setSideShiftPreviewOpen(false)
    setLifiPreviewOpen(false)
    setShowReviewModal(false)
    setShowSwapStatus(false) // Add this line
    setSwapSteps([]) // Clear swap steps
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    return `${Math.round(seconds / 60)}m`
  }

  const formatLastUpdate = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const isValidAmount = fromAmount && parseFloat(fromAmount) > 0

  // Calculate exchange rate
  const getExchangeRate = () => {
    if (!selectedQuote || !fromAmount || parseFloat(fromAmount) === 0) return null
    const rate = parseFloat(selectedQuote.toAmount) / parseFloat(fromAmount)
    return rate.toFixed(6)
  }

  // Convert StandardizedAsset to the format expected by RouteComponent
  const convertToRouteToken = (token: StandardizedAsset | undefined) => {
    if (!token) return null
    return {
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      chainId: token.chainId,
      logoURI: token.logoUrl,
      priceUSD: '0'
    } as any
  }

  const convertToRouteChain = (token: StandardizedAsset | undefined) => {
    if (!token) return null
    return {
      id: token.chainId,
      name: token.chainName || 'Unknown Chain',
      chainType: 'EVM', // Default to EVM, could be enhanced
      nativeToken: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: token.chainId,
        logoURI: '',
        priceUSD: '0'
      },
      metamask: {},
      key: token.chainName?.toLowerCase() || 'unknown',
      coin: token.symbol,
      mainnet: true
    } as any
  }


  return (
    <div className="relative overflow-hidden">
      <SideShiftPreviewModal
        isOpen={isSideShiftPreviewOpen}
        onClose={() => {
          console.log('SideShift preview modal closed');
          setSideShiftPreviewOpen(false);
        }}
        onConfirm={handleConfirmSideShiftSwap} // Use the new SideShift confirm handler
        depositAddress={swapResult?.depositAddress || ''} // This will be empty initially, filled after confirm
        settleAddress={destinationAddress}
        depositAmount={fromAmount}
        settleAmount={selectedQuote?.toAmount || ''}
        fromToken={fromToken as StandardizedAsset}
        toToken={toToken as StandardizedAsset}
      />
      <LifiPreviewModal
        isOpen={isLifiPreviewOpen}
        onClose={() => setLifiPreviewOpen(false)}
        quote={selectedQuote as QuoteResult | null}
        onConfirm={handleConfirmLifiSwap} // Use the new LiFi confirm handler
        fromAmount={fromAmount}
      />

      {/* Main Content - V2 Styling with Mobile Optimization */}
      <motion.div
        className="max-w-lg w-full mx-auto mt-4 sm:mt-8 lg:mt-12 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 border border-gray-200 shadow-lg">
          {/* Token selection UI - EXACTLY like V2 */}
          <div className="pt-2 pb-4">
            <label className="text-sm font-bold text-gray-900">YOU SEND</label>
              <button 
                onClick={() => { setModalType("from"); setIsModalOpen(true); }}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl text-left mt-2 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {fromToken ? (
                  <>
                    <TokenAvatar token={fromToken} />
                    <div>
                      <div className="font-bold text-gray-900">{fromToken.symbol}</div>
                      <div className="text-sm text-gray-600">{fromToken.chainName}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-white">Select token</div>
                )}
              </button>
          </div>

          <div className="flex justify-center">
            <button onClick={handleSwapTokens} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <ArrowUpDown className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="pt-2 pb-4">
            <label className="text-sm font-bold text-gray-900">YOU RECEIVE</label>
              <button 
                onClick={() => { setModalType("to"); setIsModalOpen(true); }}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl text-left mt-2 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {toToken ? (
                  <>
                    <TokenAvatar token={toToken} />
                    <div>
                      <div className="font-bold text-gray-900">{toToken.symbol}</div>
                      <div className="text-sm text-gray-600">{toToken.chainName}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-900">Select token</div>
                )}
              </button>
          </div>

          {/* Amount input with token logo */}
          <div className="pt-2 pb-4">
            <label className="text-sm font-bold text-white">Amount</label>
            <div className="relative mt-2">
              <Input
                value={hasUserInteractedWithAmount ? userAmountInput : fromAmount}
                onChange={(e) => {
                  setUserAmountInput(e.target.value)
                  setFromAmount(e.target.value)
                  setHasUserInteractedWithAmount(true)
                  setIsEditingAmount(true)
                }}
                onFocus={() => {
                  setIsEditingAmount(true)
                  if (!hasUserInteractedWithAmount) {
                    setUserAmountInput(fromAmount)
                    setHasUserInteractedWithAmount(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setIsEditingAmount(false), 1000) // Delay to allow for URL update
                }}
                className="bg-[#272B2E] border-none text-white pl-14"
                placeholder="0"
                type="number"
              />
              {fromToken && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <TokenAvatar token={fromToken} size="w-8 h-8" showChainIndicator={false} />
                </div>
              )}
            </div>
          </div>

 {/* Available Routes Header - Outside the card like v2 */}
{fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && (
<div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-2">
<label className="text-sm font-bold text-white">Available Routes</label>
<div className="flex items-center gap-2 justify-between sm:justify-end">
{lastUpdate && (
<span className="text-xs text-gray-400">
Updated {formatLastUpdate(lastUpdate)}
</span>
)}
<Button
variant="ghost"
size="sm"
onClick={refreshQuotes}
className="h-8 px-2 sm:px-3 text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/30"
disabled={quoteLoading}
>
<RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${quoteLoading ? 'animate-spin' : ''}`} />
<span className="hidden sm:inline">Refresh</span>
</Button>
</div>
</div>
)}

{/* Single unified quote/routes section */}
<div className="bg-[#272B2E] rounded-2xl p-4 sm:p-6 space-y-4">
{fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 ? (
<>

{/* Routes Content */}
{quoteLoading ? (
<div className="flex items-center justify-center py-6">
<div className="flex items-center gap-3">
<div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
<span className="text-sm text-gray-300">Finding best routes...</span>
</div>
</div>
) : quotes.length > 0 ? (
<>
{quotes.map((quote, index) => (
<motion.div
key={quote.quoteId}
onClick={() => setSelectedQuoteIndex(index)}
className={`rounded-xl p-4 cursor-pointer transition-all ${
selectedQuoteIndex === index
? 'bg-black border-2 border-white/20 shadow-sm'
: 'border border-white/20 hover:border-gray-300 hover:shadow-sm'
}`}
whileHover={{ scale: 1.01 }}
whileTap={{ scale: 0.99 }}
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
>
{/* Header with provider info */}
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2">
{quote.actualProviderLogo && (
<img 
src={quote.actualProviderLogo} 
alt={quote.actualProvider || quote.provider}
className="w-5 h-5 rounded"
onError={(e) => {
(e.target as HTMLImageElement).style.display = 'none';
}}
/>
)}
<span className="text-sm font-medium text-white">
{quote.actualProvider || quote.provider}
</span>
</div>
<span className={`text-xs font-medium text-white px-2 py-1 rounded-full ${
index === 0 ? 'bg-white/80' : 'bg-gray-600'
}`}>
{index === 0 ? 'Best' : 'Alternative'}
</span>
</div>

{/* Quote details */}
<div className="flex justify-between items-center">
<span className={`${index === 0 ? 'text-white' : 'text-white'}`}>You'll receive:</span>
<span className={`font-bold ${index === 0 ? 'text-white' : 'text-white'}`}>
{parseFloat(quote.toAmount).toFixed(6)} {toToken.symbol}
</span>
</div>

<div className="flex justify-between items-center">
<span className={`${index === 0 ? 'text-white' : 'text-white'}`}>Est. time:</span>
<span className={`${index === 0 ? 'text-white' : 'text-white'}`}>~{formatTime(quote.estimatedTime)}</span>
</div>
<div className="flex justify-between items-center">
<span className={`${index === 0 ? 'text-white' : 'text-white'}`}>Exchange rate:</span>
<span className={`${index === 0 ? 'text-white' : 'text-gray-400'}`}>
1 {fromToken.symbol} ≈ {
(parseFloat(quote.toAmount) / parseFloat(fromAmount)).toFixed(4)
} {toToken.symbol}
</span>
</div>

{/* Provider-specific info */}
{quote.provider === 'sideshift' && (
<div className="mt-2 text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
{/* Fixed rate note removed */}
</div>
)}
{quote.provider === 'lifi' && (
<div className="mt-2 text-xs bg-[#0ff378]/20 px-2 py-1 rounded">
<span className={`${index === 0 ? 'text-white' : 'text-white'}`}>Cross-chain bridge</span>
</div>
)}
</motion.div>
))}


</>
) : quoteError ? (
<div className="text-center py-6">
<div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
<AlertCircle className="w-6 h-6 text-red-600" />
</div>
<div className="text-red-400 text-sm mb-2">No routes available</div>
<div className="text-xs text-gray-400 mb-3">
{quoteError.message}
</div>
<Button 
onClick={refreshQuotes} 
variant="outline" 
size="sm"
className="text-red-400 border-red-400/20 hover:bg-red-900/20"
>
Retry
</Button>
</div>
) : (
<div className="text-center py-6">
<div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
<Info className="w-6 h-6 text-orange-600" />
</div>
<div className="text-orange-400 text-sm mb-2">No routes found</div>
<div className="text-xs text-gray-400 mb-3">
Try adjusting the amount or selecting different tokens
</div>
<Button 
onClick={refreshQuotes} 
variant="outline" 
size="sm"
className="text-orange-400 border-orange-400/20 hover:bg-orange-900/20"
>
Refresh
</Button>
</div>
)}
</>
) : fromToken && toToken ? (
<div className="text-center space-y-6">
{/* Circular icon */}
<div className="flex justify-center">
<div className="w-16 h-16 rounded-full bg-gradient-to-r from-white/10 to-blue-500 flex items-center justify-center">
<DollarSign className="w-8 h-8 text-white" />
</div>
</div>
{/* Title and subtitle */}
<div className="space-y-2">
<h3 className="text-lg font-semibold text-white">Enter Amount</h3>
<p className="text-sm text-gray-400">Enter the amount you want to swap to see available routes and pricing</p>
</div>
{/* Token pair display */}
<div className="flex items-center justify-center gap-4">
<div className="flex items-center gap-2 px-4 py-2 bg-black rounded-full border border-gray-600">
<TokenAvatar token={fromToken} size="w-6 h-6" />
<span className="text-white text-sm">{fromToken.symbol}</span>
</div>
<ArrowRight className="w-4 h-4 text-gray-500" />
<div className="flex items-center gap-2 px-4 py-2 bg-black rounded-full border border-gray-600">
<TokenAvatar token={toToken} size="w-6 h-6" />
<span className="text-white text-sm">{toToken.symbol}</span>
</div>
</div>
</div>
) : (
<div className="text-center space-y-6">
{/* Circular icon */}
<div className="flex justify-center">
<div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-[#0ff378] flex items-center justify-center">
<ArrowRight className="w-8 h-8 text-white" />
</div>
</div>
{/* Title and subtitle */}
<div className="space-y-2">
<h3 className="text-lg font-semibold text-white">Select Token Pair</h3>
<p className="text-sm text-gray-400">Choose tokens to see available cross-chain routes and pricing</p>
</div>
{/* From and To buttons */}
<div className="flex items-center justify-center gap-4">
<button 
onClick={() => { setModalType("from"); setIsModalOpen(true); }}
className="flex items-center gap-2 px-4 py-2 bg-black rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
>
{fromToken ? (
<>
<TokenAvatar token={fromToken} size="w-6 h-6" />
<span className="text-white text-sm">{fromToken.symbol}</span>
</>
) : (
<>
<div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
<span className="text-gray-400 text-xs">?</span>
</div>
<span className="text-gray-400 text-sm">From</span>
</>
)}
</button>
<ArrowRight className="w-4 h-4 text-gray-500" />
<button 
onClick={() => { setModalType("to"); setIsModalOpen(true); }}
className="flex items-center gap-2 px-4 py-2 bg-black rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
>
{toToken ? (
<>
<TokenAvatar token={toToken} size="w-6 h-6" />
<span className="text-white text-sm">{toToken.symbol}</span>
</>
) : (
<>
<div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
<span className="text-gray-400 text-xs">?</span>
</div>
<span className="text-gray-400 text-sm">To</span>
</>
)}
</button>
</div>
</div>
)}
</div>
          {/* Destination wallet address with token logo - Hide for same-chain Solana swaps */}
          {!isSameChainSolanaSwap(fromToken, toToken) && (
            <div className="pt-2 pb-4">
              <label className="text-sm font-bold text-white">Destination Wallet Address</label>
              <div className="relative mt-2">
                <Input
                  value={hasUserInteractedWithAddress ? userAddressInput : destinationAddress}
                  onChange={(e) => {
                    setUserAddressInput(e.target.value)
                    setDestinationAddress(e.target.value)
                    setHasUserInteractedWithAddress(true)
                    setIsEditingAddress(true)
                  }}
                  onFocus={() => {
                    setIsEditingAddress(true)
                    if (!hasUserInteractedWithAddress) {
                      setUserAddressInput(destinationAddress)
                      setHasUserInteractedWithAddress(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsEditingAddress(false), 1000) // Delay to allow for URL update
                  }}
                  className="bg-[#272B2E] border-none text-white pl-14"
                  placeholder="Enter wallet address to receive tokens"
                />
                {toToken && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <TokenAvatar token={toToken} size="w-8 h-8" showChainIndicator={false} />
                  </div>
                )}
              </div>
              
              {/* Errors are now handled in SwapStatusModal */}
            </div>
          )}

          {/* Info message for same-chain Solana swaps */}
          {isSameChainSolanaSwap(fromToken, toToken) && connectedWallet && (
            <div className="pt-2 pb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded-lg">
                <Info className="w-4 h-4" />
                <span>Tokens will be sent to your connected Solana wallet: {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}</span>
              </div>
            </div>
          )}

          {/* Unified swap button that handles wallet connection and swap */}
          <Button 
            onClick={() => {
              console.log('Preview Swap button clicked', {
                requiresWalletConnection,
                connectedWallet: !!connectedWallet,
                selectedQuote: selectedQuote?.provider
              });
              // If LiFi requires wallet connection and we don't have one, show wallet selector
              if (requiresWalletConnection && !connectedWallet) {
                console.log('Showing wallet selector...');
                setShowWalletSelector(true)
              } else {
                // Normal swap flow
                console.log('Proceeding with normal swap flow...');
                handleSwap()
              }
            }}
            disabled={
              swapLoading || 
              quoteLoading || 
              !fromToken || 
              !toToken || 
              !isValidAmount || 
              !selectedQuote ||
              (!destinationAddress && !isSameChainSolanaSwap(fromToken, toToken))
            }
            className="w-full bg-white/80 hover:bg-white/10 disabled:bg-white/10 text-white py-6 rounded-2xl"
          >
            {swapLoading ? "Processing..." : 
             !selectedQuote && isValidAmount && fromToken && toToken ? "Finding Best Route..." :
             requiresWalletConnection && !connectedWallet ? "Connect Wallet" :
             selectedQuote && selectedQuote.provider === 'lifi' ? "Review Swap" :
             !fromToken || !toToken ? "Select Tokens" :
             !fromAmount || parseFloat(fromAmount) <= 0 ? "Enter Amount" :
             (!destinationAddress && !isSameChainSolanaSwap(fromToken, toToken)) ? "Enter Destination Address" : "Preview Swap"}
          </Button>

        </div>
      </motion.div>

      {/* Modals */}
      <TokenSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleTokenSelect}
        tokens={tokens}
        isLoading={tokensLoading}
        error={swapError ? new Error(swapError.message) : null}
      />

      <ReviewSwapModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onConfirm={handleConfirmLifiSwap}
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        walletAddress={destinationAddress}
        quote={selectedQuote}
        isLoading={swapLoading}
        connectedWallet={connectedWallet}
        onRefreshQuotes={refreshQuotes}
        onWalletConnect={handleWalletConnect}
      />

      {selectedQuote?.provider === 'sideshift' ? (
        <SideShiftTransactionStatusModal
          isOpen={showSwapStatus}
          onClose={() => setShowSwapStatus(false)}
          fromCoin={fromToken?.symbol || ''}
          toCoin={toToken?.symbol || ''}
          steps={swapSteps}
          isCompleted={sideshiftShiftStatus?.status === 'completed'}
          overallProgress={
            sideshiftShiftStatus?.status === 'completed' ? 100 :
            sideshiftShiftStatus?.status === 'processing' ? 75 :
            sideshiftShiftStatus?.status === 'awaiting_deposit' ? 25 : 0
          }
          depositAddress={swapResult?.depositAddress}
          depositAmount={fromAmount}
          shiftId={swapResult?.shiftId}
        />
      ) : (
        <SwapStatusModal
          isOpen={showSwapStatus}
          onClose={() => setShowSwapStatus(false)}
          steps={swapSteps}
          onRetry={handleRetrySwap}
          swapResult={swapResult} // Pass swapResult to status modal
          fromToken={fromToken}
          toToken={toToken}
          fromAmount={fromAmount}
          toAmount={selectedQuote?.toAmount || ''}
          destinationAddress={destinationAddress}
        />
      )}

      {/* Hidden WalletSelector that opens when wallet connection is needed */}
      {showWalletSelector && (
        <WalletSelector
          quote={selectedQuote}
          fromToken={fromToken}
          onWalletConnect={(address, chainId, walletId) => {
            handleWalletConnect(address, chainId, walletId)
            setShowWalletSelector(false)
          }}
          onError={handleWalletError}
          buttonText="Connect Wallet"
          disabled={false}
          onClose={() => setShowWalletSelector(false)}
        />
      )}
    </div>
  )
}
