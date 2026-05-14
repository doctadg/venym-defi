import { getAuthToken, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useEffect, useMemo, useState } from 'react'
import { useBalances } from '../hooks/useBalances'
import { useHistory } from '../hooks/useHistory'
import { useOpenOrders } from '../hooks/useOpenOrders'
import { usePositions } from '../hooks/usePositions'
import { fetchTelegramLinkCode } from '../services/api'
import { Order, Position, Trade } from '../types'
import { ChartLineUpIcon, ChevronDown } from './Icons'
import TelegramConnectModal from './TelegramConnectModal'

const StatCard = ({
  label,
  value,
  subAction,
}: {
  label: string
  value: string
  subAction?: string
}) => (
  <div className="bg-bg-card border border-border rounded-2xl p-6 flex flex-col justify-between h-[140px] relative overflow-hidden group">
    <div className="flex justify-between items-start">
      <span className="text-[#8E8E8E] text-sm">{label}</span>
      {subAction && (
        <button className="text-[10px] text-[#8E8E8E] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
          {subAction}
        </button>
      )}
    </div>
    <span className="text-3xl font-sans font-medium text-white tracking-tight">
      {value}
    </span>
  </div>
)

const TabButton = ({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className={`pb-3 text-sm font-medium relative ${
      active ? 'text-white' : 'text-[#666] hover:text-[#888]'
    }`}
  >
    {label}
    {active && (
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[rgba(255,255,255,0.9)] rounded-t-full" />
    )}
  </button>
)

const PositionRow = ({ data }: { data: Position }) => {
  const isLong = data.direction === 'LONG'
  const pnlValue = parseFloat(data.unrealizedPnl)

  return (
    <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/30 transition-colors group">
      <td className="py-3 px-4 first:pl-6">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${
              isLong ? 'text-brand-green' : 'text-brand-red'
            }`}
          >
            {data.symbol}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded bg-opacity-20 ${
              isLong
                ? 'bg-brand-green text-brand-green'
                : 'bg-brand-red text-brand-red'
            }`}
          >
            {data.leverage}X {data.direction}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-brand-green">{data.size}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white">
            ${parseFloat(data.margin).toFixed(2)}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-white">{data.entryPrice}</td>
      <td className="py-3 px-4 text-xs text-white">{data.markPrice}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${
              pnlValue > 0 ? 'text-brand-green' : 'text-brand-red'
            }`}
          >
            {pnlValue > 0 ? '+' : ''}
            {data.unrealizedPnl} ({data.unrealizedPnlPercent}%)
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-[#8E8E8E]">
        {data.liquidationPrice}
      </td>
      <td className="py-3 px-4 text-xs text-white">{data.collateral}</td>
      <td className="py-3 px-4 text-xs text-brand-red">-</td>
    </tr>
  )
}

const OrderRow = ({ data }: { data: Order }) => (
  <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/30 transition-colors group">
    <td className="py-3 px-4 first:pl-6 text-xs text-white">
      {new Date(data.timestamp).toLocaleString()}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.symbol}</td>
    <td
      className={`py-3 px-4 text-xs ${
        String(data.side).toUpperCase() === 'BUY' ||
        String(data.side).toUpperCase() === 'LONG'
          ? 'text-brand-green'
          : 'text-brand-red'
      }`}
    >
      {data.side}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.type}</td>
    <td className="py-3 px-4 text-xs text-white">{data.price}</td>
    <td className="py-3 px-4 text-xs text-white">{data.quantity}</td>
    <td className="py-3 px-4 text-xs text-white">
      {data.filledQuantity || '0'}
    </td>
    <td className="py-3 px-4 text-xs text-[#8E8E8E]">{data.status}</td>
  </tr>
)

const TradeRow = ({ data }: { data: Trade }) => (
  <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/30 transition-colors group">
    <td className="py-3 px-4 first:pl-6 text-xs text-white">
      {new Date(data.timestamp).toLocaleString()}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.symbol}</td>
    <td
      className={`py-3 px-4 text-xs ${
        String(data.side).toUpperCase() === 'BUY' ||
        String(data.side).toUpperCase() === 'LONG'
          ? 'text-brand-green'
          : 'text-brand-red'
      }`}
    >
      {data.side}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.price}</td>
    <td className="py-3 px-4 text-xs text-white">{data.size}</td>
    <td className="py-3 px-4 text-xs text-white">{data.exchange}</td>
  </tr>
)

const FundingRow = ({ data }: { data: any }) => (
  <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/30 transition-colors group">
    <td className="py-3 px-4 first:pl-6 text-xs text-white">
      {new Date(data.timestamp).toLocaleString()}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.symbol}</td>
    <td
      className={`py-3 px-4 text-xs ${
        parseFloat(data.amount) >= 0 ? 'text-brand-green' : 'text-brand-red'
      }`}
    >
      {parseFloat(data.amount).toFixed(4)}
    </td>
    <td className="py-3 px-4 text-xs text-white">{data.rate}</td>
    <td className="py-3 px-4 text-xs text-white">{data.markPrice}</td>
  </tr>
)

const Portfolio = () => {
  const { primaryWallet } = useDynamicContext()
  const walletAddress = primaryWallet?.address || ''
  const [activeTab, setActiveTab] = useState('positions')
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)

  const fetchTelegramCode = async () => {
    setTelegramLoading(true)
    const token = getAuthToken()
    if (walletAddress && token) {
      const response = await fetchTelegramLinkCode(walletAddress, token, token)
      if (response.success && response?.code) {
        setLinkCode(response.code)
      }
    }
    setTelegramLoading(false)
  }

  useEffect(() => {
    if (walletAddress) {
      fetchTelegramCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // Fetch balances
  const { balanceData, loading: balanceLoading } = useBalances(walletAddress)
  const { positions, loading: positionsLoading } = usePositions(walletAddress)
  const { orders: openOrders, loading: ordersLoading } = useOpenOrders(
    walletAddress,
    'hyperliquid'
  ) // Default to HL for now
  const {
    orders: historyOrders,
    trades,
    funding,
    loading: historyLoading,
  } = useHistory('hyperliquid', walletAddress)

  // Calculate Total Equity
  const totalEquity = useMemo(() => {
    if (!balanceData) return '0.00'

    let total = 0

    // Server Wallet
    if (balanceData.serverWallet) {
      // Assuming ETH price is roughly needed or we just show USDC value?
      // For now let's just add USDC. Ideally we need ETH price.
      // But let's just add what we have.
      total += parseFloat(balanceData.serverWallet.usdc || '0')
    }

    // Hyperliquid
    if (balanceData.hyperliquid) {
      total += parseFloat(balanceData.hyperliquid.accountValue || '0')
    }

    // Aster
    if (balanceData.aster) {
      const asterTotal = balanceData.aster.reduce(
        (acc, b) => acc + parseFloat(b.total),
        0
      )
      total += asterTotal
    }

    return total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }, [balanceData])

  const displayBalance = balanceData?.hyperliquid?.withdrawable
    ? parseFloat(balanceData.hyperliquid.withdrawable).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : '$0.00'

  const renderTableContent = () => {
    if (activeTab === 'positions') {
      return (
        <>
          <div className="grid grid-cols-9 gap-2 px-6 py-3  bg-[#121212]">
            {[
              'Token',
              'Side',
              'Size',
              'Entry Price',
              'Mark Price',
              'PnL (ROI%)',
              'Liq Price',
              'Margin',
              'Funding',
            ].map((h) => (
              <span key={h} className="text-[10px] text-[#5C5C5C] uppercase">
                {h}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {positionsLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-12">
                Loading positions...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {positions.map((pos, idx) => (
                    <PositionRow key={idx} data={pos} />
                  ))}
                  {positions.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-[#5C5C5C] text-xs"
                      >
                        No Open Positions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )
    }

    if (activeTab === 'openOrders') {
      return (
        <>
          <div className="grid grid-cols-8 gap-2 px-6 py-3  bg-[#121212]">
            {[
              'Time',
              'Symbol',
              'Side',
              'Type',
              'Price',
              'Qty',
              'Filled',
              'Status',
            ].map((h) => (
              <span key={h} className="text-[10px] text-[#5C5C5C] uppercase">
                {h}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {ordersLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-12">
                Loading orders...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {openOrders.map((order, idx) => (
                    <OrderRow key={idx} data={order} />
                  ))}
                  {openOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-[#5C5C5C] text-xs"
                      >
                        No Open Orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )
    }

    if (activeTab === 'orderHistory') {
      return (
        <>
          <div className="grid grid-cols-8 gap-2 px-6 py-3  bg-[#121212]">
            {[
              'Time',
              'Symbol',
              'Side',
              'Type',
              'Price',
              'Qty',
              'Filled',
              'Status',
            ].map((h) => (
              <span key={h} className="text-[10px] text-[#5C5C5C] uppercase">
                {h}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-12">
                Loading history...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {historyOrders.map((order, idx) => (
                    <OrderRow key={idx} data={order} />
                  ))}
                  {historyOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-[#5C5C5C] text-xs"
                      >
                        No Order History.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )
    }

    if (activeTab === 'tradeHistory') {
      return (
        <>
          <div className="grid grid-cols-6 gap-2 px-6 py-3  bg-[#121212]">
            {['Time', 'Symbol', 'Side', 'Price', 'Size', 'Exchange'].map(
              (h) => (
                <span key={h} className="text-[10px] text-[#5C5C5C] uppercase">
                  {h}
                </span>
              )
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-12">
                Loading trades...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {trades.map((trade, idx) => (
                    <TradeRow key={idx} data={trade} />
                  ))}
                  {trades.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-[#5C5C5C] text-xs"
                      >
                        No Trade History.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )
    }

    if (activeTab === 'fundingHistory') {
      return (
        <>
          <div className="grid grid-cols-5 gap-2 px-6 py-3  bg-[#121212]">
            {['Time', 'Symbol', 'Amount', 'Rate', 'Mark Price'].map((h) => (
              <span key={h} className="text-[10px] text-[#5C5C5C] uppercase">
                {h}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full text-[#8E8E8E] text-xs py-12">
                Loading funding...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {funding.map((item, idx) => (
                    <FundingRow key={idx} data={item} />
                  ))}
                  {funding.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-[#5C5C5C] text-xs"
                      >
                        No Funding History.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-6 max-w-[1440px] mx-auto gap-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-white">Portfolio</h1>
          <p className="text-[#8E8E8E] text-sm">
            Track your perps, spot & vault performance in a single dashboard.
          </p>
        </div>
        <button
          onClick={() => setIsTelegramModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#121212] hover:bg-[#1a1a1a] text-white text-sm font-medium rounded-lg border border-[#1a1a1a] transition-all group"
        >
          <img src="/telegram_logo.png" alt="Telegram" className="w-5 h-5" />
          <span>Link Telegram</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Equity" value={totalEquity} />
        <StatCard label="Available Margin" value={displayBalance} />
        <StatCard
          label="Unrealized PnL"
          value={positions
            .reduce((acc, p) => acc + parseFloat(p.unrealizedPnl), 0)
            .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        />
        <StatCard
          label="Active Positions"
          value={positions.length.toString()}
          subAction="View All"
        />
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Side Stats */}
        {/* Wallet Balances */}
        <div className="hidden lg:flex flex-col bg-bg-card border border-border rounded-2xl p-4 h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-[#8E8E8E]">Wallet Balances</span>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {balanceLoading ? (
              <div className="text-xs text-[#666]">Loading balances...</div>
            ) : balanceData ? (
              <>
                {/* Server Wallet */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[#8E8E8E]">
                    Server Wallet (Arbitrum)
                  </span>
                  <div className="flex justify-between items-center text-xs group hover:bg-[#1a1a1a]/30 p-2 rounded-lg transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-medium">ETH</span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-white font-medium">
                        {parseFloat(balanceData.serverWallet.eth).toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs group hover:bg-[#1a1a1a]/30 p-2 rounded-lg transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-medium">USDC</span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-white font-medium">
                        {parseFloat(
                          balanceData.serverWallet.usdc
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hyperliquid */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-xs font-semibold text-[#8E8E8E]">
                    Hyperliquid
                  </span>
                  <div className="flex justify-between items-center text-xs group hover:bg-[#1a1a1a]/30 p-2 rounded-lg transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-medium">USDC</span>
                      <span className="text-[10px] text-[#666]">
                        Withdrawable
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-white font-medium">
                        {parseFloat(
                          balanceData.hyperliquid.withdrawable
                        ).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#666]">
                        Val: $
                        {parseFloat(
                          balanceData.hyperliquid.accountValue
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aster */}
                {balanceData.aster && balanceData.aster.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs font-semibold text-[#8E8E8E]">
                      Aster
                    </span>
                    {balanceData.aster.map((balance, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-xs group hover:bg-[#1a1a1a]/30 p-2 rounded-lg transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white font-medium">
                            {balance.asset}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <span className="text-white font-medium">
                            {parseFloat(balance.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-[#666]">No balances found</div>
            )}
          </div>
        </div>

        {/* Main Chart */}
        <div className="lg:col-span-3 bg-bg-card border border-border rounded-2xl p-6 h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-8 border-b border-[#1a1a1a] w-full">
              <TabButton label="Account Equity" active />
              <TabButton label="PnL" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#fff] bg-[#121212] px-3 py-1.5 rounded-lg cursor-pointer ml-4 whitespace-nowrap">
              30 Days <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] rounded-xl gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartLineUpIcon className="w-5 h-5 text-brand-red" />
            </div>
            <span className="text-[#666] text-sm">No Chart Data</span>
          </div>
        </div>
      </div>

      {/* Bottom Table Section */}
      <div className="flex-1 bg-bg-card border border-border rounded-2xl flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between px-6 py-4 ">
          <div className="flex gap-6">
            <TabButton
              label="Positions"
              active={activeTab === 'positions'}
              onClick={() => setActiveTab('positions')}
            />
            <TabButton
              label="Open Orders"
              active={activeTab === 'openOrders'}
              onClick={() => setActiveTab('openOrders')}
            />
            <TabButton
              label="Order History"
              active={activeTab === 'orderHistory'}
              onClick={() => setActiveTab('orderHistory')}
            />
            <TabButton
              label="Trade History"
              active={activeTab === 'tradeHistory'}
              onClick={() => setActiveTab('tradeHistory')}
            />
            <TabButton
              label="Funding History"
              active={activeTab === 'fundingHistory'}
              onClick={() => setActiveTab('fundingHistory')}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-[#fff] bg-[#121212] px-3 py-1.5 rounded-lg cursor-pointer">
            30 Days <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        {renderTableContent()}
      </div>

      <TelegramConnectModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        code={linkCode}
        loading={telegramLoading}
      />
    </div>
  )
}

export default Portfolio
