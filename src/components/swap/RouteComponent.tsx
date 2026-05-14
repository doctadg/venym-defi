import { motion } from "framer-motion";
import { RefreshCw, Clock, DollarSign, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback, useRef } from "react";
import { getRoutes } from '@lifi/sdk';
import type { ExtendedChain } from '@lifi/sdk';
import { StandardizedAsset } from '@/types/asset';

interface RouteComponentProps {
  fromToken: StandardizedAsset | null;
  toToken: StandardizedAsset | null;
  fromChain: ExtendedChain | null;
  toChain: ExtendedChain | null;
  fromAmount: string;
  getTokenImage: (token: StandardizedAsset) => React.ReactNode;
  selectedRoute: number;
  onRouteSelect: (index: number) => void;
  walletAddress?: string;
  onRoutesUpdate?: (routes: any[]) => void;
}

type RouteFilter = 'best' | 'fastest';

const RouteComponent = ({ 
  fromToken, 
  toToken, 
  fromChain,
  toChain,
  fromAmount, 
  getTokenImage, 
  selectedRoute, 
  onRouteSelect,
  walletAddress,
  onRoutesUpdate
}: RouteComponentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('best');
  
  // Add refs to prevent duplicate requests
  const lastRequestRef = useRef<string>('');
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateDestinationAddress = useCallback((address: string, chain: ExtendedChain | null): boolean => {
    if (!address || !address.trim() || !chain) return false;
    
    // Basic Ethereum address validation (0x + 40 hex characters)
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    
    // Basic Solana address validation (32-44 base58 characters)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    // Check if address format matches the destination chain type
    if (chain.chainType === 'EVM') {
      return ethRegex.test(address);
    } else if (chain.chainType === 'SVM') {
      return solanaRegex.test(address);
    }
    
    // For other chain types, use basic validation
    return ethRegex.test(address) || solanaRegex.test(address);
  }, []);

  const validateRouteRequest = useCallback(() => {
    // Enhanced validation before making API call
    if (!fromToken || !toToken || !fromChain || !toChain || !fromAmount) {
      return { isValid: false, reason: 'Missing required parameters' };
    }

    if (parseFloat(fromAmount) <= 0) {
      return { isValid: false, reason: 'Invalid amount' };
    }

    // Validate that tokens belong to their respective chains
    if (fromToken.chainId !== fromChain.id) {
      return { isValid: false, reason: 'From token does not belong to from chain' };
    }

    if (toToken.chainId !== toChain.id) {
      return { isValid: false, reason: 'To token does not belong to to chain' };
    }

    return { isValid: true, reason: '' };
  }, [fromToken, toToken, fromChain, toChain, fromAmount]);

  const fetchRoutes = useCallback(async () => {
    const validation = validateRouteRequest();
    
    if (!validation.isValid) {
      console.log('Route request validation failed:', validation.reason);
      setRoutes([]);
      setError(null);
      if (onRoutesUpdate) {
        onRoutesUpdate([]);
      }
      return;
    }

    // Use provided wallet address or default addresses based on chain type
    const fromAddress = walletAddress || '0x0000000000000000000000000000000000000000'; // Use a default placeholder if not provided

    // Create a unique request signature to prevent duplicate calls
    const requestSignature = `${fromToken!.address}-${toToken!.address}-${fromChain!.id}-${toChain!.id}-${fromAmount}-${fromAddress}`;
    
    // Don't fetch if it's the same request as last time
    if (requestSignature === lastRequestRef.current) {
      console.log('Skipping duplicate route request');
      return;
    }

    lastRequestRef.current = requestSignature;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching routes with params:', {
        fromChainId: fromChain!.id,
        toChainId: toChain!.id,
        fromToken: fromToken!.symbol,
        toToken: toToken!.symbol,
        fromAmount,
        fromAddress: fromAddress.slice(0, 6) + '...' + fromAddress.slice(-4)
      });

      // Convert amount to smallest unit
      const decimals = fromToken!.decimals; // Use decimals from StandardizedAsset
      if (decimals === undefined) {
        console.error('From token decimals are undefined, cannot fetch routes.');
        setError('Missing token decimals');
        setIsLoading(false);
        if (onRoutesUpdate) {
          onRoutesUpdate([]);
        }
        return;
      }
      const amountInSmallestUnit = (parseFloat(fromAmount) * Math.pow(10, decimals)).toString();

      const routeRequest = {
        fromChainId: fromChain!.id,
        toChainId: toChain!.id,
        fromTokenAddress: fromToken!.address,
        toTokenAddress: toToken!.address,
        fromAmount: amountInSmallestUnit,
        fromAddress: fromAddress,
        options: {
          order: 'RECOMMENDED' as const,
          slippage: 0.005,
          maxPriceImpact: 0.4,
          allowSwitchChain: true,
        }
      };

      const result = await getRoutes(routeRequest);
      
      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Route request was aborted');
        return;
      }

      const fetchedRoutes = result.routes || [];
      
      console.log('Routes fetched successfully:', {
        routeCount: fetchedRoutes.length,
        requestSignature: requestSignature.slice(0, 50) + '...'
      });

      setRoutes(fetchedRoutes);
      
      // Pass routes back to parent component
      if (onRoutesUpdate) {
        onRoutesUpdate(fetchedRoutes);
      }

    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Route request was aborted');
        return;
      }

      console.error('Failed to fetch routes:', err);
      setError('Failed to fetch routes');
      setRoutes([]);
      if (onRoutesUpdate) {
        onRoutesUpdate([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fromToken, toToken, fromChain, toChain, fromAmount, walletAddress, onRoutesUpdate]); // Removed validateDestinationAddress and validateRouteRequest from dependencies

  // Only fetch routes when key parameters actually change
  useEffect(() => {
    // Clear existing timeout
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    const validation = validateRouteRequest();
    if (!validation.isValid) {
      setRoutes([]);
      setError(null);
      if (onRoutesUpdate) {
        onRoutesUpdate([]);
      }
      return;
    }

    // Create current request signature
    const getDefaultAddress = (chain: ExtendedChain | null) => {
      if (!chain) return '';
      if (chain.chainType === 'EVM') {
        return '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';
      } else if (chain.chainType === 'SVM') {
        return 'So11111111111111111111111111111111111111112';
      }
      return '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';
    };

    const effectiveFromAddress = walletAddress || '0x0000000000000000000000000000000000000000';

    const currentSignature = `${fromToken?.address}-${toToken?.address}-${fromChain?.id}-${toChain?.id}-${fromAmount}-${effectiveFromAddress}`;
    
    // Only fetch if this is actually a different request
    if (currentSignature !== lastRequestRef.current) {
      console.log('Parameters changed, scheduling route fetch:', {
        from: fromToken?.symbol,
        to: toToken?.symbol,
        fromChain: fromChain?.name,
        toChain: toChain?.name,
        amount: fromAmount,
        fromAddress: effectiveFromAddress ? effectiveFromAddress.slice(0, 6) + '...' : 'none'
      });
      
      // Small delay to allow for rapid changes (like when swapping tokens)
      requestTimeoutRef.current = setTimeout(() => {
        fetchRoutes();
      }, 500);
    }

    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [fromToken?.address, toToken?.address, fromChain?.id, toChain?.id, fromAmount, walletAddress]); // Removed validateDestinationAddress from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    // Reset the last request ref to force a fresh request
    lastRequestRef.current = '';
    fetchRoutes();
  }, [fetchRoutes]);

  const formatAmount = useCallback((amount: string, decimals: number) => {
    try {
      const num = parseFloat(amount) / Math.pow(10, decimals);
      return num.toFixed(6);
    } catch {
      return '0';
    }
  }, []);

  const formatUsdValue = useCallback((amountUSD: string) => {
    try {
      return `$${parseFloat(amountUSD).toFixed(2)}`;
    } catch {
      return '$0.00';
    }
  }, []);

  const getRouteTime = useCallback((route: any) => {
    if (route.steps?.[0]?.estimate?.executionDuration) {
      const duration = route.steps[0].estimate.executionDuration;
      if (duration < 60) return `${duration}s`;
      return `${Math.ceil(duration / 60)}m`;
    }
    return route.steps?.length > 1 ? '2-5m' : '30s';
  }, []);

  const getRouteFee = useCallback((route: any) => {
    return formatUsdValue(route.gasCostUSD || '0');
  }, [formatUsdValue]);

  const getRouteProvider = useCallback((route: any) => {
    return route.steps?.[0]?.toolDetails?.name || 'LiFi';
  }, []);

  const getRouteProviderLogo = useCallback((route: any) => {
    return route.steps?.[0]?.toolDetails?.logoURI || null;
  }, []);

  const getPriceImpact = useCallback((route: any) => {
    if (route.fromAmountUSD && route.toAmountUSD) {
      const fromUSD = parseFloat(route.fromAmountUSD);
      const toUSD = parseFloat(route.toAmountUSD);
      const impact = ((toUSD - fromUSD) / fromUSD) * 100;
      return impact > 0 ? `+${impact.toFixed(2)}%` : `${impact.toFixed(2)}%`;
    }
    return '-0.5%';
  }, []);

  const getRouteTag = useCallback((route: any, index: number) => {
    if (routeFilter === 'best') {
      if (route.tags?.includes('RECOMMENDED') || index === 0) return { text: 'Best', color: 'bg-white/80' };
      if (route.tags?.includes('FASTEST')) return { text: 'Fast', color: 'bg-blue-600' };
      return { text: 'Good', color: 'bg-gray-600' };
    } else {
      if (route.tags?.includes('FASTEST') || index === 0) return { text: 'Fastest', color: 'bg-blue-600' };
      if (route.tags?.includes('RECOMMENDED')) return { text: 'Best Value', color: 'bg-white/80' };
      return { text: 'Fast', color: 'bg-gray-600' };
    }
  }, [routeFilter]);

  const sortedRoutes = [...routes].sort((a, b) => {
    if (routeFilter === 'best') {
      // Sort by gas cost (cheapest first)
      const costA = parseFloat(a.gasCostUSD || '0');
      const costB = parseFloat(b.gasCostUSD || '0');
      return costA - costB;
    } else {
      // Sort by execution time (fastest first)
      const timeA = a.steps?.[0]?.estimate?.executionDuration || 999;
      const timeB = b.steps?.[0]?.estimate?.executionDuration || 999;
      return timeA - timeB;
    }
  });

  const TokenDisplay = ({ token, size = "w-6 h-6" }: { token: StandardizedAsset; size?: string }) => {
    if (token.logoUrl) {
      return (
        <img 
          src={token.logoUrl} 
          alt={token.symbol}
          className={`${size} rounded-full object-cover`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <div className={`${size} rounded-full bg-black border border-white/20 flex items-center justify-center text-white text-xs font-bold`}>
        {token.symbol.slice(0, 2)}
      </div>
    );
  };

  // Don't render if basic requirements aren't met - show Select Pairs UI instead
  if (!fromToken || !toToken) {
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-white">Routes</label>
        </div>
        <div className="bg-[#272B2E] border border-white/20 rounded-2xl p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-black border border-white/20 rounded-full flex items-center justify-center">
              <div className="relative">
                <div className="w-8 h-8 bg-blue-500 rounded-full opacity-70"></div>
                <div className="absolute -right-2 -bottom-2 w-6 h-6 bg-[#0ff378] rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Select Token Pair</h3>
              <p className="text-sm text-white max-w-sm mx-auto">
                {!fromToken && !toToken ? 
                  'Choose tokens to see available cross-chain routes and pricing' :
                  !fromToken ? 
                    'Select a token to send from' :
                    'Select a token to receive'
                }
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed ${fromToken ? 'border-white/20 bg-white/5' : 'border-[#272B2E] bg-black'}`}>
                {fromToken ? (
                  <>
                    <TokenDisplay token={fromToken} size="w-5 h-5" />
                    <span className="text-sm font-medium text-white">{fromToken.symbol}</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-500">From</span>
                  </>
                )}
              </div>
              <div className="text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed ${toToken ? 'border-white/20 bg-white/5' : 'border-[#272B2E] bg-black'}`}>
                {toToken ? (
                  <>
                    <TokenDisplay token={toToken} size="w-5 h-5" />
                    <span className="text-sm font-medium text-white">{toToken.symbol}</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-500">To</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show loading or amount required state
  if (!fromAmount || parseFloat(fromAmount) <= 0) {
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-white">Routes</label>
        </div>
        <div className="bg-[#272B2E] border border-white/20 rounded-2xl p-6">
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-black border border-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-white">Enter Amount</div>
              <div className="text-xs text-white">
                Enter the amount of {fromToken.symbol} you want to swap to see routes
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-white">Routes</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 px-3 text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/30"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-[#272B2E] border border-white/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          {!isLoading && routes.length > 0 && (
            <span className="hidden md:inline text-xs text-gray-500">
              {sortedRoutes.length} route{sortedRoutes.length > 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Finding best routes...</span>
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-red-400 text-sm mb-2">Failed to load routes</div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              className="text-white border-white/20 hover:bg-white/10 hover:border-white/30"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        ) : sortedRoutes.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.463-.64-6.314-1.76M3 13.496c0-1.268.63-2.39 1.593-3.068a4 4 0 011.043-.263 4.002 4.002 0 014.624 0c.369.1.709.218 1.04.362C13.373 11.19 15.93 12 19 12" />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-white">No routes found</div>
              <div className="text-xs text-gray-400">
                Try adjusting the amount or selecting different tokens
              </div>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              className="mt-3 text-white border-white/20 hover:bg-white/10 hover:border-white/30"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {sortedRoutes.slice(0, 3).map((route, index) => {
              const tag = getRouteTag(route, index);
              const provider = getRouteProvider(route);
              const providerLogo = getRouteProviderLogo(route);
              
              return (
                <motion.div
                  key={route.id || index}
                  onClick={() => onRouteSelect(index)}
                  className={`rounded-xl p-4 cursor-pointer transition-all ${
                    selectedRoute === index
                      ? 'bg-black border-2 border-white/20 shadow-sm'
                      : 'border border-white/20 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Header with tag and provider */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium text-white px-2 py-1 rounded-full ${tag.color}`}>
                      {tag.text}
                    </span>
                    <div className="flex items-center gap-2">
                      {providerLogo && (
                        <img 
                          src={providerLogo} 
                          alt={provider}
                          className="w-4 h-4 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs text-gray-600 font-medium">{provider}</span>
                    </div>
                  </div>

                  {/* Token flow display */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* From Token */}
                      <div className="flex items-center gap-2">
                        <TokenDisplay token={route.fromToken} />
                        <div className="text-sm">
                          <div className="font-medium text-white">
                            {formatAmount(route.fromAmount, route.fromToken.decimals)} {route.fromToken.symbol}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatUsdValue(route.fromAmountUSD)}
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="text-gray-400 px-2">
                        →
                      </div>

                      {/* To Token */}
                      <div className="flex items-center gap-2">
                        <TokenDisplay token={route.toToken} />
                        <div className="text-sm">
                          <div className="font-medium text-white">
                            {formatAmount(route.toAmount, route.toToken.decimals)} {route.toToken.symbol}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatUsdValue(route.toAmountUSD)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Impact */}
                    {/* <div className="text-right">
                      <div className={`text-sm font-medium ${
                        getPriceImpact(route).startsWith('+') ? 'text-white/80' : 'text-red-500'
                      }`}>
                        {getPriceImpact(route)}
                      </div>
                    </div> */}
                  </div>

                  {/* Route details */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      {/* Gas Cost */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>{getRouteFee(route)}</span>
                      </div>
                      
                      {/* Time */}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getRouteTime(route)}</span>
                      </div>

                      {/* Steps */}
                      {route.steps && route.steps.length > 1 && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{route.steps.length} steps</span>
                        </div>
                      )}
                    </div>

                    {/* Exchange Rate */}
                    <div className="text-xs text-gray-400">
                      1 {fromToken.symbol} ≈ {
                        (parseFloat(formatAmount(route.toAmount, route.toToken.decimals)) / parseFloat(fromAmount)).toFixed(4)
                      } {toToken.symbol}
                    </div>
                  </div>

                  {/* Multi-step warning */}
                  {route.containsSwitchChain && (
                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      ⚠️ Requires chain switch
                    </div>
                  )}
                </motion.div>
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default RouteComponent;
