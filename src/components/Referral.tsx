import React from 'react'

const ReferralRow = ({ epoch, status, period, points }: any) => (
  <div className="grid grid-cols-4 px-8 py-8 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] cursor-pointer transition-colors text-sm items-center">
    <span className="text-white">{epoch}</span>
    <div>
      <span
        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
          status === 'Active'
            ? 'bg-[#153430] text-[#56C0A6]'
            : 'bg-[#1a1a1a] text-[#8E8E8E]'
        }`}
      >
        {status}
      </span>
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-white">{period.start}</span>
      <span className="text-[#8E8E8E]">{period.end}</span>
    </div>
    <span className="text-white">{points}</span>
  </div>
)

import { useDynamicContext } from '@dynamic-labs/sdk-react-core'

const Referral = () => {
  const { primaryWallet } = useDynamicContext()
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      if (!primaryWallet?.address) return
      try {
        const res = await fetch(
          `/api/leaderboard/points/history?userId=${primaryWallet.address}`
        )
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error('Failed to fetch points history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [primaryWallet?.address])

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-6 max-w-[1440px] mx-auto gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium text-white">Points History</h1>
        <p className="text-[#8E8E8E] text-sm">
          Track your points epoch, referral rewards, and see where your rank on
          the leaderboard - all in one place.
        </p>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl flex flex-col overflow-hidden mt-4">
        <div className="grid grid-cols-4 px-8 py-5 border-b border-[#1a1a1a] bg-[#121212]">
          {['REASON', 'POINTS', 'TIMESTAMP'].map((h) => (
            <span
              key={h}
              className="text-[10px] text-[#666] font-medium tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="p-8 text-center text-[#8E8E8E]">Loading...</div>
          ) : (
            data.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-4 px-8 py-8 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] cursor-pointer transition-colors text-sm items-center"
              >
                <span className="text-white">{item.reason}</span>
                <span className="text-brand-green">+{item.points}</span>
                <span className="text-[#8E8E8E]">
                  {new Date(Number(item.timestamp)).toLocaleString()}
                </span>
              </div>
            ))
          )}
          {!loading && data.length === 0 && (
            <div className="p-8 text-center text-[#8E8E8E]">
              No points history found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Referral
