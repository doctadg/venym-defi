'use client'

import React, { useState, useCallback } from 'react'
import { ArrowDownUp, Search, ChevronDown, RefreshCw, ExternalLink, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

// Types
interface Chain {
  id: string
  name: string
  symbol: string
  color: string
}

interface Token {
  symbol: string
  name: string
  chain: string
  address: string
  decimals: number
  logoUrl?: string
  balance?: number
}

interface Quote {
  id: string
  provider: string
  fromAmount: string
  toAmount: string
  estimatedGas: string
  estimatedTime: string
  route: string[]
  slippage: number
}

type SwapStatus = 'idle' | 'quoting' | 'reviewing' | 'executing' | 'success' | 'failed'

// Supported chains
const CHAINS: Chain[] = [
  { id: 'eip155:1', name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'eip155:42161', name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0' },
  { id: 'eip155:56', name: 'BNB Chain', symbol: 'BNB', color: '#F3BA2F' },
  { id: 'eip155:137', name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
  { id: 'eip155:8453', name: 'Base', symbol: 'ETH', color: '#0052FF' },
  { id: 'eip155:43114', name: 'Avalanche', symbol: 'AVAX', color: '#E84142' },
  { id: 'eip155:10', name: 'Optimism', symbol: 'OP', color: '#FF0420' },
  { id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', name: 'Solana', symbol: 'SOL', color: '#9945FF' },
]

// Popular tokens per chain
const POPULAR_TOKENS: Token[] = [
  { symbol: 'ETH', name: 'Ethereum', chain: 'eip155:1', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', chain: 'eip155:1', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'USDT', name: 'Tether', chain: 'eip155:1', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', chain: 'eip155:1', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', chain: 'eip155:42161', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', chain: 'eip155:42161', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  { symbol: 'ARB', name: 'Arbitrum', chain: 'eip155:42161', address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', decimals: 18 },
  { symbol: 'ETH', name: 'Ethereum', chain: 'eip155:8453', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', chain: 'eip155:8453', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  { symbol: 'SOL', name: 'Solana', chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', address: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC', name: 'USD Coin', chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'BNB', name: 'BNB', chain: 'eip155:56', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDT', name: 'Tether', chain: 'eip155:56', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
  { symbol: 'MATIC', name: 'Polygon', chain: 'eip155:137', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', chain: 'eip155:137', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
]

// Chain Selector Component
function ChainSelector({ chains, selected, onSelect, label }: {
  chains: Chain[]
  selected: Chain | null
  onSelect: (c: Chain) => void
  label: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm"
      >
        {selected ? (
          <>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="text-[#e4e4e7]">{selected.name}</span>
          </>
        ) : (
          <span className="text-[#8E8E8E]">{label}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-[#8E8E8E]" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          {chains.map(chain => (
            <button
              key={chain.id}
              onClick={() => { onSelect(chain); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: chain.color }} />
              <span className="text-sm text-[#e4e4e7]">{chain.name}</span>
              {selected?.id === chain.id && <Check className="w-3.5 h-3.5 text-[#56C0A6] ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Token Selector Component
function TokenSelector({ tokens, selected, onSelect, label }: {
  tokens: Token[]
  selected: Token | null
  onSelect: (t: Token) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
      >
        {selected ? (
          <>
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#e4e4e7]">
              {selected.symbol.slice(0, 2)}
            </div>
            <span className="text-[#e4e4e7] font-medium">{selected.symbol}</span>
          </>
        ) : (
          <span className="text-[#8E8E8E]">{label}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-[#8E8E8E]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setSearch('') }}>
          <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Search */}
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E8E]" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e4e4e7] placeholder-[#8E8E8E] focus:outline-none focus:border-white/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Token List */}
            <div className="max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-[#8E8E8E] text-sm">No tokens found</div>
              ) : (
                filtered.map((token, i) => (
                  <button
                    key={`${token.chain}-${token.address}-${i}`}
                    onClick={() => { onSelect(token); setOpen(false); setSearch('') }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#e4e4e7]">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium text-[#e4e4e7]">{token.symbol}</div>
                      <div className="text-xs text-[#8E8E8E]">{token.name}</div>
                    </div>
                    {selected?.address === token.address && selected?.chain === token.chain && (
                      <Check className="w-4 h-4 text-[#56C0A6]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Main Swap View
export default function SwapView() {
  const [fromChain, setFromChain] = useState<Chain>(CHAINS[0]) // Ethereum
  const [toChain, setToChain] = useState<Chain>(CHAINS[1]) // Arbitrum
  const [fromToken, setFromToken] = useState<Token | null>(POPULAR_TOKENS[0]) // ETH
  const [toToken, setToToken] = useState<Token | null>(POPULAR_TOKENS[4]) // ETH on Arb
  const [fromAmount, setFromAmount] = useState('')
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fromTokens = POPULAR_TOKENS.filter(t => t.chain === fromChain?.id)
  const toTokens = POPULAR_TOKENS.filter(t => t.chain === toChain?.id)

  const handleSwapDirection = useCallback(() => {
    setFromChain(toChain)
    setToChain(fromChain)
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount('')
    setQuotes([])
    setSelectedQuote(null)
    setStatus('idle')
  }, [fromChain, toChain, fromToken, toToken])

  const handleGetQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount) return
    setStatus('quoting')
    setError(null)

    // Simulate quote fetching (will be replaced with real routing engine)
    setTimeout(() => {
      const amount = parseFloat(fromAmount) || 0
      const mockQuote: Quote = {
        id: 'mock-1',
        provider: 'LiFi',
        fromAmount: fromAmount,
        toAmount: (amount * 0.998).toFixed(6),
        estimatedGas: '~$2.50',
        estimatedTime: '~2 min',
        route: [fromChain.name, toChain.name],
        slippage: 0.5,
      }
      const mockQuote2: Quote = {
        id: 'mock-2',
        provider: 'SideShift',
        fromAmount: fromAmount,
        toAmount: (amount * 0.996).toFixed(6),
        estimatedGas: 'No gas',
        estimatedTime: '~5 min',
        route: [fromChain.name, toChain.name],
        slippage: 0.3,
      }
      setQuotes([mockQuote, mockQuote2])
      setSelectedQuote(mockQuote)
      setStatus('reviewing')
    }, 1500)
  }, [fromToken, toToken, fromAmount, fromChain, toChain])

  const handleExecuteSwap = useCallback(async () => {
    if (!selectedQuote) return
    setStatus('executing')

    // Simulate execution
    setTimeout(() => {
      setStatus('success')
    }, 3000)
  }, [selectedQuote])

  const handleReset = useCallback(() => {
    setStatus('idle')
    setQuotes([])
    setSelectedQuote(null)
    setFromAmount('')
    setError(null)
  }, [])

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-72px)] p-4 pt-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[#e4e4e7]">Cross-Chain Swap</h1>
          {status === 'quoting' && (
            <div className="flex items-center gap-2 text-sm text-[#8E8E8E]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Finding routes...
            </div>
          )}
        </div>

        {/* Swap Card */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
          {/* From Section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8E8E8E] uppercase tracking-wider">From</span>
              <ChainSelector
                chains={CHAINS}
                selected={fromChain}
                onSelect={(c) => { setFromChain(c); setFromToken(null) }}
                label="Select chain"
              />
            </div>
            <div className="flex items-center gap-3 bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
              <TokenSelector
                tokens={fromTokens}
                selected={fromToken}
                onSelect={setFromToken}
                label="Select token"
              />
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={e => { setFromAmount(e.target.value); setStatus('idle') }}
                className="flex-1 bg-transparent text-right text-2xl font-medium text-[#e4e4e7] placeholder-[#333] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={status === 'executing'}
              />
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-[#8E8E8E]">Balance: --</span>
              <button
                onClick={() => setFromAmount('100')}
                className="text-xs text-[#56C0A6] hover:text-[#56C0A6]/80 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwapDirection}
              className="w-10 h-10 rounded-full bg-[#050505] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              disabled={status === 'executing'}
            >
              <ArrowDownUp className="w-4 h-4 text-[#8E8E8E]" />
            </button>
          </div>

          {/* To Section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8E8E8E] uppercase tracking-wider">To</span>
              <ChainSelector
                chains={CHAINS}
                selected={toChain}
                onSelect={(c) => { setToChain(c); setToToken(null) }}
                label="Select chain"
              />
            </div>
            <div className="flex items-center gap-3 bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
              <TokenSelector
                tokens={toTokens}
                selected={toToken}
                onSelect={setToToken}
                label="Select token"
              />
              <div className="flex-1 text-right">
                {status === 'quoting' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#8E8E8E] ml-auto" />
                ) : selectedQuote ? (
                  <span className="text-2xl font-medium text-[#e4e4e7]">{selectedQuote.toAmount}</span>
                ) : (
                  <span className="text-2xl font-medium text-[#333]">0.00</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-[#8E8E8E]">Balance: --</span>
            </div>
          </div>

          {/* Quotes */}
          {quotes.length > 0 && status === 'reviewing' && (
            <div className="px-5 pb-4">
              <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5 space-y-3">
                <span className="text-xs text-[#8E8E8E] uppercase tracking-wider">Available Routes</span>
                {quotes.map(quote => (
                  <button
                    key={quote.id}
                    onClick={() => setSelectedQuote(quote)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedQuote?.id === quote.id
                        ? 'border-white/10 bg-white/5'
                        : 'border-transparent hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e4e4e7]">{quote.provider}</span>
                        <span className="text-xs text-[#8E8E8E]">
                          {quote.route.join(' → ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[#8E8E8E]">Gas: {quote.estimatedGas}</span>
                        <span className="text-xs text-[#8E8E8E]">Time: {quote.estimatedTime}</span>
                        <span className="text-xs text-[#8E8E8E]">Slippage: {quote.slippage}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[#56C0A6]">{quote.toAmount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="px-5 pb-5">
              <div className="bg-[#56C0A6]/10 border border-[#56C0A6]/20 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#56C0A6]/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-[#56C0A6]" />
                </div>
                <h3 className="text-[#e4e4e7] font-medium mb-1">Swap Submitted</h3>
                <p className="text-sm text-[#8E8E8E] mb-4">
                  {fromAmount} {fromToken?.symbol} → {selectedQuote?.toAmount} {toToken?.symbol}
                </p>
                <button
                  onClick={handleReset}
                  className="text-sm text-[#56C0A6] hover:text-[#56C0A6]/80 transition-colors"
                >
                  Make another swap
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-5 pb-4">
              <div className="bg-[#FF6468]/10 border border-[#FF6468]/20 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FF6468] shrink-0" />
                <span className="text-sm text-[#FF6468]">{error}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {status !== 'success' && (
            <div className="p-5 pt-0">
              {status === 'idle' || status === 'quoting' ? (
                <button
                  onClick={handleGetQuote}
                  disabled={!fromToken || !toToken || !fromAmount || status === 'quoting'}
                  className="w-full py-3.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white/90 text-black hover:bg-white"
                >
                  {status === 'quoting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finding best route...
                    </span>
                  ) : (
                    'Get Quote'
                  )}
                </button>
              ) : status === 'reviewing' ? (
                <button
                  onClick={handleExecuteSwap}
                  disabled={!selectedQuote}
                  className="w-full py-3.5 rounded-xl font-medium text-sm transition-colors bg-[#56C0A6] text-black hover:bg-[#56C0A6]/90 disabled:opacity-40"
                >
                  Execute Swap
                </button>
              ) : status === 'executing' ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl font-medium text-sm bg-white/10 text-[#8E8E8E] cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#8E8E8E]">
            Powered by LiFi & SideShift • Cross-chain routing by Venym
          </p>
        </div>
      </div>
    </div>
  )
}
