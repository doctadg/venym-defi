'use client'

import { useState, useEffect } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useHyperliquidSetup } from '../../hooks/useHyperliquidSetup'
import { useAsterSetup } from '../../hooks/useAsterSetup'
import { useLighterSetup } from '../../hooks/useLighterSetup'
import { usePacificaSetup } from '../../hooks/usePacificaSetup'
import { useAvantisSetup } from '../../hooks/useAvantisSetup'
import { useBalances } from '../../hooks/useBalances'
import LighterImportModal from '../modals/LighterImportModal'
import toast from 'react-hot-toast'

interface ExchangeRow {
  id: string
  name: string
  hasApiKey: boolean | null
  isLoading: boolean
  isActivating: boolean
  error: string | null
  address: string
  totalEquity: string
  availableBalance: string
  enableTrading: () => Promise<boolean | void>
  requiresImport?: boolean
}

const ExchangeSettingsSection = () => {
  const { primaryWallet } = useDynamicContext()
  const walletAddress = primaryWallet?.address || ''
  const [isLighterImportModalOpen, setIsLighterImportModalOpen] = useState(false)

  // Setup hooks
  const hlSetup = useHyperliquidSetup()
  const asterSetup = useAsterSetup()
  const lighterSetup = useLighterSetup()
  const pacificaSetup = usePacificaSetup()
  const avantisSetup = useAvantisSetup()

  // Balance data
  const { balanceData, loading: balanceLoading } = useBalances(walletAddress)

  // Check all API keys on mount
  useEffect(() => {
    if (walletAddress) {
      hlSetup.checkApiKey()
      asterSetup.checkApiKey()
      lighterSetup.checkApiKey()
      pacificaSetup.checkApiKey()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  const handleConnect = async (exchange: ExchangeRow) => {
    if (exchange.requiresImport) {
      setIsLighterImportModalOpen(true)
      return
    }

    const result = await exchange.enableTrading()
    if (result === true) {
      toast.success(`${exchange.name} connected successfully!`)
    }
  }

  // Build exchange rows
  const exchanges: ExchangeRow[] = [
    {
      id: 'hyperliquid',
      name: 'Hyperliquid',
      hasApiKey: hlSetup.hasApiKey,
      isLoading: hlSetup.isLoading,
      isActivating: hlSetup.isApproving,
      error: hlSetup.error,
      address: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '--',
      totalEquity: balanceData?.hyperliquid?.accountValue
        ? `$${parseFloat(balanceData.hyperliquid.accountValue).toFixed(2)}`
        : '--',
      availableBalance: balanceData?.hyperliquid?.withdrawable
        ? `$${parseFloat(balanceData.hyperliquid.withdrawable).toFixed(2)}`
        : '--',
      enableTrading: hlSetup.enableTrading,
    },
    {
      id: 'lighter',
      name: 'Lighter',
      hasApiKey: lighterSetup.hasApiKey,
      isLoading: lighterSetup.isLoading,
      isActivating: lighterSetup.isImporting,
      error: lighterSetup.error,
      address: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '--',
      totalEquity: balanceData?.lighter?.totalAssetValue
        ? `$${parseFloat(balanceData.lighter.totalAssetValue).toFixed(2)}`
        : '--',
      availableBalance: balanceData?.lighter?.availableBalance
        ? `$${parseFloat(balanceData.lighter.availableBalance).toFixed(2)}`
        : '--',
      enableTrading: async () => { setIsLighterImportModalOpen(true) },
      requiresImport: true,
    },
    {
      id: 'aster',
      name: 'Aster',
      hasApiKey: asterSetup.hasApiKey,
      isLoading: asterSetup.isLoading,
      isActivating: asterSetup.isApproving,
      error: asterSetup.error,
      address: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '--',
      totalEquity: '--',
      availableBalance: (() => {
        if (!balanceData?.aster) return '--'
        const usdtBalance = balanceData.aster.find(
          (b) => b.asset === 'USDT (Perp)' || b.asset === 'USDT' || b.asset === 'PERPUSDT'
        )
        const usdcBalance = balanceData.aster.find(
          (b) => b.asset === 'USDC (Perp)' || b.asset === 'USDC'
        )
        const total =
          parseFloat(usdtBalance?.maxWithdrawAmount || usdtBalance?.free || '0') +
          parseFloat(usdcBalance?.maxWithdrawAmount || usdcBalance?.free || '0')
        return total > 0 ? `$${total.toFixed(2)}` : '--'
      })(),
      enableTrading: asterSetup.enableTrading,
    },
    {
      id: 'pacifica',
      name: 'Pacifica',
      hasApiKey: pacificaSetup.hasApiKey,
      isLoading: pacificaSetup.isLoading,
      isActivating: pacificaSetup.isGenerating,
      error: pacificaSetup.error,
      address: pacificaSetup.tradingAddress
        ? `${pacificaSetup.tradingAddress.slice(0, 6)}...${pacificaSetup.tradingAddress.slice(-4)}`
        : '--',
      totalEquity: balanceData?.pacifica?.accountValue
        ? `$${parseFloat(balanceData.pacifica.accountValue).toFixed(2)}`
        : '--',
      availableBalance: balanceData?.pacifica?.availableBalance
        ? `$${parseFloat(balanceData.pacifica.availableBalance).toFixed(2)}`
        : '--',
      enableTrading: pacificaSetup.enableTrading,
    },
    {
      id: 'avantis',
      name: 'Avantis',
      hasApiKey: avantisSetup.hasApiKey,
      isLoading: avantisSetup.isLoading,
      isActivating: avantisSetup.isApproving,
      error: avantisSetup.error,
      address: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '--',
      totalEquity: '--',
      availableBalance: balanceData?.avantis?.availableBalance
        ? `$${parseFloat(balanceData.avantis.availableBalance).toFixed(2)}`
        : '--',
      enableTrading: avantisSetup.enableTrading,
    },
  ]

  return (
    <div className="w-full">
      {/* Section Header */}
      <h2 className="text-white text-lg font-semibold font-sans mb-4">Exchanges</h2>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-[#8E8E8E] text-xs font-medium font-sans py-3 pr-4 pl-2">Exchange</th>
              <th className="text-[#8E8E8E] text-xs font-medium font-sans py-3 px-4">Address</th>
              <th className="text-[#8E8E8E] text-xs font-medium font-sans py-3 px-4">Total Equity</th>
              <th className="text-[#8E8E8E] text-xs font-medium font-sans py-3 px-4">Available Balance</th>
              <th className="text-[#8E8E8E] text-xs font-medium font-sans py-3 pl-4 pr-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {exchanges.map((exchange) => (
              <tr
                key={exchange.id}
                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Exchange Name */}
                <td className="py-3.5 pr-4 pl-2">
                  <span className="text-white text-sm font-medium font-sans">{exchange.name}</span>
                </td>

                {/* Address */}
                <td className="py-3.5 px-4">
                  <span className="text-[#8E8E8E] text-sm font-mono">{exchange.address}</span>
                </td>

                {/* Total Equity */}
                <td className="py-3.5 px-4">
                  <span className="text-[#8E8E8E] text-sm font-sans">
                    {balanceLoading ? '...' : exchange.totalEquity}
                  </span>
                </td>

                {/* Available Balance */}
                <td className="py-3.5 px-4">
                  <span className="text-[#8E8E8E] text-sm font-sans">
                    {balanceLoading ? '...' : exchange.availableBalance}
                  </span>
                </td>

                {/* Action */}
                <td className="py-3.5 pl-4 pr-2 text-right">
                  {exchange.isLoading ? (
                    <span className="text-[#8E8E8E] text-xs">Checking...</span>
                  ) : exchange.hasApiKey ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#8E8E8E] text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(exchange)}
                      disabled={exchange.isActivating}
                      className="px-4 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs font-medium
                        hover:bg-white/15 hover:border-white/20 active:scale-[0.97] transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exchange.isActivating ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                  {exchange.error && (
                    <p className="text-brand-red text-[10px] mt-1 max-w-[160px] ml-auto">{exchange.error}</p>
                  )}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr>
              <td className="py-3.5 pr-4 pl-2">
                <span className="text-white text-sm font-semibold font-sans">Total</span>
              </td>
              <td className="py-3.5 px-4"></td>
              <td className="py-3.5 px-4">
                <span className="text-[#8E8E8E] text-sm font-sans">--</span>
              </td>
              <td className="py-3.5 px-4">
                <span className="text-[#8E8E8E] text-sm font-sans">--</span>
              </td>
              <td className="py-3.5 pl-4 pr-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Lighter Import Modal */}
      <LighterImportModal
        isOpen={isLighterImportModalOpen}
        onClose={() => setIsLighterImportModalOpen(false)}
        onSuccess={() => {
          setIsLighterImportModalOpen(false)
          lighterSetup.checkApiKey()
          toast.success('Lighter connected successfully!')
        }}
      />
    </div>
  )
}

export default ExchangeSettingsSection
