import { useEffect, useRef, useState } from 'react'
import { DexMode, useDexMode } from '../contexts/DexModeContext'
import { useTour, TourType } from '../contexts/TourContext'
import { useChainCompatibility } from '../hooks/useChainCompatibility'
import { ChevronDown } from './Icons'

const PLATFORM_LOGOS: Record<string, string> = {
  hyperliquid: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
  aster: 'https://s2.coinmarketcap.com/static/img/coins/64x64/36341.png',
  lighter: 'https://s2.coinmarketcap.com/static/img/coins/64x64/39125.png',
  pacifica: '/pacifica.png',
  avantis: '/avantis.png',
}

const DEX_OPTIONS: { value: DexMode; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Best price routing' },
  {
    value: 'hyperliquid',
    label: 'Hyperliquid',
    description: 'Trade on Hyperliquid',
  },
  { value: 'aster', label: 'Aster', description: 'Trade on Aster' },
  { value: 'lighter', label: 'Lighter', description: 'Trade on Lighter' },
  { value: 'pacifica', label: 'Pacifica', description: 'Trade on Pacifica' },
  { value: 'avantis', label: 'Avantis', description: 'Trade on Avantis (Base)' },
]

const DexModeDropdown = () => {
  const { mode, setMode } = useDexMode()
  const { startTour, hasCompletedExchangeTour } = useTour()
  const { showChainIncompatibilityToast } = useChainCompatibility()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentOption =
    DEX_OPTIONS.find((opt) => opt.value === mode) || DEX_OPTIONS[0]

  return (
    <div id="dex-mode-selector" className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#121212] border border-border rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {mode === 'auto' ? (
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          ) : (
            <img
              src={PLATFORM_LOGOS[mode]}
              alt={currentOption.label}
              className="w-4 h-4 rounded-full"
            />
          )}
          <span className="text-white text-xs font-sans font-medium">
            {currentOption.label}
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-[#8E8E8E] transition-transform ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#121212] border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {DEX_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                const previousMode = mode
                setMode(option.value)
                setIsOpen(false)

                // Show chain incompatibility toast if needed
                if (option.value !== 'auto') {
                  showChainIncompatibilityToast(option.value)
                }

                // Trigger exchange-specific tour when switching to a new exchange
                // Only show if user hasn't completed that specific exchange tour yet
                if (previousMode !== option.value) {
                  if (option.value === 'lighter' && !hasCompletedExchangeTour('lighter')) {
                    // Delay to allow UI to update before showing tour
                    setTimeout(() => startTour('lighter'), 500)
                  } else if (option.value === 'hyperliquid' && !hasCompletedExchangeTour('hyperliquid')) {
                    setTimeout(() => startTour('hyperliquid'), 500)
                  } else if (option.value === 'pacifica' && !hasCompletedExchangeTour('pacifica')) {
                    setTimeout(() => startTour('pacifica'), 500)
                  }
                  // Aster doesn't need a tour - users can trade directly
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.8)]/15 transition-colors text-left ${mode === option.value ? 'bg-[rgba(255,255,255,0.9)]/20' : ''
                }`}
            >
              {option.value === 'auto' ? (
                <div
                  className={`w-2 h-2 rounded-full bg-brand-green shrink-0 ${mode === option.value
                    ? 'ring-2 ring-offset-2 ring-offset-[#121212] ring-white/30'
                    : ''
                    }`}
                />
              ) : (
                <img
                  src={PLATFORM_LOGOS[option.value]}
                  alt={option.label}
                  className="w-4 h-4 rounded-full shrink-0"
                />
              )}
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-sans ${mode === option.value
                    ? 'text-white font-medium'
                    : 'text-[#8E8E8E]'
                    }`}
                >
                  {option.label}
                </span>
                <span className="text-[10px] text-[#666]">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DexModeDropdown
