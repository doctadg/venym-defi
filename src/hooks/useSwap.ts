import { useState, useCallback, useRef, useEffect } from 'react';
import { StandardizedAsset, UnifiedQuote, SwapStatus, SwapHistoryEntry } from '@/types/swap';
import { swapApi } from '@/services/swap/swapApi';

interface UseSwapReturn {
  fromToken: StandardizedAsset | null;
  toToken: StandardizedAsset | null;
  fromAmount: string;
  toAmount: string;
  preference: 'fastest' | 'lowest_cost';
  quotes: UnifiedQuote[];
  selectedQuote: UnifiedQuote | null;
  status: SwapStatus;
  error: string | null;
  txHash: string | null;
  providerErrors: Record<string, string>;
  swapHistory: SwapHistoryEntry[];
  setFromToken: (token: StandardizedAsset | null) => void;
  setToToken: (token: StandardizedAsset | null) => void;
  setFromAmount: (amount: string) => void;
  setPreference: (pref: 'fastest' | 'lowest_cost') => void;
  setSelectedQuote: (quote: UnifiedQuote | null) => void;
  getQuotes: (fromAddress: string, toAddress?: string) => Promise<void>;
  executeSwap: (walletAddress: string) => Promise<void>;
  swapTokens: () => void;
  clearError: () => void;
}

const HISTORY_KEY = 'venym_swap_history';

function loadHistory(): SwapHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveHistory(entry: SwapHistoryEntry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 20) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function useSwap(): UseSwapReturn {
  const [fromToken, setFromToken] = useState<StandardizedAsset | null>(null);
  const [toToken, setToToken] = useState<StandardizedAsset | null>(null);
  const [fromAmount, setFromAmount] = useState('0.1');
  const [preference, setPreference] = useState<'fastest' | 'lowest_cost'>('fastest');
  const [quotes, setQuotes] = useState<UnifiedQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<UnifiedQuote | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});
  const [swapHistory, setSwapHistory] = useState<SwapHistoryEntry[]>(loadHistory());

  const abortRef = useRef<AbortController | null>(null);

  const toAmount = selectedQuote?.outputAmount || '0';

  const getQuotes = useCallback(async (fromAddress: string, toAddress?: string) => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      setError('Select tokens and enter an amount');
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setStatus('quoting');
    setError(null);
    setQuotes([]);
    setSelectedQuote(null);
    setProviderErrors({});

    try {
      const result = await swapApi.getAggregatedQuotes({
        fromChain: fromToken.chainId,
        toChain: toToken.chainId,
        fromToken,
        toToken,
        amount: fromAmount,
        fromAddress,
        toAddress: toAddress || fromAddress,
        preference,
      });

      if (result.quotes.length === 0) {
        setError('No quotes found for this route. Try different tokens or amount.');
        setStatus('idle');
        setProviderErrors(result.errors);
        return;
      }

      setQuotes(result.quotes);
      setSelectedQuote(result.quotes[0]);
      setStatus('quoted');
      setProviderErrors(result.errors);
    } catch (e: any) {
      setError(e.message || 'Failed to get quotes');
      setStatus('idle');
    }
  }, [fromToken, toToken, fromAmount, preference]);

  const executeSwap = useCallback(async (walletAddress: string) => {
    if (!selectedQuote) return;

    setStatus('executing');
    setError(null);
    setTxHash(null);

    try {
      if (selectedQuote.provider === 'lifi') {
        // For LiFi quotes, the transactionRequest should be sent via the wallet
        // This returns the tx data that the frontend needs to sign and send
        const txRequest = selectedQuote.transactionRequest;
        if (!txRequest) {
          throw new Error('No transaction request available. Please get a fresh quote.');
        }

        // Store the tx data for the UI to use with wallet.signAndSendTransaction
        // The actual signing happens in the component via Dynamic wallet
        setStatus('pending');

        const historyEntry: SwapHistoryEntry = {
          id: selectedQuote.id,
          fromToken: fromToken?.symbol || '',
          toToken: toToken?.symbol || '',
          fromAmount,
          toAmount: selectedQuote.outputAmount,
          provider: selectedQuote.actualProvider || 'LiFi',
          status: 'pending',
          timestamp: Date.now(),
        };
        saveHistory(historyEntry);
        setSwapHistory(loadHistory());

        // Return the tx request for the component to handle signing
        return txRequest;
      } else if (selectedQuote.provider === 'sideshift') {
        // For SideShift, create the shift
        const rawQuoteId = selectedQuote.rawQuote?.id;
        if (!rawQuoteId) throw new Error('Missing SideShift quote ID');

        const shift = await swapApi.sideshiftProvider.createShift({
          quoteId: rawQuoteId,
          settleAddress: walletAddress,
        });

        const historyEntry: SwapHistoryEntry = {
          id: shift.id,
          fromToken: fromToken?.symbol || '',
          toToken: toToken?.symbol || '',
          fromAmount,
          toAmount: selectedQuote.outputAmount,
          provider: 'SideShift',
          status: 'pending',
          timestamp: Date.now(),
        };
        saveHistory(historyEntry);
        setSwapHistory(loadHistory());

        setStatus('pending');
        return { type: 'sideshift', shift };
      }
    } catch (e: any) {
      setError(e.message || 'Swap execution failed');
      setStatus('failed');
    }
  }, [selectedQuote, fromToken, toToken, fromAmount]);

  const swapTokens = useCallback(() => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setQuotes([]);
    setSelectedQuote(null);
    setStatus('idle');
  }, [fromToken, toToken]);

  const clearError = useCallback(() => setError(null), []);

  return {
    fromToken, toToken, fromAmount, toAmount, preference,
    quotes, selectedQuote, status, error, txHash, providerErrors, swapHistory,
    setFromToken, setToToken, setFromAmount, setPreference, setSelectedQuote,
    getQuotes, executeSwap, swapTokens, clearError,
  };
}
