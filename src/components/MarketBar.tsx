import React from 'react'
import { MOCK_TICKERS } from '../constants'
import { Ticker } from '../types'
import { StarIcon } from './Icons'

const FilterButton = ({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) => (
  <button
    className={`
      flex items-center justify-center px-3 py-2 gap-1.5 rounded-lg text-xs font-sans border transition-all
      ${
        active
          ? 'bg-[#121212] border-[rgba(255,255,255,0.3)] text-white'
          : 'bg-[#1a1a1a] border-transparent text-white hover:bg-[rgba(255,255,255,0.1)]'
      }
    `}
  >
    {label === 'All' && (
      <StarIcon
        className={`w-3 h-3 ${active ? 'text-white' : 'text-[#696969]'}`}
      />
    )}
    {label}
  </button>
)

const TickerItem: React.FC<{ ticker: Ticker }> = ({ ticker }) => (
  <div className="flex items-center gap-1.5 px-3 cursor-pointer hover:opacity-80">
    <StarIcon className="w-3 h-3 text-[#856E4A]" />
    <span className="text-white text-xs font-sans">{ticker.symbol}</span>
    <span
      className={`text-xs font-sans ${
        ticker.isPositive ? 'text-brand-green' : 'text-brand-red'
      }`}
    >
      {ticker.change}
    </span>
  </div>
)

const MarketBar = () => {
  return (
    <div className="w-full h-14 bg-bg-panel border border-border rounded-xl flex items-center justify-between px-3 gap-6 overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button className="flex items-center justify-center px-3 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[rgba(255,255,255,0.1)]">
          <StarIcon className="w-3 h-3 text-[#696969]" />
        </button>
        <FilterButton label="All" active />
        <FilterButton label="Short" />
        <FilterButton label="Commodities" />
        <FilterButton label="Indices" />
        <FilterButton label="Stocks" />
        <FilterButton label="Core" />
        <FilterButton label="Degen" />
      </div>

      <div className="w-[1px] h-8 bg-[#1a1a1a] flex-shrink-0 hidden md:block" />

      {/* Tickers */}
      <div className="flex items-center gap-6 overflow-hidden flex-1 mask-linear-fade">
        <div className="flex items-center gap-6 animate-scroll whitespace-nowrap">
          {MOCK_TICKERS.map((t) => (
            <TickerItem key={t.symbol} ticker={t} />
          ))}
          {/* Duplicate for infinite scroll illusion if needed, simplified here */}
          {MOCK_TICKERS.map((t) => (
            <TickerItem key={`${t.symbol}-dup`} ticker={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default MarketBar
