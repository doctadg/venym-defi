import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useOpenOrders } from '../hooks/useOpenOrders'
import { usePositions } from '../hooks/usePositions'
import { useTrading } from '../hooks/useTrading'
import { PnlShareModal } from './modals/PnlShareModal'

const TabButton = ({
  label,
  count,
  active = false,
  onClick,
}: {
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className={`
    relative py-3 px-1 mr-6 text-xs font-sans font-medium transition-colors
    ${active ? 'text-white' : 'text-[#8E8E8E] hover:text-[#8E8E8E]'}
  `}
  >
    {label} {count !== undefined && `(${count})`}
    {active && (
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[rgba(255,255,255,0.9)] rounded-t-full" />
    )}
  </button>
)

const HeaderCell = ({ label }: { label: string }) => (
  <th className="text-left text-[10px] text-[#5C5C5C] font-normal uppercase py-3 px-4 first:pl-6 last:pr-6 whitespace-nowrap">
    {label}
  </th>
)

interface PositionRowProps {
  data: any
  onClose: (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    exchange: string
  ) => void
  onLimitClose: (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    exchange: string
  ) => void
  onFlip: (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    leverage: number,
    exchange: string
  ) => void
  onShare: (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    leverage: number,
    exchange: string,
    entryPrice: string,
    markPrice: string,
    unrealizedPnlPercent: string,
    unrealizedPnlValue: string
  ) => void
  closing: boolean
  flipping: boolean
}

const PositionRow: React.FC<PositionRowProps> = ({
  data,
  onClose,
  onLimitClose,
  onFlip,
  onShare,
  closing,
  flipping,
}) => {
  const isLong = data.direction === 'LONG'
  const pnlValue = parseFloat(data.unrealizedPnl || '0')
  const entryPrice = parseFloat(data.entryPrice || '0')
  const size = parseFloat(data.size || '0')

  // Calculate position value
  const positionValue = entryPrice * size

  // Calculate PnL percent based on position value (ROI)
  const pnlPercent = positionValue > 0 ? (pnlValue / positionValue) * 100 : 0

  const exchange = data.exchange || 'hyperliquid'
  const direction = data.direction || 'LONG'
  const leverage = data.leverage || 1

  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors group">
      <td className="py-3 px-4 first:pl-6">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${isLong ? 'text-brand-green' : 'text-brand-red'
              }`}
          >
            {data.symbol}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded bg-opacity-20 ${isLong
              ? 'bg-brand-green text-brand-green'
              : 'bg-brand-red text-brand-red'
              }`}
          >
            {data.leverage}X {data.direction}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E] capitalize">
        {exchange}
      </td>
      <td className="py-3 px-4 text-xs text-brand-green">{data.size}</td>
      <td className="py-3 px-4">
        <span className="text-xs text-white">${positionValue.toFixed(2)}</span>
      </td>
      <td className="py-3 px-4 text-xs text-white">
        ${entryPrice.toLocaleString()}
      </td>
      <td className="py-3 px-4 text-xs text-white">{data.markPrice || '-'}</td>
      <td className="py-3 px-4">
        <span
          className={`text-xs ${pnlValue >= 0 ? 'text-brand-green' : 'text-brand-red'
            }`}
        >
          {pnlValue >= 0 ? '+' : ''}
          {pnlValue.toFixed(2)} ({pnlPercent.toFixed(2)}%)
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">
        {data.liquidationPrice || '-'}
      </td>
      <td className="py-3 px-4 text-xs text-white">
        ${(positionValue / (data.leverage || 1)).toFixed(2)}
      </td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">-</td>
      <td className="py-3 px-4">
        <span className="text-xs text-[#8E8E8E]">-/-</span>
      </td>
      <td className="py-3 px-4 last:pr-6">
        <div className="flex items-center gap-3 text-xs text-[#8E8E8E]">
          <button
            onClick={() => onClose(data.symbol, direction, data.size, exchange)}
            disabled={closing || flipping}
            className="hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {closing ? 'Closing...' : 'Market'}
          </button>
          <button
            onClick={() =>
              onLimitClose(data.symbol, direction, data.size, exchange)
            }
            disabled={closing || flipping}
            className="hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limit
          </button>
          <button
            onClick={() =>
              onFlip(data.symbol, direction, data.size, leverage, exchange)
            }
            disabled={closing || flipping}
            className="hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {flipping ? 'Flipping...' : 'Flip'}
          </button>
          <button
            onClick={() =>
              onShare(
                data.symbol,
                direction,
                leverage,
                exchange,
                data.entryPrice,
                data.markPrice,
                pnlPercent.toFixed(2),
                pnlValue.toFixed(2)
              )
            }
            className="hover:text-white transition-colors p-1"
            title="Share PnL"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

const OrderRow: React.FC<{
  data: any
  onCancel: (orderId: string, symbol: string, exchange: string) => void
  cancelling: boolean
}> = ({ data, onCancel, cancelling }) => {
  const isLong = data.side === 'BUY' || data.side === 'Long'

  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors group">
      <td className="py-3 px-4 first:pl-6">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${isLong ? 'text-brand-green' : 'text-brand-red'
              }`}
          >
            {data.symbol}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded bg-opacity-20 ${isLong
              ? 'bg-brand-green text-brand-green'
              : 'bg-brand-red text-brand-red'
              }`}
          >
            {data.type} {data.side}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-white">{data.quantity}</td>
      <td className="py-3 px-4 text-xs text-white">{data.price}</td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">
        {data.filledQuantity || '0'}
      </td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">{data.status}</td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">
        {new Date(data.timestamp).toLocaleString()}
      </td>
      <td className="py-3 px-4 last:pr-6">
        <button
          onClick={() =>
            onCancel(data.orderId, data.symbol, data.exchange || 'hyperliquid')
          }
          disabled={cancelling}
          className="text-xs text-brand-red hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelling ? 'Cancelling...' : 'Cancel'}
        </button>
      </td>
    </tr>
  )
}

// Limit Price Modal
interface LimitModalProps {
  isOpen: boolean
  symbol: string
  direction: 'LONG' | 'SHORT'
  size: string
  currentPrice: string
  onConfirm: (limitPrice: string) => void
  onClose: () => void
  loading: boolean
}

const LimitPriceModal: React.FC<LimitModalProps> = ({
  isOpen,
  symbol,
  direction,
  size,
  currentPrice,
  onConfirm,
  onClose,
  loading,
}) => {
  const [limitPrice, setLimitPrice] = useState(currentPrice)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-[320px] shadow-2xl">
        <h3 className="text-white text-sm font-medium mb-4">
          Limit Close Order
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-[#8E8E8E]">Symbol</span>
            <span className="text-white">{symbol}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8E8E8E]">Direction</span>
            <span
              className={
                direction === 'LONG' ? 'text-brand-green' : 'text-brand-red'
              }
            >
              {direction}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8E8E8E]">Size</span>
            <span className="text-white">{size}</span>
          </div>
          <div className="mt-4">
            <label className="text-[#8E8E8E] text-xs mb-2 block">
              Limit Price
            </label>
            <input
              type="text"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/50"
              placeholder="Enter limit price"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 bg-white/5 text-white rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(limitPrice)}
            disabled={loading || !limitPrice}
            className="flex-1 py-2 bg-white/90 text-white rounded-lg text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PositionsTable = () => {
  const { primaryWallet } = useDynamicContext()
  const walletAddress = primaryWallet?.address || ''
  const { positions, loading: positionsLoading } = usePositions(walletAddress)
  const {
    orders,
    loading: ordersLoading,
    refresh: refreshOrders,
  } = useOpenOrders(walletAddress)
  const {
    executeClosePosition,
    executeLimitClose,
    executeFlipPosition,
    executeCancelOrder,
  } = useTrading()

  const [activeTab, setActiveTab] = useState<'positions' | 'orders'>(
    'positions'
  )
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set())
  const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set())
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())

  // Limit modal state
  const [limitModal, setLimitModal] = useState<{
    isOpen: boolean
    symbol: string
    direction: 'LONG' | 'SHORT'
    size: string
    exchange: string
    currentPrice: string
  }>({
    isOpen: false,
    symbol: '',
    direction: 'LONG',
    size: '',
    exchange: '',
    currentPrice: '',
  })
  const [limitLoading, setLimitLoading] = useState(false)

  // Share Modal state
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean
    data: any
  }>({
    isOpen: false,
    data: null,
  })

  const handleClose = async (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    exchange: string
  ) => {
    if (!walletAddress) return
    const key = `${exchange}-${symbol}`
    setClosingIds((prev) => new Set(prev).add(key))
    try {
      await executeClosePosition(symbol, direction, size, exchange)
    } catch (error) {
      console.error('Failed to close position:', error)
      toast.error(
        'Failed to close position: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setClosingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleLimitClose = (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    exchange: string
  ) => {
    // Find mark price for this position
    const pos = positions.find((p) => p.symbol === symbol)
    const currentPrice = pos?.markPrice || pos?.entryPrice || ''
    setLimitModal({
      isOpen: true,
      symbol,
      direction,
      size,
      exchange,
      currentPrice,
    })
  }

  const handleLimitConfirm = async (limitPrice: string) => {
    setLimitLoading(true)
    try {
      await executeLimitClose(
        limitModal.symbol,
        limitModal.direction,
        limitModal.size,
        limitPrice,
        limitModal.exchange
      )
      setLimitModal({
        isOpen: false,
        symbol: '',
        direction: 'LONG',
        size: '',
        exchange: '',
        currentPrice: '',
      })
      toast.success('Limit close order placed successfully!')
    } catch (error) {
      console.error('Failed to place limit close order:', error)
      toast.error(
        'Failed to place limit close order: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setLimitLoading(false)
    }
  }

  const handleFlip = async (
    symbol: string,
    direction: 'LONG' | 'SHORT',
    size: string,
    leverage: number,
    exchange: string
  ) => {
    if (!walletAddress) return
    const key = `${exchange}-${symbol}`
    setFlippingIds((prev) => new Set(prev).add(key))
    try {
      await executeFlipPosition(symbol, direction, size, leverage, exchange)
      toast.success(
        `Position flipped from ${direction} to ${direction === 'LONG' ? 'SHORT' : 'LONG'
        }!`
      )
    } catch (error) {
      console.error('Failed to flip position:', error)
      toast.error(
        'Failed to flip position: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setFlippingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleCancel = async (
    orderId: string,
    symbol: string,
    exchange: string
  ) => {
    if (!walletAddress) return
    setCancellingIds((prev) => new Set(prev).add(orderId))
    try {
      await executeCancelOrder(exchange, orderId, symbol)
      refreshOrders()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      toast.error(
        'Failed to cancel order: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  return (
    <>
      <div id="positions-table" className="w-full h-full bg-bg-panel border border-border rounded-3xl flex flex-col overflow-hidden">
        {/* Tabs Bar */}
        <div className="flex items-center px-6 border-b border-white/10 overflow-x-auto no-scrollbar">
          <TabButton label="Positions" count={positions.length} active={true} />
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'positions' ? (
            positionsLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs">
                Loading positions...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-bg-panel z-10">
                  <tr>
                    <HeaderCell label="Token" />
                    <HeaderCell label="Exchange" />
                    <HeaderCell label="Size" />
                    <HeaderCell label="Position Value" />
                    <HeaderCell label="Entry Price" />
                    <HeaderCell label="Mark Price" />
                    <HeaderCell label="PnL (ROI%)" />
                    <HeaderCell label="Liq Price" />
                    <HeaderCell label="Margin" />
                    <HeaderCell label="Funding" />
                    <HeaderCell label="TP/SL" />
                    <HeaderCell label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => {
                    const key = `${pos.exchange || 'hyperliquid'}-${pos.symbol}`
                    return (
                      <PositionRow
                        key={idx}
                        data={pos}
                        onClose={handleClose}
                        onLimitClose={handleLimitClose}
                        onFlip={handleFlip}
                        onShare={(symbol, direction, leverage, exchange, entryPrice, markPrice, unrealizedPnlPercent, unrealizedPnlValue) => {
                          setShareModal({
                            isOpen: true,
                            data: { symbol, direction, leverage, exchange, entryPrice, markPrice, unrealizedPnlPercent, unrealizedPnlValue }
                          })
                        }}
                        closing={closingIds.has(key)}
                        flipping={flippingIds.has(key)}
                      />
                    )
                  })}
                  {positions.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-8 text-[#5C5C5C] text-xs"
                      >
                        No open positions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          ) : ordersLoading ? (
            <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs">
              Loading orders...
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-bg-panel z-10">
                <tr>
                  <HeaderCell label="Symbol" />
                  <HeaderCell label="Size" />
                  <HeaderCell label="Price" />
                  <HeaderCell label="Filled" />
                  <HeaderCell label="Status" />
                  <HeaderCell label="Time" />
                  <HeaderCell label="Action" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <OrderRow
                    key={idx}
                    data={order}
                    onCancel={handleCancel}
                    cancelling={cancellingIds.has(order.orderId)}
                  />
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-[#5C5C5C] text-xs"
                    >
                      No open orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Limit Price Modal */}
      <LimitPriceModal
        isOpen={limitModal.isOpen}
        symbol={limitModal.symbol}
        direction={limitModal.direction}
        size={limitModal.size}
        currentPrice={limitModal.currentPrice}
        onConfirm={handleLimitConfirm}
        onClose={() =>
          setLimitModal({
            isOpen: false,
            symbol: '',
            direction: 'LONG',
            size: '',
            exchange: '',
            currentPrice: '',
          })
        }
        loading={limitLoading}
      />

      <PnlShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, data: null })}
        data={shareModal.data}
      />
    </>
  )
}

export default PositionsTable
