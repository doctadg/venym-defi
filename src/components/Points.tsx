import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import React from 'react'
import { CheckIcon } from './Icons'

const Points = () => {
  const { primaryWallet } = useDynamicContext()
  const [referralStats, setReferralStats] = React.useState<any>(null)
  const [pointsHistory, setPointsHistory] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      if (!primaryWallet?.address) {
        setLoading(false)
        return
      }

      try {
        // Fetch referral code (don't auto-generate)
        const [codeRes, historyRes] = await Promise.all([
          fetch(
            `/api/leaderboard/referral/my-code?userId=${primaryWallet.address}`
          ),
          fetch(
            `/api/leaderboard/points/history?userId=${primaryWallet.address}`
          ),
        ])

        if (codeRes.ok) {
          const codeJson = await codeRes.json()
          if (codeJson && !codeJson.error && codeJson.code) {
            setReferralStats(codeJson.stats || codeJson)
          } else {
            setReferralStats(null)
          }
        }

        if (historyRes.ok) {
          const historyJson = await historyRes.json()
          if (Array.isArray(historyJson)) setPointsHistory(historyJson)
        }
      } catch (error) {
        console.error('Failed to fetch points data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [primaryWallet?.address])

  const totalPoints = pointsHistory.reduce(
    (acc, item) => acc + (item.points || 0),
    0
  )
  const referralLink = referralStats?.code
    ? `https://app.tide.ag/?r=${referralStats.code}`
    : null

  const handleGenerateCode = async () => {
    if (!primaryWallet?.address) return
    setLoading(true)
    try {
      const res = await fetch('/api/leaderboard/referral/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: primaryWallet.address }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Refetch stats
        const statsRes = await fetch(
          `/api/leaderboard/referral/my-code?userId=${primaryWallet.address}`
        )
        const statsData = await statsRes.json()
        setReferralStats(statsData.stats || statsData)
      } else {
        console.error('Failed to generate code:', data.error)
      }
    } catch (error) {
      console.error('Failed to generate code:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-6 max-w-[1440px] mx-auto gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium text-white">Points</h1>
        <p className="text-[#8E8E8E] text-sm">
          Track your points epoch, referral rewards, and see where your rank on
          the leaderboard - all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Rank Card */}
        <div className="bg-bg-card border border-border rounded-2xl p-8 flex flex-col h-[360px]">
          <h2 className="text-[#A56843] text-2xl font-medium mb-8">Bronze</h2>

          <div className="mt-auto">
            <div className="flex justify-between text-sm text-[#8E8E8E] mb-2">
              <span>Next League - Silver</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-4">
              <div className="h-full w-[33%] bg-[#2F5AF5]" />
            </div>
            <p className="text-[#8E8E8E] text-sm">
              Invite friends with your referral link and earn up to 15% of their
              trading points.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-4 mt-8 pt-6 border-t border-[#1a1a1a]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#666]">Users referred</span>
              <span className="text-white text-sm">
                {referralStats?.usageCount || 0}
              </span>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[10px] text-[#666]">
                Referral trading volume
              </span>
              <span className="text-white text-sm">$0.00</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#666]">League</span>
              <span className="text-white text-sm">Bronze</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#666]">Referral earnings</span>
              <span className="text-white text-sm">0 pts</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-[10px] text-[#666]">Points</span>
              <span className="text-white text-sm">
                {totalPoints.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <span className="text-[#8E8E8E] text-sm">Your Referral Link</span>
          {referralLink ? (
            <>
              <div className="bg-[#161616] border border-[#1a1a1a] rounded-lg px-4 py-3 text-white text-sm truncate">
                {referralLink}
              </div>
              <div>
                <button
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${copied
                    ? 'bg-[#56C0A6] text-white'
                    : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  onClick={handleCopy}
                >
                  {copied ? <><CheckIcon className="w-3 h-3 inline" /> Copied!</> : 'Copy Link'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[#8E8E8E] text-sm">
                You haven't generated your referral code yet.
              </p>
              <button
                onClick={handleGenerateCode}
                disabled={loading || !primaryWallet?.address}
                className="w-fit bg-white/90 text-black px-6 py-2 text-white rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          )}
          <p className="text-[#666] text-xs">
            Share this link with friends. When they sign up and trade, you'll
            earn points!
          </p>
        </div>
      </div>
    </div>
  )
}

export default Points
