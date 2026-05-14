'use client'
import React, { useEffect, useState, useMemo } from 'react'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts'
import { fetchPearRatioHistory, type RatioCandle } from '../../services/pearApi'

/** Map interval label → seconds */
const INTERVAL_MAP: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1D': 86400,
}

interface PairRatioChartProps {
    marketId: string
}

export default function PairRatioChart({ marketId }: PairRatioChartProps) {
    const [candles, setCandles] = useState<RatioCandle[]>([])
    const [interval, setInterval_] = useState('1m')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const data = await fetchPearRatioHistory({
                    market: marketId,
                    interval: INTERVAL_MAP[interval] || 300,
                    limit: 300,
                })
                if (!cancelled) setCandles(data)
            } catch (e) {
                console.error('[PairRatioChart] Failed to load:', e)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()

        // Poll every 30s for live updates
        const timer = window.setInterval(load, 30_000)
        return () => {
            cancelled = true
            window.clearInterval(timer)
        }
    }, [marketId, interval])

    const chartData = useMemo(
        () =>
            candles.map((c) => ({
                time: c.t,
                ratio: c.c,
                high: c.h,
                low: c.l,
            })),
        [candles],
    )

    const formatTime = (ts: number) => {
        const d = new Date(ts)
        if (interval === '1D') return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
        return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    }

    // Determine color from first → last
    const isPositive = chartData.length >= 2 && chartData[chartData.length - 1].ratio >= chartData[0].ratio
    const strokeColor = isPositive ? '#22c55e' : '#ef4444'
    const gradientId = `ratio-gradient-${marketId.replace(/[^a-zA-Z0-9]/g, '')}`

    // Compute Y domain with padding
    const yDomain = useMemo(() => {
        if (chartData.length === 0) return [0, 1]
        const vals = chartData.map((d) => d.ratio)
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const pad = (max - min) * 0.1 || max * 0.01
        return [min - pad, max + pad]
    }, [chartData])

    if (loading && candles.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#1e40c6] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#8E8E8E]">Loading ratio history...</span>
                </div>
            </div>
        )
    }

    if (candles.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-[#8E8E8E]">No ratio history available yet</span>
                    <span className="text-xs text-[#555]">Data will appear once the WebSocket starts collecting</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0e1a]">
            {/* Interval selector */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1a1f35]">
                {Object.keys(INTERVAL_MAP).map((key) => (
                    <button
                        key={key}
                        onClick={() => setInterval_(key)}
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${interval === key
                            ? 'bg-[#1e40c6] text-white'
                            : 'text-[#8E8E8E] hover:text-white hover:bg-[#1a1f35]'
                            }`}
                    >
                        {key}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f35" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatTime}
                            tick={{ fill: '#555', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f35' }}
                            tickLine={false}
                            minTickGap={40}
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{ fill: '#555', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f35' }}
                            tickLine={false}
                            tickFormatter={(v: number) => v.toPrecision(4)}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111827',
                                border: '1px solid #1e40c6',
                                borderRadius: '6px',
                                fontSize: '11px',
                            }}
                            labelFormatter={(label) => formatTime(label as number)}
                            formatter={(value?: number | string) => [Number(value ?? 0).toPrecision(6), 'Ratio']}
                        />
                        <Area
                            type="monotone"
                            dataKey="ratio"
                            stroke={strokeColor}
                            strokeWidth={1.5}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
