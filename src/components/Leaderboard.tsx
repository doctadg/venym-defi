import React from 'react'
import { ChevronDown } from './Icons'

const LeaderboardRow = ({ rank, trader, value, pnl, roi, volume }: any) => (
  <div className="grid grid-cols-6 px-6 py-6 border-b border-[#252525] hover:bg-[#252525] cursor-pointer transition-colors text-sm">
    <span className="text-white">{rank}</span>
    <span className="text-white font-medium">{trader}</span>
    <span className="text-white">{value}</span>
    <span className="text-brand-green">{pnl}</span>
    <span className="text-brand-green">{roi}</span>
    <span className="text-white">{volume}</span>
  </div>
)

const Leaderboard = () => {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [metric, setMetric] = React.useState('points')

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/leaderboard?metric=${metric}&limit=50`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (Array.isArray(json)) {
          setData(json)
        } else {
          setData([])
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [metric])

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-6 max-w-[1440px] mx-auto gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-white">Leaderboard</h1>
          <p className="text-[#8E8E8E] text-sm">
            Track your points epoch, referral rewards, and see where your rank
            on the leaderboard - all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#292929] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#dee3f1] text-xs text-[#BBBBBB]">
          7 days <ChevronDown className="w-3 h-3" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl flex flex-col overflow-hidden mt-2">
        <div className="grid grid-cols-6 px-6 py-4 border-b border-[#252525] bg-[#1e2544]">
          {['RANK', 'TRADER', 'POINTS', 'PNL', 'ROI', 'VOLUME'].map((h) => (
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
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-[#8E8E8E]">
              No data available
            </div>
          ) : (
            data.map((item, i) => (
              <LeaderboardRow
                key={i}
                rank={item.rank}
                trader={
                  item.walletAddress
                    ? `${item.walletAddress.slice(
                        0,
                        6
                      )}...${item.walletAddress.slice(-4)}`
                    : 'Unknown'
                }
                value={item.points?.toLocaleString() || '0'}
                pnl={`$${item.totalPnl?.toLocaleString() || '0'}`}
                roi={`${item.roi?.toFixed(2) || '0'}%`}
                volume={`$${item.totalVolume?.toLocaleString() || '0'}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
