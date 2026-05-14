'use client'

import React, { useEffect, useRef, useState } from 'react'
import { TickerData } from '../types'

interface PriceHeaderProps {
  symbol: string
  tickerData: TickerData | null
  currentCandle?: {
    open: number
    high: number
    low: number
    close: number
    change?: number
    changePercent?: number
  }
  leverage?: number
  onSymbolClick?: () => void
  hideSelector?: boolean
}

function formatPrice(price: string | undefined): string {
  if (!price) return '--'
  const num = parseFloat(price)
  if (isNaN(num)) return '--'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatVolume(volume: string | undefined): string {
  if (!volume) return '--'
  const num = parseFloat(volume)
  if (isNaN(num)) return '--'

  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`
  }
  return `$${num.toFixed(2)}`
}

function formatPercent(value: string | undefined): string {
  if (!value) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

function formatChange(value: string | undefined): string {
  if (!value) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(1)}`
}

type FlashField =
  | 'markPrice'
  | 'change24h'
  | 'changePercent24h'
  | 'volume24h'
  | 'openInterest'
  | 'fundingRate'
  | 'high24h'
  | 'low24h'

const TRACKED_FIELDS: FlashField[] = [
  'markPrice',
  'change24h',
  'changePercent24h',
  'volume24h',
  'openInterest',
  'fundingRate',
  'high24h',
  'low24h',
]

const PriceHeader: React.FC<PriceHeaderProps> = ({
  symbol,
  tickerData,
  currentCandle,
  leverage,
  onSymbolClick,
  hideSelector,
}) => {
  // Use currentCandle data if available, otherwise fallback to tickerData
  const markPrice = currentCandle?.close?.toString() || tickerData?.markPrice
  const change24h =
    currentCandle?.change !== undefined
      ? currentCandle.change
      : tickerData?.change24h
        ? parseFloat(tickerData.change24h)
        : null
  const changePercent24h =
    currentCandle?.changePercent !== undefined
      ? currentCandle.changePercent
      : tickerData?.changePercent24h
        ? parseFloat(tickerData.changePercent24h)
        : null

  const isPositive = change24h !== null ? change24h >= 0 : true
  const [flashedFields, setFlashedFields] = useState<
    Partial<Record<FlashField, boolean>>
  >({})
  const previousValuesRef = useRef<
    Partial<Record<FlashField, string | undefined>>
  >({})

  useEffect(() => {
    if (!tickerData) return

    const updatedFields: FlashField[] = []
    TRACKED_FIELDS.forEach((field) => {
      const nextValue = tickerData[field]
      const prevValue = previousValuesRef.current[field]

      if (
        prevValue !== undefined &&
        nextValue !== undefined &&
        nextValue !== prevValue
      ) {
        updatedFields.push(field)
      }

      previousValuesRef.current[field] = nextValue
    })

    if (!updatedFields.length) return

    setFlashedFields((prev) => {
      const next = { ...prev }
      updatedFields.forEach((field) => {
        next[field] = true
      })
      return next
    })

    const timeoutId = setTimeout(() => {
      setFlashedFields((prev) => {
        const next = { ...prev }
        updatedFields.forEach((field) => {
          delete next[field]
        })
        return next
      })
    }, 700)

    return () => clearTimeout(timeoutId)
  }, [tickerData])

  const getFlashStyle = (
    field: FlashField
  ): React.CSSProperties | undefined => {
    if (flashedFields[field]) {
      return { textShadow: '0 0 8px rgba(30, 64, 198, 0.7)' }
    }
    return undefined
  }

  const changeFlashStyle =
    flashedFields.change24h || flashedFields.changePercent24h
      ? { textShadow: '0 0 8px rgba(30, 64, 198, 0.7)' }
      : undefined

  return (
    <div className="w-full bg-[#14192F] border-b border-white/10 px-4 py-3">
      {/* Single Inline Row: All metrics in one line like Hyperliquid */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Symbol with Logo and Leverage Badge */}
        {!hideSelector && (
          <div className="flex items-center gap-2">
            {tickerData?.logoUrl ? (
              <img
                src={tickerData.logoUrl}
                alt={symbol}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  ; (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-[#8E8E8E]">
                {symbol.charAt(0)}
              </div>
            )}
            <button
              onClick={onSymbolClick}
              className="text-white text-lg font-semibold hover:text-[#1e40c6] transition-colors cursor-pointer flex items-center gap-1"
            >
              {symbol}
              <svg
                className="w-4 h-4"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {leverage && (
              <span className="px-2 py-0.5 bg-[#1e40c6]/20 text-[#1e40c6] text-xs font-medium rounded">
                {leverage}x
              </span>
            )}
          </div>
        )}

        {/* Extra Small Header Row */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Mark Price */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              Mark
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('markPrice')}
            >
              {markPrice ? formatPrice(markPrice) : '--'}
            </span>
          </div>

          {/* 24H Change */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              24H Change
            </span>
            {change24h !== null && changePercent24h !== null ? (
              <span
                className={`${isPositive ? 'text-[#56C0A6]' : 'text-[#FF6468]'
                  } transition-colors duration-300`}
                style={changeFlashStyle}
              >
                {formatChange(tickerData?.change24h)} /{' '}
                {formatPercent(tickerData?.changePercent24h)}
              </span>
            ) : (
              <span className="text-[#8E8E8E]">--</span>
            )}
          </div>

          {/* 24H Volume */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              24H Vol
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('volume24h')}
            >
              {tickerData?.volume24h
                ? formatVolume(tickerData.volume24h)
                : '--'}
            </span>
          </div>

          {/* Open Interest */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              Open Interest
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('openInterest')}
            >
              {tickerData?.openInterest
                ? formatVolume(tickerData.openInterest)
                : '--'}
            </span>
          </div>

          {/* High 24H */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              High 24H
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('high24h')}
            >
              {tickerData?.high24h ? formatPrice(tickerData.high24h) : '--'}
            </span>
          </div>

          {/* Low 24H */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              Low 24H
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('low24h')}
            >
              {tickerData?.low24h ? formatPrice(tickerData.low24h) : '--'}
            </span>
          </div>

          {/* Funding Rate */}
          <div className="flex items-center gap-1">
            <span className="text-[#8E8E8E] border-b border-dashed border-[#8E8E8E]">
              Funding
            </span>
            <span
              className="text-white transition-colors duration-300"
              style={getFlashStyle('fundingRate')}
            >
              {tickerData?.fundingRate
                ? formatPercent(tickerData.fundingRate)
                : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PriceHeader
