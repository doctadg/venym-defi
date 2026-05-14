import React, { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas-pro'
import { QRCodeCanvas } from 'qrcode.react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useUserContext } from '../../contexts/UserContext'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface PnlShareModalProps {
    isOpen: boolean
    onClose: () => void
    data: {
        symbol: string
        exchange: string
        direction: 'LONG' | 'SHORT'
        leverage: number
        entryPrice: string
        markPrice: string
        unrealizedPnlPercent: string
        unrealizedPnlValue: string
    } | null
}

export const PnlShareModal: React.FC<PnlShareModalProps> = ({ isOpen, onClose, data }) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const { user } = useUserContext()
    const { primaryWallet } = useDynamicContext()
    const [referralCode, setReferralCode] = useState<string>('MH0P7MVEKXWFF8HJ')
    const [downloading, setDownloading] = useState(false)

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://app.tide.ag')

    useEffect(() => {
        const fetchReferralCode = async () => {
            if (!primaryWallet?.address) return
            try {
                const res = await fetch(`/api/leaderboard/referral/my-code?userId=${primaryWallet.address}`)
                if (res.ok) {
                    const json = await res.json()
                    const code = json.stats?.code || json.code
                    if (code) {
                        setReferralCode(code)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch referral code', e)
            }
        }
        fetchReferralCode()
    }, [primaryWallet?.address])

    if (!isOpen || !data) return null

    const pnlPercentValue = parseFloat(data.unrealizedPnlPercent)
    const pnlDisplay = `${pnlPercentValue >= 0 ? '+' : ''}${pnlPercentValue.toFixed(2)}%`
    const isPositive = pnlPercentValue >= 0

    const performanceColor = isPositive ? '#ccff00' : '#ef4444'

    const referralLink = `${APP_URL}/?r=${referralCode}`
    const usernameDisplay = user?.username ? `@${user.username}` : '@username'
    const exchangeDisplay = data.exchange.charAt(0).toUpperCase() + data.exchange.slice(1)

    const formatPrice = (price: string) => {
        const p = parseFloat(price)
        return isNaN(p) ? price : p.toLocaleString(undefined, { maximumFractionDigits: 6 })
    }

    const handleDownload = async () => {
        if (!cardRef.current) return
        setDownloading(true)
        try {
            const el = cardRef.current

            // Load background image
            const bgImg = new Image()
            bgImg.crossOrigin = 'anonymous'
            bgImg.src = '/pnlbg.jpeg'
            await new Promise<void>((resolve, reject) => {
                bgImg.onload = () => resolve()
                bgImg.onerror = () => reject(new Error('Failed to load background image'))
            })

            // Capture the preview card with transparent background
            const overlay = await html2canvas(el, {
                scale: 2,
                backgroundColor: 'transparent',
                useCORS: true,
            })

            // Composite: bg image first, then text overlay on top
            const finalCanvas = document.createElement('canvas')
            finalCanvas.width = overlay.width
            finalCanvas.height = overlay.height
            const ctx = finalCanvas.getContext('2d')!
            ctx.drawImage(bgImg, 0, 0, finalCanvas.width, finalCanvas.height)
            ctx.drawImage(overlay, 0, 0)

            const image = finalCanvas.toDataURL('image/jpeg', 0.92)
            const link = document.createElement('a')
            link.href = image
            link.download = `Venym-PnL-${data.symbol}-${Date.now()}.jpg`
            link.click()
        } catch (err) {
            console.error('Download failed', err)
            toast.error('Failed to generate image.')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
            <div className="relative max-w-4xl w-full flex flex-col items-center gap-6">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-8 h-8" />
                </button>

                <div className="rounded-2xl w-full max-w-[900px] shadow-2xl relative">
                    <div
                        ref={cardRef}
                        className="w-full rounded-2xl overflow-hidden relative"
                        style={{
                            aspectRatio: '2560 / 1664',
                            backgroundImage: 'url(/pnlbg.jpeg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="relative z-10 flex flex-col h-full p-[5%] justify-between">
                            {/* Top Row */}
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: '1.5em', fontWeight: 700, color: '#e4e4e7' }}>Venym</span>
                                <span className="text-white text-2xl sm:text-3xl font-medium tracking-wide">
                                    {usernameDisplay}
                                </span>
                            </div>

                            {/* Bottom Content */}
                            <div className="flex justify-between items-end">
                                {/* Left Side */}
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-tight">
                                            {data.symbol}
                                        </h2>
                                        <p className="text-[#9ca3af] text-sm sm:text-base mt-0.5">
                                            Best rates matched on <span className="text-[#d1d5db] font-medium ml-1">{exchangeDisplay}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-base sm:text-lg font-medium" style={{ color: performanceColor }}>
                                            {data.direction === 'LONG' ? 'Long' : 'Short'} {data.leverage}x
                                        </p>
                                        <div className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter" style={{ color: performanceColor, lineHeight: 1.1 }}>
                                            {pnlDisplay}
                                        </div>
                                    </div>

                                    <div className="flex gap-8 mt-1">
                                        <div>
                                            <p className="text-[#6b7280] text-xs sm:text-sm uppercase tracking-widest font-medium">Entry Price</p>
                                            <p className="text-white text-xl sm:text-2xl font-semibold">{formatPrice(data.entryPrice)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[#6b7280] text-xs sm:text-sm uppercase tracking-widest font-medium">Mark Price</p>
                                            <p className="text-white text-xl sm:text-2xl font-semibold">{formatPrice(data.markPrice)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-white text-lg sm:text-xl leading-snug">
                                            Trade {data.symbol.replace(/USDT$/, '')} perps on
                                            <br />
                                            <span className="font-bold text-xl sm:text-2xl">https://app.tide.ag</span>
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-white text-base sm:text-lg font-medium mb-1">
                                            Use my referral code:
                                        </p>
                                        <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest bg-white/10 text-[#d1d5db] py-2 px-5 rounded-lg border border-white/20 inline-block">
                                            {referralCode}
                                        </div>
                                    </div>

                                    <div className="bg-white p-2 rounded-xl shadow-2xl">
                                        <QRCodeCanvas
                                            value={referralLink}
                                            size={120}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="bg-white/90 hover:bg-white text-white font-bold text-lg py-4 px-12 rounded-full transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    {downloading ? 'Capturing...' : 'Download Image'}
                </button>
            </div>
        </div>
    )
}
