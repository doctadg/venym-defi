import { useState, useEffect, useCallback, useRef } from 'react';
import { StandardizedAsset } from '@/types/asset';
import { PlaceholderAddressService } from '@/lib/placeholderAddresses';

type QuoteParams = {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
  fromDecimals?: number;
  toDecimals?: number;
  preference?: string;
};

export type QuoteResult = {
  quoteId: string;
  provider: string;
  actualProvider?: string; // The actual provider name (e.g., "1inch", "Uniswap", etc.)
  actualProviderLogo?: string; // Logo URL for the actual provider
  toAmount: string;
  estimatedTime: number;
  fees: {
    total: string;
  };
  fromToken?: StandardizedAsset;
  toToken?: StandardizedAsset;
};

type QuoteState = {
  quotes: QuoteResult[];
  bestQuote: QuoteResult | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  isPreviewQuote: boolean;
  previewReason?: string;
  providerErrors: Record<string, string>;
};

const DEBOUNCE_DELAY = 200; // Reduced from 300ms for faster responsiveness
const MIN_AMOUNT_THRESHOLD = 0.000001;

export const useImprovedAutoQuote = (
  fromToken: StandardizedAsset | undefined,
  toToken: StandardizedAsset | undefined,
  fromAmount: string,
  preference: 'fastest' | 'lowest_cost' = 'fastest',
  fromAddress?: string,
  toAddress?: string,
  clientId?: string
) => {
  const [state, setState] = useState<QuoteState>({
    quotes: [],
    bestQuote: null,
    loading: false,
    error: null,
    lastUpdate: null,
    isPreviewQuote: false,
    previewReason: undefined,
    providerErrors: {},
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<string>('');

  const getQuotes = useCallback(async (params: QuoteParams): Promise<{ quotes: QuoteResult[], bestQuote: QuoteResult | null, providerErrors: Record<string, string> }> => {
    // PERFORMANCE OPTIMIZATION: Better request management
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const parseChainId = (chainId: string) => {
        const parsed = parseInt(chainId);
        return isNaN(parsed) ? chainId : parsed;
      };

      const requestBody = {
        fromChain: parseChainId(params.fromChain),
        toChain: parseChainId(params.toChain),
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress || '0x0000000000000000000000000000000000000000',
        toAddress: params.toAddress,
        fromDecimals: params.fromDecimals || 18,
        toDecimals: params.toDecimals || 18,
        preference: params.preference || 'fastest',
        // PERFORMANCE: Pass token info to avoid redundant lookups on the backend
        fromTokenInfo: fromToken,
        toTokenInfo: toToken
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Use client ID if provided for widget authentication, otherwise use internal API key
      if (clientId) {
        headers['x-client-id'] = clientId;
      } else {
        headers['x-api-key'] = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '';
      }

      const response = await fetch('/api/v1/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error('This route is not currently available');
      }
      
      const data = await response.json();
      
      return {
        quotes: data.quotes || [],
        bestQuote: data.bestQuote || null,
        providerErrors: data.providerErrors || {}
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { quotes: [], bestQuote: null, providerErrors: {} };
      }
      throw new Error('This route is not currently available');
    }
  }, [fromToken, toToken, clientId]); // Added dependencies for better memoization

  const fetchQuotes = useCallback(async (customFromAddress?: string, customToAddress?: string) => {
    if (!fromToken || !toToken || !fromAmount) {
      setState(prev => ({ ...prev, quotes: [], bestQuote: null, error: null, providerErrors: {} }));
      return;
    }

    const numAmount = parseFloat(fromAmount);
    if (isNaN(numAmount) || numAmount < MIN_AMOUNT_THRESHOLD) {
      setState(prev => ({ ...prev, quotes: [], bestQuote: null, error: null, providerErrors: {} }));
      return;
    }

    // Use provided addresses or current values or placeholders
    const currentFromAddress = customFromAddress ?? fromAddress;
    const currentToAddress = customToAddress ?? toAddress;
    const effectiveFromAddress = currentFromAddress || PlaceholderAddressService.getPlaceholderAddress(fromToken.chainId);
    const effectiveToAddress = currentToAddress || PlaceholderAddressService.getPlaceholderAddress(toToken.chainId);
    
    const previewInfo = PlaceholderAddressService.shouldShowPreviewQuote(effectiveFromAddress, effectiveToAddress);

    const fromAmountWei = (numAmount * Math.pow(10, fromToken.decimals)).toString();
    
    const quoteParams: QuoteParams = {
      fromChain: fromToken.chainId.toString(),
      toChain: toToken.chainId.toString(),
      fromToken: fromToken.address,
      toToken: toToken.address,
      fromAmount: fromAmountWei,
      fromAddress: effectiveFromAddress,
      toAddress: effectiveToAddress,
      fromDecimals: fromToken.decimals,
      toDecimals: toToken.decimals,
      preference: preference
    };

    const requestKey = JSON.stringify(quoteParams);
    if (requestKey === lastRequestRef.current) {
      return;
    }

    lastRequestRef.current = requestKey;
    setState(prev => ({ ...prev, loading: true, error: null, providerErrors: {} }));

    try {
      const result = await getQuotes(quoteParams);

      // Add token information to quotes
      const quotesWithTokens = result.quotes.map(quote => ({
        ...quote,
        fromToken,
        toToken
      }));

      const bestQuoteWithTokens = result.bestQuote ? {
        ...result.bestQuote,
        fromToken,
        toToken
      } : null;

      setState(prev => ({
        ...prev,
        quotes: quotesWithTokens,
        bestQuote: bestQuoteWithTokens,
        loading: false,
        error: null,
        lastUpdate: new Date(),
        isPreviewQuote: previewInfo.isPreview,
        previewReason: previewInfo.reason,
        providerErrors: result.providerErrors,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to get quotes'),
        quotes: [],
        bestQuote: null,
        providerErrors: {},
      }));
    }
  }, [fromToken, toToken, fromAmount, preference, getQuotes, clientId]);

  const debouncedFetchQuotes = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchQuotes();
    }, DEBOUNCE_DELAY);
  }, [fetchQuotes]);

  useEffect(() => {
    if (fromToken && toToken && fromAmount) {
      debouncedFetchQuotes();
    } else {
      setState(prev => ({ ...prev, quotes: [], bestQuote: null, error: null, providerErrors: {} }));
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fromToken, toToken, fromAmount, preference, debouncedFetchQuotes]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refreshQuotes = useCallback(() => {
    if (fromToken && toToken && fromAmount) {
      // Clear the last request reference to force a fresh request
      lastRequestRef.current = '';
      fetchQuotes(fromAddress, toAddress);
    }
  }, [fromToken, toToken, fromAmount, fromAddress, toAddress, fetchQuotes, clientId]);

  return {
    quotes: state.quotes,
    bestQuote: state.bestQuote,
    quote: state.bestQuote, // For backward compatibility
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    isPreviewQuote: state.isPreviewQuote,
    previewReason: state.previewReason,
    providerErrors: state.providerErrors,
    isStale: false, // Stale logic removed
    refreshQuote: refreshQuotes, // For backward compatibility
    refreshQuotes,
  };
};
