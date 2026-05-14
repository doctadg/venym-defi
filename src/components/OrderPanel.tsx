import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useRef, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTrading } from '../hooks/useTrading'
import { AggregatedBalance, OrderSide, OrderType } from '../types'
import { BitcoinLogo, InfoIcon, WalletIcon, UnlockIcon, AlertTriangleIcon } from './Icons'
import { useDexMode } from '../contexts/DexModeContext'
import { useTour } from '../contexts/TourContext'
import { useAsterSetup } from '../hooks/useAsterSetup'
import { useHyperliquidSetup } from '../hooks/useHyperliquidSetup'
import { useLighterSetup } from '../hooks/useLighterSetup'
import { usePacificaSetup } from '../hooks/usePacificaSetup'
import { useAvantisSetup } from '../hooks/useAvantisSetup'
import { useChainCompatibility } from '../hooks/useChainCompatibility'
import { useOrderbook } from '../hooks/useOrderbook'
import { getRoutingRecommendation } from '../services/api'
import { RoutingInfo } from '../types'
import { getLeverageConfig, clampLeverage, getAvantisMaxLeverage, getAvantisMinLeverage, isZfpSupported } from '../config/leverageConfig'
import RoutingRecommendation from './RoutingRecommendation'
import LighterImportModal from './modals/LighterImportModal'
import { Button } from './ui/button'

interface OrderPanelProps {
  activeSymbol: string
  onDepositClick: () => void
  balanceData: AggregatedBalance | null
  balanceLoading: boolean
}

const OrderPanel = ({
  activeSymbol,
  onDepositClick,
  balanceData,
  balanceLoading,
}: OrderPanelProps) => {
  const [side, setSide] = useState<OrderSide>(OrderSide.LONG)
  const [orderType, setOrderType] = useState<OrderType | 'Zero Fee'>(OrderType.MARKET)
  const [leverage, setLeverageRaw] = useState(10)
  const [sizePercent, setSizePercent] = useState(0)
  const [size, setSize] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [routingData, setRoutingData] = useState<RoutingInfo | null>(null)
  const [isRoutingLoading, setIsRoutingLoading] = useState(false)
  const [isLighterImportModalOpen, setIsLighterImportModalOpen] =
    useState(false)
  const isManualSizeUpdate = useRef(false)

  const { primaryWallet } = useDynamicContext()
  const walletAddress = primaryWallet?.address || ''

  const {
    executeOpenPosition,
    loading: tradeLoading,
    error: tradeError,
  } = useTrading()
  const { data: orderbookData } = useOrderbook(activeSymbol)

  // Hyperliquid setup hook
  const {
    hasApiKey: hasHlApiKey,
    isLoading: hlSetupLoading,
    isApproving: hlIsApproving,
    enableTrading: enableHlTrading,
    checkApiKey: checkHlApiKey,
    error: hlSetupError,
  } = useHyperliquidSetup()

  // Aster setup hook
  const {
    hasApiKey: hasAsterApiKey,
    isLoading: asterSetupLoading,
    isApproving: asterIsApproving,
    enableTrading: enableAsterTrading,
    checkApiKey: checkAsterApiKey,
    error: asterSetupError,
  } = useAsterSetup()

  // Lighter setup hook
  const {
    hasApiKey: hasLighterApiKey,
    isLoading: lighterSetupLoading,
    checkApiKey: checkLighterApiKey,
    error: lighterSetupError,
  } = useLighterSetup()

  // Pacifica setup hook
  const {
    hasApiKey: hasPacificaApiKey,
    isLoading: pacificaSetupLoading,
    isGenerating: pacificaIsGenerating,
    enableTrading: enablePacificaTrading,
    checkApiKey: checkPacificaApiKey,
    error: pacificaSetupError,
  } = usePacificaSetup()

  // Avantis setup hook
  const {
    hasApiKey: hasAvantisApiKey,
    isLoading: avantisSetupLoading,
    isApproving: avantisIsApproving,
    enableTrading: enableAvantisTrading,
    error: avantisSetupError,
  } = useAvantisSetup()

  const { mode: dexMode } = useDexMode()
  const { startTour, hasCompletedExchangeTour, isRunning } = useTour()
  const { isCompatible, showChainIncompatibilityToast, getExchangeDisplayName } = useChainCompatibility()

  const isAvantis = dexMode === 'avantis'
  const isZfpOrder = isAvantis && orderType === 'Zero Fee'
  const normalizedSymbol = activeSymbol.replace('/USD', '').toUpperCase()
  const zfpSupported = isAvantis && isZfpSupported(normalizedSymbol)

  const leverageConfig = getLeverageConfig(dexMode)
  const effectiveMaxLeverage = isAvantis
    ? getAvantisMaxLeverage(normalizedSymbol, !!isZfpOrder && zfpSupported)
    : leverageConfig.maxLeverage
  const effectiveMinLeverage = isAvantis && isZfpOrder && zfpSupported
    ? getAvantisMinLeverage(normalizedSymbol, true)
    : 1

  const setLeverage = (val: number) => {
    setLeverageRaw(Math.max(effectiveMinLeverage, Math.min(val, effectiveMaxLeverage)))
  }

  useEffect(() => {
    if (isAvantis) {
      setLeverageRaw((prev) => {
        const clamped = Math.max(effectiveMinLeverage, Math.min(prev, effectiveMaxLeverage))
        return clamped
      })
    } else {
      setLeverageRaw((prev) => clampLeverage(prev, dexMode))
    }
  }, [dexMode, effectiveMaxLeverage, effectiveMinLeverage, isAvantis])

  useEffect(() => {
    if (isZfpOrder && zfpSupported) {
      const zfpMin = getAvantisMinLeverage(normalizedSymbol, true)
      const zfpMax = getAvantisMaxLeverage(normalizedSymbol, true)
      setLeverageRaw((prev) => {
        if (prev < zfpMin) return zfpMin
        if (prev > zfpMax) return zfpMax
        return prev
      })
    }
  }, [isZfpOrder, zfpSupported])

  // Check if Hyperliquid has deposited funds
  const hyperliquidBalance = parseFloat(balanceData?.hyperliquid?.withdrawable || '0')

  // console.log('balanceData', balanceData)
  const hasHyperliquidFunds = hyperliquidBalance > 0

  // Check API keys on mount and when dexMode changes
  useEffect(() => {
    if (walletAddress) {
      // Always check all API keys so we have the status ready
      checkHlApiKey()
      checkAsterApiKey()
      checkLighterApiKey()
      checkPacificaApiKey()
    }
  }, [walletAddress, checkHlApiKey, checkAsterApiKey, checkLighterApiKey, checkPacificaApiKey])

  // Determine which setup state to use based on dexMode
  const getActiveSetupState = () => {
    if (dexMode === 'aster') {
      return {
        hasApiKey: hasAsterApiKey,
        isLoading: asterSetupLoading,
        isApproving: asterIsApproving,
        enableTrading: enableAsterTrading,
        setupError: asterSetupError,
        exchangeName: 'Aster',
        requiresImport: false,
        needsDeposit: false,
        depositTooltip: '',
      }
    }
    if (dexMode === 'lighter') {
      return {
        hasApiKey: hasLighterApiKey,
        isLoading: lighterSetupLoading,
        isApproving: false,
        enableTrading: () => setIsLighterImportModalOpen(true),
        setupError: lighterSetupError,
        exchangeName: 'Lighter',
        requiresImport: true,
        needsDeposit: false,
        depositTooltip: '',
      }
    }
    if (dexMode === 'pacifica') {
      return {
        hasApiKey: hasPacificaApiKey,
        isLoading: pacificaSetupLoading,
        isApproving: pacificaIsGenerating,
        enableTrading: enablePacificaTrading,
        setupError: pacificaSetupError,
        exchangeName: 'Pacifica',
        requiresImport: false,
        needsDeposit: false,
        depositTooltip: '',
      }
    }
    if (dexMode === 'avantis') {
      return {
        hasApiKey: hasAvantisApiKey,
        isLoading: avantisSetupLoading,
        isApproving: avantisIsApproving,
        enableTrading: enableAvantisTrading,
        setupError: avantisSetupError,
        exchangeName: 'Avantis',
        requiresImport: false,
        needsDeposit: false,
        depositTooltip: '',
      }
    }
    // Default to Hyperliquid for 'hyperliquid' or 'auto' mode
    // Check if user needs to deposit funds first
    const needsHlDeposit = !hasHyperliquidFunds && !balanceLoading
    return {
      hasApiKey: hasHlApiKey,
      isLoading: hlSetupLoading,
      isApproving: hlIsApproving,
      enableTrading: enableHlTrading,
      setupError: hlSetupError,
      exchangeName: 'Hyperliquid',
      requiresImport: false,
      needsDeposit: needsHlDeposit,
      depositTooltip: 'Deposit funds to Hyperliquid first',
    }
  }

  const activeSetup = getActiveSetupState()

  // Auto-trigger Hyperliquid tour when user needs to deposit
  useEffect(() => {
    if (
      (dexMode === 'hyperliquid' || dexMode === 'auto') &&
      activeSetup.needsDeposit &&
      !hasCompletedExchangeTour('hyperliquid') &&
      !isRunning &&
      walletAddress &&
      !balanceLoading
    ) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        startTour('hyperliquid')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [dexMode, activeSetup.needsDeposit, hasCompletedExchangeTour, isRunning, walletAddress, balanceLoading, startTour])

  const currentPrice = orderbookData?.midPrice
    ? parseFloat(orderbookData.midPrice).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    : '0.00'

  // Polling for routing recommendation
  useEffect(() => {
    let abortController: AbortController | null = null
    let intervalId: NodeJS.Timeout | null = null

    // Clear existing data immediately when mode/dependencies change to show loading state
    setRoutingData(null)
    setIsRoutingLoading(true)

    const fetchRouting = async () => {
      if (!size || parseFloat(size) <= 0) {
        setRoutingData(null)
        setIsRoutingLoading(false)
        return
      }

      // Cancel previous request if it's still running
      if (abortController) {
        abortController.abort()
      }
      abortController = new AbortController()

      try {
        const symbol = activeSymbol.replace('/USD', '')
        const sideStr = side === OrderSide.LONG ? 'BUY' : 'SELL'
        // Pass platform filter when a specific DEX is selected
        const platformFilter = dexMode !== 'auto' ? dexMode : undefined

        const response = await getRoutingRecommendation(
          symbol,
          sideStr,
          abortController.signal,
          platformFilter
        )

        if (response.success && response.data && response.data.routing) {
          setRoutingData(response.data.routing)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Ignore aborts
          return
        }
        console.error('Failed to fetch routing:', error)
      } finally {
        setIsRoutingLoading(false)
      }
    }

    // Initial fetch when dependencies change
    fetchRouting()

    // Set up polling
    if (size && parseFloat(size) > 0) {
      intervalId = setInterval(fetchRouting, 1000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (abortController) abortController.abort()
    }
  }, [size, activeSymbol, side, dexMode])

  const handleOrder = async () => {
    if (!walletAddress || !primaryWallet) {
      toast.error('Please connect your wallet to trade')
      return
    }

    if (orderType === OrderType.LIMIT && !limitPrice) {
      toast.error('Please enter a limit price')
      return
    }

    const priceNum = parseFloat(currentPrice.replace(/,/g, ''))
    if (!priceNum || priceNum <= 0) {
      toast.error('Waiting for price data. Please try again in a moment.')
      return
    }

    // Check chain compatibility when a specific exchange is selected
    if (dexMode !== 'auto' && !isCompatible(dexMode)) {
      showChainIncompatibilityToast(dexMode)
      return
    }

    try {
      // When dexMode is not 'auto', use the selected exchange directly
      const preferredExchange =
        dexMode !== 'auto'
          ? dexMode
          : (routingData?.recommended?.toLowerCase() as
            | 'hyperliquid'
            | 'aster'
            | 'lighter'
            | 'pacifica'
            | 'avantis'
            | undefined)

      // Size input represents the NOTIONAL position value (final position size in USD)
      // tokenAmount = notional / price
      // Required margin = notional / leverage
      const notionalUsd = parseFloat(size)
      const tokenAmount = notionalUsd / priceNum
      const requiredMargin = notionalUsd / leverage

      // Validate user has enough margin
      const availableMarginNum = parseFloat(availableMargin)
      if (requiredMargin > availableMarginNum) {
        toast.error(
          `Insufficient margin. Required: $${requiredMargin.toFixed(
            2
          )}, Available: $${availableMarginNum.toFixed(2)}`
        )
        return
      }

      await executeOpenPosition({
        symbol: activeSymbol.replace('/USD', ''),
        direction: side === OrderSide.LONG ? 'LONG' : 'SHORT',
        size: tokenAmount.toFixed(6),
        leverage: leverage,
        orderType: orderType === 'Zero Fee'
          ? 'MARKET_ZERO_FEE'
          : orderType === OrderType.STOP_LIMIT
            ? 'STOP_LIMIT'
            : orderType === OrderType.MARKET
              ? 'MARKET'
              : 'LIMIT',
        limitPrice: (orderType === OrderType.LIMIT || orderType === OrderType.STOP_LIMIT) ? limitPrice : undefined,
        marketPrice: priceNum.toString(),
        preferredExchange,
      })
      toast.success('Order placed successfully!')
    } catch (e) {
      toast.error('Failed to place order: ' + (e as Error).message)
    }
  }

  // Get available margin based on selected DEX
  const getAvailableMargin = (): string => {
    if (!balanceData) return '0.00'

    // If auto mode or hyperliquid, show hyperliquid balance
    if (dexMode === 'auto' || dexMode === 'hyperliquid') {
      return balanceData.hyperliquid?.withdrawable || '0.00'
    }

    // For Aster, find USDT/USDC balance in Perp account
    if (dexMode === 'aster') {
      // Backend labels perp balances as "USDT (Perp)" or "USDC (Perp)"
      const usdtBalance = balanceData.aster?.find(
        (b) =>
          b.asset === 'USDT (Perp)' ||
          b.asset === 'USDT' ||
          b.asset === 'PERPUSDT'
      )
      const usdcBalance = balanceData.aster?.find(
        (b) => b.asset === 'USDC (Perp)' || b.asset === 'USDC'
      )
      const asterAmount =
        parseFloat(usdtBalance?.maxWithdrawAmount || usdtBalance?.free || '0') +
        parseFloat(usdcBalance?.maxWithdrawAmount || usdcBalance?.free || '0')
      return asterAmount.toFixed(2)
    }

    // For Lighter, use the available balance from the lighter object
    if (dexMode === 'lighter') {
      return balanceData.lighter?.availableBalance || '0.00'
    }

    // For Pacifica, use the available balance from the pacifica object
    if (dexMode === 'pacifica') {
      return balanceData.pacifica?.availableBalance || '0.00'
    }

    // For Avantis, use the available balance (Base USDC)
    if (dexMode === 'avantis') {
      return balanceData.avantis?.availableBalance || '0.00'
    }

    // Default fallback
    return balanceData.hyperliquid?.withdrawable || '0.00'
  }

  const availableMargin = getAvailableMargin()
  const maxPositionSize = parseFloat(availableMargin) * leverage

  // Sync size with sizePercent (when slider changes)
  useEffect(() => {
    if (!isManualSizeUpdate.current && maxPositionSize > 0) {
      if (sizePercent > 0) {
        const calculatedSize = (maxPositionSize * sizePercent) / 100
        setSize(calculatedSize.toFixed(2))
      } else {
        setSize('')
      }
    }
    isManualSizeUpdate.current = false
  }, [sizePercent, maxPositionSize])

  // Sync sizePercent with manual size input
  const handleSizeChange = (value: string) => {
    isManualSizeUpdate.current = true
    setSize(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && maxPositionSize > 0) {
      const percent = (numValue / maxPositionSize) * 100
      setSizePercent(Math.min(100, Math.max(0, Math.round(percent))))
    } else {
      setSizePercent(0)
    }
  }

  return (
    <div id="order-panel" className="w-full bg-bg-panel border border-border rounded-3xl p-3 lg:p-2 overflow-y-auto flex flex-col gap-2 h-full">
      {/* Long/Short Toggle */}
      <div className="flex p-1.5 bg-bg-input rounded-xl">
        <button
          onClick={() => setSide(OrderSide.LONG)}
          className={`flex-1 h-9 rounded-lg text-base font-medium font-geist transition-all ${side === OrderSide.LONG
            ? 'bg-[#2B4942] text-brand-green'
            : 'text-[#5C5C5C] hover:text-white'
            }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide(OrderSide.SHORT)}
          className={`flex-1 h-9 rounded-lg text-base font-medium font-geist transition-all ${side === OrderSide.SHORT
            ? 'bg-[#492B2B] text-brand-red'
            : 'text-[#5C5C5C] hover:text-white'
            }`}
        >
          Short
        </button>
      </div>

      <div className="flex gap-2">
        {(isAvantis
          ? [OrderType.MARKET, OrderType.LIMIT, 'Zero Fee' as const]
          : [OrderType.MARKET, OrderType.LIMIT, OrderType.STOP_LIMIT]
        ).map(
          (type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              disabled={type === 'Zero Fee' && !zfpSupported}
              className={`flex-1 py-2 rounded-lg text-xs font-geist border transition-all
                    ${orderType === type
                  ? 'bg-bg-panel border-brand-gold text-brand-gold'
                  : type === 'Zero Fee' && !zfpSupported
                    ? 'bg-bg-panel border-border-light text-[#333] cursor-not-allowed'
                    : 'bg-bg-panel border-border-light text-[#8E8E8E] hover:text-white'
                }
                `}
            >
              {type}
            </button>
          )
        )}
      </div>

      {/* Form Container */}
      <div className="bg-bg-card rounded-xl px-2 flex flex-col gap-3">
        {/* Asset Header in Form */}
        <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-3">
          <div className="flex flex-col gap-1">
            <span className="text-[#8E8E8E] text-xs font-medium">
              {activeSymbol}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-brand-gold/20 border-[0.3px] border-brand-gold/40 flex items-center justify-center">
                <BitcoinLogo className="w-3 h-3" />
              </div>
              <span className="text-white font-medium text-sm">
                {currentPrice}
              </span>
            </div>
          </div>
        </div>

        {/* Margin Info */}
        <div className="flex flex-col gap-2 bg-white/5 border border-white/5 rounded-2xl p-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[#8E8E8E] text-xs font-medium">
                Available Margin
                <span className="text-[#5C5C5C] ml-1">
                  (
                  {dexMode === 'auto'
                    ? 'Hyperliquid'
                    : dexMode.charAt(0).toUpperCase() + dexMode.slice(1)}
                  )
                </span>
              </span>
              <span className="text-white text-sm font-semibold">
                {balanceLoading ? 'Loading...' : `$${availableMargin}`}
              </span>
            </div>
            <span
              className="text-brand-gold text-xs font-medium cursor-pointer hover:underline"
              onClick={onDepositClick}
            >
              Deposit / Withdraw
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <span className="text-[#5C5C5C] text-xs">
              Max Position @ {leverage}x
            </span>
            <span className="text-[#8E8E8E] text-xs font-medium">
              ${maxPositionSize}
            </span>
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="flex flex-col gap-3 bg-white/5 border border-white/5 rounded-2xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-[#8E8E8E] text-xs font-medium">Leverage</span>
            <span className="text-white text-sm font-semibold">
              {leverage}x
            </span>
          </div>

          {/* Slider Track */}
          <div className="relative w-full h-6 flex items-center">
            <input
              type="range"
              min={effectiveMinLeverage}
              max={effectiveMaxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-2 appearance-none cursor-pointer rounded-full"
              style={{
                background: `linear-gradient(to right, #1e40c6 0%, #1e40c6 ${((leverage - effectiveMinLeverage) / (effectiveMaxLeverage - effectiveMinLeverage)) * 100
                  }%, #1e2544 ${((leverage - effectiveMinLeverage) / (effectiveMaxLeverage - effectiveMinLeverage)) * 100}%, #1e2544 100%)`,
              }}
            />
          </div>

          {/* Preset Leverage Buttons */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {leverageConfig.presets
              .filter((val) => val >= effectiveMinLeverage && val <= effectiveMaxLeverage)
              .map((val) => (
              <button
                key={val}
                onClick={() => setLeverage(val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${leverage === val
                  ? 'bg-brand-gold text-white'
                  : 'bg-white/5 text-[#8E8E8E] hover:bg-white/10 hover:text-white'
                  }`}
              >
                {val}x
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price Input (Only for Limit Orders) */}
        {orderType === OrderType.LIMIT && (
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex items-center justify-between bg-bg-input border border-border rounded-xl px-3 h-10">
              <span className="text-[#5C5C5C] text-xs">Limit Price</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="bg-transparent text-right w-24 text-[#5C5C5C] outline-none text-xs placeholder-[#5C5C5C]"
                />
                <span className="text-white text-xs">USD</span>
              </div>
            </div>
          </div>
        )}

        {/* Size Input */}
        <div className="flex flex-col gap-3 mt-3">
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 h-10">
            <span className="text-[#8E8E8E] text-xs">Choose size</span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="0"
                value={size}
                onChange={(e) => handleSizeChange(e.target.value)}
                className="bg-transparent text-right w-16 text-white outline-none text-xs placeholder-[#8E8E8E]"
              />
              <span className="text-white text-xs">USD</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-[#8E8E8E] text-xs font-medium">Size</span>
              <span className="text-white text-sm font-semibold">
                {sizePercent}%
              </span>
            </div>
            <div className="relative w-full h-6 px-2 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={sizePercent}
                onChange={(e) => setSizePercent(parseInt(e.target.value))}
                className="w-full h-2 appearance-none cursor-pointer rounded-full relative z-20"
                style={{
                  background: `linear-gradient(to right, #1e40c6 0%, #1e40c6 ${sizePercent}%, rgba(255,255,255,0.05) ${sizePercent}%, rgba(255,255,255,0.05) 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Buy Summary */}
        <div className="flex flex-col gap-3 px-2 my-4">
          <div className="flex justify-between items-center">
            <span className="text-[#5C5C5C] text-xs">Buy</span>
            <div className="flex gap-1">
              <span className="text-[#F6F6F6] text-xs">0.0</span>
              <span className="text-[#BCBCBC] text-xs">USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-center gap-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-white/10 rounded border border-white/10 flex items-center justify-center cursor-pointer">
            {/* Checkbox */}
          </div>
          <span className="text-[#909090] text-xs">TP/SL</span>
          <InfoIcon className="w-3 h-3 text-[#5A5957]" />
        </div>

        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-brand-gold/50 cursor-pointer transition-all">
          <div className="w-3.5 h-3.5 bg-[#1e40c6] rounded" />
          <span className="text-[#1e40c6] text-xs">Best Offer</span>
          <InfoIcon className="w-3 h-3 text-[#8E8E8E]" />
        </div>
      </div>

      {/* Routing Recommendation */}
      <div
        className={`transition-all duration-300 ease-in-out ${size && parseFloat(size) > 0
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2 h-0 overflow-hidden'
          }`}
      >
        <RoutingRecommendation
          symbol={activeSymbol}
          side={side === OrderSide.LONG ? 'BUY' : 'SELL'}
          amount={size}
          routingData={routingData}
          loading={isRoutingLoading}
          dexMode={dexMode}
        />
      </div>

      {/* Action Button */}
      {activeSetup.hasApiKey === false ? (
        <div className="relative group w-full">
          <Button
            id="enable-trading-btn"
            onClick={activeSetup.needsDeposit ? onDepositClick : activeSetup.enableTrading}
            disabled={activeSetup.isLoading || activeSetup.isApproving || activeSetup.needsDeposit}
            className={`w-full ${activeSetup.needsDeposit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {activeSetup.isApproving
              ? `Authorizing ${activeSetup.exchangeName}...`
              : activeSetup.isLoading
                ? 'Checking...'
                : activeSetup.needsDeposit
                  ? <><WalletIcon className="w-4 h-4 inline mr-1" /> Deposit to {activeSetup.exchangeName} First</>
                  : <><UnlockIcon className="w-4 h-4 inline mr-1" /> Enable {activeSetup.exchangeName} Trading</>}
          </Button>
          {/* Tooltip for disabled state */}
          {activeSetup.needsDeposit && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1e2544] border border-brand-gold/30 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-brand-gold" />
                <span className="text-center">{activeSetup.depositTooltip}</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-[#1e2544]"></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button
          onClick={handleOrder}
          disabled={
            !walletAddress ||
            !primaryWallet ||
            tradeLoading ||
            activeSetup.hasApiKey === null
          }
          className="w-full h-20 rounded-full"
        >
          {!walletAddress || !primaryWallet
            ? 'Connect Wallet'
            : tradeLoading
              ? 'Placing Order...'
              : activeSetup.hasApiKey === null
                ? 'Checking...'
                : 'Place Order'}
        </Button>
      )}
      {tradeError && (
        <div className="text-brand-red text-xs text-center">{tradeError}</div>
      )}
      {activeSetup.setupError && (
        <div className="text-brand-red text-xs text-center">
          {activeSetup.setupError}
        </div>
      )}

      {/* Lighter Import Modal */}
      <LighterImportModal
        isOpen={isLighterImportModalOpen}
        onClose={() => setIsLighterImportModalOpen(false)}
        onSuccess={() => {
          setIsLighterImportModalOpen(false)
          checkLighterApiKey()
        }}
      />
    </div>
  )
}

export default OrderPanel
