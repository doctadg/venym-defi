'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAllTickers } from '../services/api'
import { TickerData } from '../types'
import { CloseIcon, SearchIcon, SortIcon, StarIcon } from './Icons'

interface TickerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (symbol: string, platform?: string) => void
  currentSymbol?: string
}

const PLATFORMS = ['All', 'Hyperliquid', 'Aster', 'Lighter', 'Pacifica', 'Avantis']

function formatPrice(price: string | undefined): string {
  if (!price) return '--'
  const num = parseFloat(price)
  if (isNaN(num)) return '--'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  return `${sign}${num.toFixed(2)}`
}

const PLATFORM_LOGOS: Record<string, string> = {
  hyperliquid: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
  aster: 'https://s2.coinmarketcap.com/static/img/coins/64x64/36341.png',
  lighter: 'https://s2.coinmarketcap.com/static/img/coins/64x64/39125.png',
  pacifica: '/pacifica.png',
  avantis: '/avantis.png',
}

const getAvailabilityTags = (
  availability?: TickerData['availability']
): { logo: string; title: string }[] => {
  if (!availability) return []

  const tags: { logo: string; title: string }[] = []

  if (availability.hyperliquid) {
    tags.push({
      logo: PLATFORM_LOGOS.hyperliquid,
      title: 'Available on Hyperliquid',
    })
  }
  if (availability.aster) {
    tags.push({ logo: PLATFORM_LOGOS.aster, title: 'Available on Aster' })
  }
  if (availability.lighter) {
    tags.push({ logo: PLATFORM_LOGOS.lighter, title: 'Available on Lighter' })
  }
  if (availability.pacifica) {
    tags.push({ logo: PLATFORM_LOGOS.pacifica, title: 'Available on Pacifica' })
  }
  if (availability.avantis) {
    tags.push({ logo: PLATFORM_LOGOS.avantis, title: 'Available on Avantis' })
  }

  return tags
}

const TickerSelectionModal: React.FC<TickerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All')
  const [tickers, setTickers] = useState<TickerData[]>([])
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<
    'symbol' | 'price' | 'change' | 'volume' | 'oi'
  >('symbol')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const tableRef = React.useRef<HTMLTableElement>(null)

  const loadTickers = async () => {
    setLoading(true)
    try {
      const platform =
        selectedPlatform === 'All' ? undefined : selectedPlatform.toLowerCase()
      const data = await fetchAllTickers(platform)
      setTickers(data)
    } catch (error) {
      console.error('Error loading tickers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickers = useMemo(() => {
    let filtered = tickers.filter((ticker) => {
      const matchesSearch =
        !searchQuery ||
        ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case 'symbol':
          aVal = a.symbol.toLowerCase()
          bVal = b.symbol.toLowerCase()
          break
        case 'price':
          aVal = parseFloat(a.lastPrice || '0')
          bVal = parseFloat(b.lastPrice || '0')
          break
        case 'change':
          aVal = parseFloat(a.changePercent24h || '0')
          bVal = parseFloat(b.changePercent24h || '0')
          break
        case 'volume':
          aVal = parseFloat(a.volume24h || '0')
          bVal = parseFloat(b.volume24h || '0')
          break
        case 'oi':
          aVal = parseFloat(a.openInterest || '0')
          bVal = parseFloat(b.openInterest || '0')
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [tickers, searchQuery, sortColumn, sortDirection])

  const activeList = filteredTickers

  const toggleFavorite = useCallback((symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(symbol)) {
        newFavorites.delete(symbol)
      } else {
        newFavorites.add(symbol)
      }
      return newFavorites
    })
  }, [])

  const handleSelect = useCallback(
    (ticker: TickerData) => {
      onSelect(ticker.symbol, ticker.platform)
      onClose()
    },
    [onSelect, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      loadTickers()
      setSelectedIndex(0)
      setSearchQuery('')
    }
  }, [isOpen, selectedPlatform])

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex >= 0 && tableRef.current) {
      const tbody = tableRef.current.querySelector('tbody')
      if (tbody) {
        const rows = tbody.querySelectorAll('tr')
        if (rows[selectedIndex]) {
          rows[selectedIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          })
        }
      }
    }
  }, [selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const listLen = activeList.length
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          Math.min(prev + 1, listLen - 1)
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && activeList[selectedIndex]) {
        e.preventDefault()
        handleSelect(activeList[selectedIndex] as TickerData)
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 's' &&
        filteredTickers[selectedIndex]
      ) {
        e.preventDefault()
        toggleFavorite(filteredTickers[selectedIndex].symbol)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeList, filteredTickers, selectedIndex, handleSelect, toggleFavorite])

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-[52vw] max-w-[1100px] h-[50vh] max-h-[900px] bg-[#14192F] flex flex-col shadow-2xl rounded-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h2 className="text-white text-sm font-semibold">
            Select Trading Symbol
          </h2>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-1 hover:bg-[#14192F] rounded-lg transition-colors text-[#8E8E8E]"
            title="Press Esc to close"
          >
            <CloseIcon className="w-5 h-5 text-white" />
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-[#CFCFCF]">
              Esc
            </kbd>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-3 border-b border-white/10 space-y-2">
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E8E]" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-[#8E8E8E] focus:outline-none focus:border-brand-gold/50"
              autoFocus
            />
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {PLATFORMS.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`
                  px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap
                  ${selectedPlatform === platform
                    ? 'bg-brand-gold text-white'
                    : 'bg-[#14192F] text-white hover:bg-[#14192F]'
                  }
                `}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#8E8E8E]">Loading tickers...</div>
            </div>
          ) : (
            <table ref={tableRef} className="w-full">
              <thead className="sticky top-0 z-10 bg-[#14192F] border-b border-white/10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8E8E8E]">
                    <div className="flex items-center gap-2">
                      <span>Symbol</span>
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right text-xs font-medium text-[#8E8E8E] cursor-pointer hover:text-white"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Last Price</span>
                      <SortIcon className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right text-xs font-medium text-[#8E8E8E] cursor-pointer hover:text-white"
                    onClick={() => handleSort('change')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24H Change</span>
                      <SortIcon className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[#8E8E8E]">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>8H Funding</span>
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right text-xs font-medium text-[#8E8E8E] cursor-pointer hover:text-white"
                    onClick={() => handleSort('volume')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Volume</span>
                      <SortIcon className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right text-xs font-medium text-[#8E8E8E] cursor-pointer hover:text-white"
                    onClick={() => handleSort('oi')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Open Interest</span>
                      <SortIcon className="w-2.5 h-2.5" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[#8E8E8E]"
                    >
                      No tickers found
                    </td>
                  </tr>
                ) : (
                  /* ======= NORMAL TICKER ROWS ======= */
                  filteredTickers.map((ticker, index) => {
                    const change24h = ticker.change24h
                      ? parseFloat(ticker.change24h)
                      : null
                    const changePercent24h = ticker.changePercent24h
                      ? parseFloat(ticker.changePercent24h)
                      : null
                    const isPositive =
                      change24h !== null ? change24h >= 0 : true
                    const isFavorite = favorites.has(ticker.symbol)
                    const isCurrent = ticker.symbol === currentSymbol
                    const isSelected = index === selectedIndex
                    const availabilityTags = getAvailabilityTags(
                      ticker.availability
                    )

                    return (
                      <tr
                        key={`${ticker.symbol}-${ticker.platform}`}
                        onClick={() => handleSelect(ticker)}
                        className={`
                            border-b border-white/10 cursor-pointer transition-colors
                          ${isSelected
                            ? 'bg-[#1e40c6]/10'
                            : 'hover:bg-[#1e2544]'
                          }
                            ${isCurrent ? 'bg-white/10' : ''}
                        `}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                onClick={(e) =>
                                  toggleFavorite(ticker.symbol, e)
                                }
                                className="p-0.5 hover:bg-[#dee3f1] rounded transition-colors"
                              >
                                <StarIcon
                                  className={`w-2.5 h-2.5 ${isFavorite
                                    ? 'text-[#1e40c6] fill-[#1e40c6]'
                                    : 'text-[#8E8E8E]'
                                    }`}
                                />
                              </button>
                              <div className="flex items-center gap-1.5">
                                {ticker.logoUrl ? (
                                  <img
                                    src={ticker.logoUrl}
                                    alt={ticker.symbol}
                                    className="w-5 h-5 rounded-full"
                                    onError={(e) => {
                                      ; (
                                        e.target as HTMLImageElement
                                      ).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#dee3f1] flex items-center justify-center text-[10px] text-[#8E8E8E]">
                                    {ticker.symbol.charAt(0) || ''}
                                  </div>
                                )}
                                <span className="text-white text-xs font-medium">
                                  {ticker.symbol.replace(/\/USD|-USD/g, '')}
                                  -USDC
                                </span>
                                {ticker.leverage ? (
                                  <span className="px-1.5 py-0.5 bg-[#1e40c6]/20 text-[#1e40c6] text-[10px] rounded">
                                    {ticker.leverage}x
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            {availabilityTags.length > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                {availabilityTags.map((tag) => (
                                  <img
                                    key={tag.logo}
                                    src={tag.logo}
                                    alt={tag.title}
                                    title={tag.title}
                                    className="w-4 h-4 rounded-full"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1 text-right text-white text-xs">
                          {formatPrice(ticker.lastPrice)}
                        </td>
                        <td className="px-3 py-1 text-right">
                          {change24h !== null && changePercent24h !== null ? (
                            <div className="flex flex-col items-end">
                              <span
                                className={`text-xs ${isPositive
                                  ? 'text-[#56C0A6]'
                                  : 'text-[#FF6468]'
                                  }`}
                              >
                                {formatChange(ticker.change24h)} /{' '}
                                {formatPercent(ticker.changePercent24h)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#8E8E8E] text-xs">--</span>
                          )}
                        </td>
                        <td className="px-3 py-1 text-right text-white text-xs">
                          {ticker.fundingRate
                            ? formatPercent(ticker.fundingRate)
                            : '--'}
                        </td>
                        <td className="px-3 py-1 text-right text-white text-xs">
                          {formatVolume(ticker.volume24h)}
                        </td>
                        <td className="px-3 py-1 text-right text-white text-xs">
                          {formatVolume(ticker.openInterest)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Keyboard Shortcuts */}
        <div className="px-3 py-2 border-t border-white/10 flex items-center gap-3 text-[10px] text-[#8E8E8E]">
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white/10 rounded">⌘K</kbd>
            <span>Open</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#1e2544] rounded">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#1e2544] rounded">Enter</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#1e2544] rounded">⌘S</kbd>
            <span>Favorite</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#1e2544] rounded">Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TickerSelectionModal
