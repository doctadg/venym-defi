import React from 'react'
import { useOrderbook } from '../hooks/useOrderbook'
import { ChevronDown, SourceIcon } from './Icons'

const PLATFORM_LOGOS: Record<string, string> = {
  hyperliquid: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
  aster: 'https://s2.coinmarketcap.com/static/img/coins/64x64/36341.png',
  lighter: 'https://s2.coinmarketcap.com/static/img/coins/64x64/39125.png',
  pacifica: '/pacifica.png',
  avantis: '/avantis.png',
}

interface OrderBookRowProps {
  price: string
  size: string
  type: 'ask' | 'bid'
  sources?: { platform: string; size: number }[]
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({
  price,
  size,
  type,
  sources,
}) => {
  // Get the primary platform (first source or the one with largest size)
  const primaryPlatform = sources?.[0]?.platform
  const logoUrl = primaryPlatform ? PLATFORM_LOGOS[primaryPlatform] : undefined

  return (
    <div className="flex items-center justify-between py-1 px-1 hover:bg-white/5 cursor-pointer group rounded text-[11px] font-sans leading-4">
      <span
        className={`flex-1 ${type === 'ask' ? 'text-brand-red' : 'text-brand-green'
          }`}
      >
        {price}
      </span>
      <span className="flex-1 text-right text-[#8E8E8E] group-hover:text-white">
        {size}
      </span>
      <div className="flex-none w-8 flex justify-end pr-1">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={primaryPlatform}
            title={primaryPlatform}
            className="w-3.5 h-3.5 rounded-full opacity-80 group-hover:opacity-100"
          />
        ) : (
          <SourceIcon className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
        )}
      </div>
    </div>
  )
}

const OrderBook = ({ activeSymbol }: { activeSymbol: string }) => {
  const { data, loading, error } = useOrderbook(activeSymbol)

  if (loading && !data) {
    return (
      <div className="w-full bg-bg-panel border border-border rounded-3xl p-3 flex flex-col h-full items-center justify-center text-[#8E8E8E] text-xs">
        Loading...
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="w-full bg-bg-panel border border-border rounded-3xl p-3 flex flex-col h-full items-center justify-center text-brand-red text-xs">
        Error loading orderbook
      </div>
    )
  }

  // Format data for display
  const asks =
    data?.asks?.levels?.slice(0, 15).map((level) => ({
      price: parseFloat(level.price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      size: parseFloat(level.size).toFixed(4),
      sources: level.sources,
    })) || []

  const bids =
    data?.bids?.levels?.slice(0, 15).map((level) => ({
      price: parseFloat(level.price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      size: parseFloat(level.size).toFixed(4),
      sources: level.sources,
    })) || []

  const bestBid = data?.bids?.levels?.[0]
    ? parseFloat(data.bids.levels[0].price)
    : 0
  const bestAsk = data?.asks?.levels?.[0]
    ? parseFloat(data.asks.levels[0].price)
    : 0
  const bestBidPlatform = data?.bids?.levels?.[0]?.sources?.[0]?.platform
  const bestAskPlatform = data?.asks?.levels?.[0]?.sources?.[0]?.platform

  const spreadValue = bestAsk - bestBid
  const spreadPercent = bestAsk > 0 ? (spreadValue / bestAsk) * 100 : 0

  return (
    <div className="w-full bg-bg-panel border border-border rounded-3xl p-3 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-[#8E8E8E] text-xs font-medium uppercase tracking-wide">
          Order Book
        </span>
        <div className="flex items-center gap-1 cursor-pointer text-[#8E8E8E] hover:text-white">
          <span className="text-[10px] font-medium">STACK</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </div>
      </div>

      {/* Best Stats */}
      <div className="flex flex-col gap-1.5 mb-3 text-xs font-sans">
        <div className="flex justify-between items-center px-1">
          <span className="text-brand-red">Best Buy:</span>
          <div className="flex items-center gap-2">
            {bestBidPlatform && PLATFORM_LOGOS[bestBidPlatform] ? (
              <img
                src={PLATFORM_LOGOS[bestBidPlatform]}
                alt={bestBidPlatform}
                className="w-3.5 h-3.5 rounded-full"
              />
            ) : (
              <SourceIcon className="w-3 h-3" />
            )}
            <span className="text-white">
              ${bestBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-brand-green">Best Sell:</span>
          <div className="flex items-center gap-2">
            {bestAskPlatform && PLATFORM_LOGOS[bestAskPlatform] ? (
              <img
                src={PLATFORM_LOGOS[bestAskPlatform]}
                alt={bestAskPlatform}
                className="w-3.5 h-3.5 rounded-full"
              />
            ) : (
              <SourceIcon className="w-3 h-3" />
            )}
            <span className="text-brand-green">
              ${bestAsk.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex justify-between items-center px-1 mb-2 text-[10px] text-[#5C5C5C] font-sans uppercase font-bold">
        <span className="flex-1">Price</span>
        <span className="flex-1 text-right">Size (BTC)</span>
        <span className="flex-none w-8 text-right">Source</span>
      </div>

      {/* Asks */}
      <div className="flex flex-col gap-0.5 mb-2 overflow-y-auto no-scrollbar flex-1 min-h-0 flex-col-reverse">
        {asks.map((ask, i) => (
          <OrderBookRow
            key={`ask-${i}`}
            price={ask.price}
            size={ask.size}
            type="ask"
            sources={ask.sources}
          />
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-between py-2 my-1 border-y border-white/10 bg-white/5 px-2">
        <span className="text-white font-sans text-sm font-medium">
          $
          {((bestBid + bestAsk) / 2).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}
        </span>
        <span className="text-[#5C5C5C] text-[10px]">
          Spread: {spreadPercent.toFixed(3)}%
        </span>
      </div>

      {/* Bids */}
      <div className="flex flex-col gap-0.5 mt-2 overflow-y-auto no-scrollbar flex-1 min-h-0">
        {bids.map((bid, i) => (
          <OrderBookRow
            key={`bid-${i}`}
            price={bid.price}
            size={bid.size}
            type="bid"
            sources={bid.sources}
          />
        ))}
      </div>
    </div>
  )
}

export default OrderBook
