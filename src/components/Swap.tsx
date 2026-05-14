'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ArrowDownUp, Search, ChevronDown, AlertCircle, CheckCircle2, Clock, Loader2, Zap, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwap } from '@/hooks/useSwap';
import { useSwapTokens } from '@/hooks/useSwapTokens';
import { ChainMappingService } from '@/lib/swap/chainMapping';
import { StandardizedAsset } from '@/types/swap';
import SwapTokenModal from '@/components/swap/SwapTokenModal';
import SwapChainSelector from '@/components/SwapChainSelector';

export default function SwapView() {
  const { primaryWallet } = useDynamicContext();
  const walletAddress = primaryWallet?.address || '';

  const {
    fromToken, toToken, fromAmount, toAmount,
    quotes, selectedQuote, status, error, providerErrors,
    setFromToken, setToToken, setFromAmount, setSelectedQuote,
    getQuotes, executeSwap, swapTokens, clearError,
  } = useSwap();

  const { tokens, loading: tokensLoading } = useSwapTokens();

  const [fromChainFilter, setFromChainFilter] = useState<string | number | null>(null);
  const [toChainFilter, setToChainFilter] = useState<string | number | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState<'from' | 'to' | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Set defaults on first token load
  useEffect(() => {
    if (tokens.length > 0 && !fromToken) {
      const eth = tokens.find(t => t.symbol === 'ETH' && t.chainId === 1);
      setFromToken(eth || tokens[0]);
    }
  }, [tokens, fromToken, setFromToken]);

  useEffect(() => {
    if (tokens.length > 0 && !toToken) {
      const usdc = tokens.find(t => t.symbol === 'USDC' && t.chainId === 8453);
      setToToken(usdc || tokens[1]);
    }
  }, [tokens, toToken, setToToken]);

  // Auto-set chain filters based on selected tokens
  useEffect(() => {
    if (fromToken) setFromChainFilter(fromToken.chainId);
  }, [fromToken]);
  useEffect(() => {
    if (toToken) setToChainFilter(toToken.chainId);
  }, [toToken]);

  const handleGetQuote = useCallback(async () => {
    if (!walletAddress) return;
    await getQuotes(walletAddress, walletAddress);
  }, [walletAddress, getQuotes]);

  const handleExecute = useCallback(async () => {
    const result = await executeSwap(walletAddress);
    if (result) {
      setExecutionResult(result);
    }
  }, [executeSwap, walletAddress]);

  const handleSwapDirection = useCallback(() => {
    swapTokens();
  }, [swapTokens]);

  const handleTokenSelect = useCallback((token: StandardizedAsset) => {
    if (tokenModalOpen === 'from') {
      setFromToken(token);
      setFromChainFilter(token.chainId);
    } else if (tokenModalOpen === 'to') {
      setToToken(token);
      setToChainFilter(token.chainId);
    }
    setTokenModalOpen(null);
  }, [tokenModalOpen, setFromToken, setToToken]);

  const filteredFromTokens = fromChainFilter
    ? tokens.filter(t => String(t.chainId) === String(fromChainFilter))
    : tokens;

  const filteredToTokens = toChainFilter
    ? tokens.filter(t => String(t.chainId) === String(toChainFilter))
    : tokens;

  const fromChainInfo = fromToken ? ChainMappingService.getChainInfo(fromToken.chainId) : null;
  const toChainInfo = toToken ? ChainMappingService.getChainInfo(toToken.chainId) : null;

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
    return `~${(seconds / 3600).toFixed(1)}h`;
  };

  const isCrossChain = fromToken && toToken &&
    String(fromToken.chainId) !== String(toToken.chainId);

  const canQuote = fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && walletAddress;

  const getButtonText = () => {
    if (!walletAddress) return 'Connect Wallet';
    if (!fromToken || !toToken) return 'Select Tokens';
    if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter Amount';
    if (status === 'quoting') return 'Getting Quote...';
    if (status === 'quoted' && selectedQuote) return 'Execute Swap';
    if (status === 'executing') return 'Executing...';
    if (status === 'pending') return 'Transaction Pending...';
    return 'Get Quote';
  };

  const getButtonAction = () => {
    if (status === 'quoted' && selectedQuote) return handleExecute;
    if (status === 'idle' || status === 'failed') return handleGetQuote;
    return undefined;
  };

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#e4e4e7]">Cross-Chain Swap</h1>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              {isCrossChain ? 'Cross-chain via LiFi & SideShift' : 'Same-chain swap'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-white/30" />
            <span className="text-xs text-white/30">
              {quotes.length} route{quotes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden">
          {/* ─── FROM Section ─── */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#8E8E8E] uppercase tracking-wider font-medium">From</span>
              <SwapChainSelector
                chainId={fromToken?.chainId ?? null}
                onSelect={(id) => {
                  setFromChainFilter(id);
                  if (fromToken && String(fromToken.chainId) !== String(id)) {
                    setFromToken(null);
                  }
                }}
                excludeChainId={null}
              />
            </div>

            <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
              {/* Token selector */}
              <button
                onClick={() => setTokenModalOpen('from')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
              >
                {fromToken?.logoUrl ? (
                  <img src={fromToken.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                    {fromToken?.symbol?.slice(0, 2) || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-[#e4e4e7]">
                  {fromToken?.symbol || 'Select'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>

              {/* Amount input */}
              <input
                type="text"
                inputMode="decimal"
                value={fromAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setFromAmount(val);
                }}
                placeholder="0.0"
                className="flex-1 bg-transparent text-right text-lg font-mono text-[#e4e4e7] placeholder:text-white/20 focus:outline-none"
              />
            </div>

            {/* Sub info row */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-white/30">
                {fromChainInfo?.name || ''}
              </span>
              <div className="flex items-center gap-3">
                {fromToken?.priceUsd && fromAmount && (
                  <span className="text-xs text-white/30">
                    ${formatAmount(String(parseFloat(fromAmount) * fromToken.priceUsd))}
                  </span>
                )}
                <button
                  onClick={() => setFromAmount('100')}
                  className="text-[10px] text-[#8E8E8E] hover:text-white/60 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* ─── SWAP DIRECTION BUTTON ─── */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwapDirection}
              className="w-10 h-10 rounded-xl bg-[#121212] border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowDownUp className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* ─── TO Section ─── */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#8E8E8E] uppercase tracking-wider font-medium">To</span>
              <SwapChainSelector
                chainId={toToken?.chainId ?? null}
                onSelect={(id) => {
                  setToChainFilter(id);
                  if (toToken && String(toToken.chainId) !== String(id)) {
                    setToToken(null);
                  }
                }}
                excludeChainId={null}
              />
            </div>

            <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
              {/* Token selector */}
              <button
                onClick={() => setTokenModalOpen('to')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
              >
                {toToken?.logoUrl ? (
                  <img src={toToken.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                    {toToken?.symbol?.slice(0, 2) || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-[#e4e4e7]">
                  {toToken?.symbol || 'Select'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>

              {/* Output display */}
              <div className="flex-1 text-right">
                {status === 'quoting' ? (
                  <div className="flex items-center justify-end gap-2">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                    <span className="text-lg font-mono text-white/30">...</span>
                  </div>
                ) : (
                  <span className="text-lg font-mono text-[#e4e4e7]">
                    {selectedQuote ? formatAmount(selectedQuote.outputAmount) : '0.0'}
                  </span>
                )}
              </div>
            </div>

            {/* Sub info row */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-white/30">
                {toChainInfo?.name || ''}
              </span>
              {toToken?.priceUsd && toAmount && (
                <span className="text-xs text-white/30">
                  ${formatAmount(String(parseFloat(toAmount) * toToken.priceUsd))}
                </span>
              )}
            </div>
          </div>

          {/* ─── QUOTE DETAILS ─── */}
          {selectedQuote && (
            <div className="border-t border-white/5 px-5 py-4 space-y-2.5">
              {/* Route info */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E8E8E]">Provider</span>
                <div className="flex items-center gap-2">
                  {selectedQuote.actualProviderLogo && (
                    <img src={selectedQuote.actualProviderLogo} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  <span className="text-xs text-[#e4e4e7] font-medium">
                    {selectedQuote.actualProvider || selectedQuote.provider}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E8E8E]">Est. Time</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/30" />
                  <span className="text-xs text-[#e4e4e7]">
                    {formatTime(selectedQuote.estimatedTime)}
                  </span>
                </div>
              </div>

              {selectedQuote.fees.total !== '0' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E8E8E]">Est. Gas & Fees</span>
                  <span className="text-xs text-[#e4e4e7]">
                    ${parseFloat(selectedQuote.fees.total).toFixed(2)}
                  </span>
                </div>
              )}

              {selectedQuote.type && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E8E8E]">Rate Type</span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    selectedQuote.type === 'fixed'
                      ? 'bg-[#56C0A6]/10 text-[#56C0A6]'
                      : 'bg-white/5 text-white/50'
                  )}>
                    {selectedQuote.type === 'fixed' ? 'Fixed Rate' : 'Variable'}
                  </span>
                </div>
              )}

              {/* Rate display */}
              {fromToken && toToken && selectedQuote && parseFloat(fromAmount) > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-center">
                    <span className="text-xs text-white/30">
                      1 {fromToken.symbol} = {' '}
                      {formatAmount(String(parseFloat(selectedQuote.outputAmount) / parseFloat(fromAmount)))}{' '}
                      {toToken.symbol}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MULTIPLE QUOTES ─── */}
          {quotes.length > 1 && (
            <div className="border-t border-white/5 px-5 py-3">
              <span className="text-xs text-[#8E8E8E] mb-2 block">Alternative Routes</span>
              <div className="space-y-2">
                {quotes.map((q, idx) => {
                  const isSelected = selectedQuote?.id === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left',
                        isSelected
                          ? 'border-white/20 bg-white/5'
                          : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                          idx === 0 ? 'bg-[#56C0A6]/20 text-[#56C0A6]' : 'bg-white/5 text-white/40'
                        )}>
                          {idx === 0 ? '★' : idx + 1}
                        </span>
                        <span className="text-xs text-[#e4e4e7]">
                          {q.actualProvider || q.provider}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-[#e4e4e7]">
                          {formatAmount(q.outputAmount)}
                        </span>
                        <span className="text-[10px] text-white/30 ml-2">
                          {formatTime(q.estimatedTime)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── ERROR DISPLAY ─── */}
          {error && (
            <div className="border-t border-white/5 px-5 py-3">
              <div className="flex items-start gap-2 text-[#FF6468]">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm">{error}</p>
                  <button onClick={clearError} className="text-xs underline mt-1 text-[#FF6468]/60 hover:text-[#FF6468]">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── PROVIDER ERRORS ─── */}
          {Object.keys(providerErrors).length > 0 && !error && (
            <div className="border-t border-white/5 px-5 py-2">
              {Object.entries(providerErrors).map(([provider, errMsg]) => (
                <p key={provider} className="text-[10px] text-white/20">
                  {provider}: {errMsg}
                </p>
              ))}
            </div>
          )}

          {/* ─── SUCCESS STATE ─── */}
          {status === 'pending' && executionResult && (
            <div className="border-t border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#56C0A6] animate-spin" />
                <div>
                  <p className="text-sm text-[#e4e4e7] font-medium">Transaction Submitted</p>
                  <p className="text-xs text-[#8E8E8E] mt-0.5">
                    {executionResult.type === 'sideshift'
                      ? 'Deposit to the provided address to complete the shift'
                      : 'Waiting for confirmation...'}
                  </p>
                </div>
              </div>
              {executionResult.type === 'sideshift' && executionResult.shift?.depositAddress && (
                <div className="mt-3 p-3 bg-[#0a0a0a] rounded-lg border border-white/5">
                  <span className="text-[10px] text-white/30 block mb-1">Deposit Address</span>
                  <p className="text-xs font-mono text-[#e4e4e7] break-all">
                    {executionResult.shift.depositAddress}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── ACTION BUTTON ─── */}
          <div className="p-5 pt-2">
            <button
              onClick={getButtonAction()}
              disabled={!canQuote || status === 'quoting' || status === 'executing' || status === 'pending'}
              className={cn(
                'w-full py-3.5 rounded-xl text-sm font-semibold transition-all',
                status === 'quoted' && selectedQuote
                  ? 'bg-[#56C0A6] text-black hover:bg-[#56C0A6]/90 active:scale-[0.98]'
                  : 'bg-white/90 text-black hover:bg-white active:scale-[0.98]',
                (!canQuote || status === 'quoting' || status === 'executing' || status === 'pending') &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="flex items-center justify-center gap-2">
                {status === 'quoting' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'executing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                {getButtonText()}
              </span>
            </button>
          </div>
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-[10px] text-white/20">Powered by</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 font-medium">LiFi</span>
            <span className="text-[10px] text-white/10">•</span>
            <span className="text-[10px] text-white/30 font-medium">SideShift</span>
          </div>
        </div>
      </div>

      {/* Token Selection Modal */}
      <SwapTokenModal
        isOpen={tokenModalOpen !== null}
        onClose={() => setTokenModalOpen(null)}
        tokens={tokenModalOpen === 'from' ? filteredFromTokens : filteredToTokens}
        onSelect={handleTokenSelect}
        selectedToken={tokenModalOpen === 'from' ? fromToken : toToken}
        title={tokenModalOpen === 'from' ? 'Select Send Token' : 'Select Receive Token'}
      />
    </div>
  );
}
