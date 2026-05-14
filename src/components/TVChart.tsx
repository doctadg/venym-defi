'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTicker } from '../hooks/useTicker'
import { TVDatafeed } from '../lib/tvDatafeed'
import PriceHeader from './PriceHeader'

interface TVChartProps {
  activeSymbol: string
  onSymbolChange?: (symbol: string) => void
  interval?: string
  timeframe?: string
  theme?: 'Light' | 'Dark'
  leverage?: number
  onSymbolClick?: () => void
  tickerModalOpen?: boolean
  tickerModal?: React.ReactNode
  hideSelector?: boolean
}

const RESOLUTION_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '12h': '720',
  '1d': 'D',
  '1w': 'W',
}

const TVChart: React.FC<TVChartProps> = ({
  activeSymbol,
  onSymbolChange,
  interval = '15m',
  timeframe = '1D',
  theme = 'Dark',
  leverage,
  onSymbolClick,
  tickerModalOpen,
  tickerModal,
  hideSelector,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const activeSymbolRef = useRef(activeSymbol)
  const [currentCandle, setCurrentCandle] = useState<
    | {
      open: number
      high: number
      low: number
      close: number
      change?: number
      changePercent?: number
    }
    | undefined
  >(undefined)

  const { data: tickerData } = useTicker(activeSymbol, 5000)

  useEffect(() => {
    activeSymbolRef.current = activeSymbol
  }, [activeSymbol])

  useEffect(() => {
    // Dynamically load the TradingView advanced library
    const script = document.createElement('script')
    script.src =
      '/tview_charting_advanced/charting_library/charting_library.standalone.js'
    script.async = true
    script.onload = () => {
      initWidget()
    }
    document.head.appendChild(script)

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {
          console.warn('Error removing widget:', e)
        }
        widgetRef.current = null
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Re-init or update widget when props change
  useEffect(() => {
    if ((window as any).TradingView && chartContainerRef.current) {
      // If widget exists, update symbol or interval
      if (widgetRef.current) {
        try {
          const chart = widgetRef.current.activeChart()
          const tvInterval = RESOLUTION_MAP[interval] || '1'

          if (activeSymbol !== chart.symbol()) {
            chart.setSymbol(activeSymbol)
          }
          if (tvInterval !== chart.resolution()) {
            chart.setResolution(tvInterval, () => { })
          }

          try {
            if (typeof chart.setTimeFrame === 'function') {
              chart.setTimeFrame(timeframe)
            } else if (typeof chart.setTimeframe === 'function') {
              chart.setTimeframe(timeframe)
            }
          } catch {
            // Optional API; ignore if unavailable.
          }
        } catch (e) {
          console.error('Error updating chart', e)
        }
      } else {
        initWidget()
      }
    }
  }, [activeSymbol, interval, timeframe, theme])

  const initWidget = () => {
    if (!(window as any).TradingView || !chartContainerRef.current) return

    if (widgetRef.current) {
      // Already initialized
      return
    }

    const datafeed = new TVDatafeed()

    // Map our interval to TV resolution
    const tvInterval = RESOLUTION_MAP[interval] || '1'

    const widgetOptions: any = {
      symbol: activeSymbol,
      datafeed: datafeed,
      interval: tvInterval,
      container: chartContainerRef.current,
      library_path: '/tview_charting_advanced/charting_library/',
      locale: 'en',
      disabled_features: [
        'use_localstorage_for_settings',
        'volume_force_overlay',
        'create_volume_indicator_by_default',
        'header_symbol_search', // Hide symbol search/selector in TradingView header
        'header_compare', // Hide compare symbol button in TradingView header
        'study_templates', // Hide indicator templates button
        'header_saveload', // Hide save/load buttons
        'header_settings', // Hide settings button
        'header_screenshot', // Hide screenshot/capture button
      ],
      enabled_features: [
        'header_widget',
        'timeframes_toolbar',
        'header_resolutions',
      ],
      charts_storage_url: 'https://saveload.tradingview.com',
      charts_storage_api_version: '1.1',
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      fullscreen: false,
      autosize: true,
      theme,
      overrides: {
        // Pane backgrounds
        'paneProperties.background': '#121212',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.backgroundGradientStartColor': '#121212',
        'paneProperties.backgroundGradientEndColor': '#121212',

        // Grid lines
        'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.05)',
        'paneProperties.vertGridProperties.style': 0,
        'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.05)',
        'paneProperties.horzGridProperties.style': 0,

        // Scales (price and time axis)
        'scalesProperties.backgroundColor': '#121212',
        'scalesProperties.textColor': '#8E8E8E',
        'scalesProperties.lineColor': 'rgba(255,255,255,0.1)',

        // Candles
        'mainSeriesProperties.candleStyle.upColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.downColor': '#FF6468',
        'mainSeriesProperties.candleStyle.drawWick': true,
        'mainSeriesProperties.candleStyle.wickUpColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.wickDownColor': '#FF6468',
        'mainSeriesProperties.candleStyle.borderUpColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.borderDownColor': '#FF6468',

        // Volume
        'mainSeriesProperties.volumePaneSize': 'medium',

        // Crosshair
        'paneProperties.crossHairProperties.color': '#8E8E8E',
        'paneProperties.crossHairProperties.style': 2,

        // Legend
        'paneProperties.legendProperties.showSeriesTitle': true,
        'paneProperties.legendProperties.showSeriesOHLC': true,
      },
      loading_screen: {
        backgroundColor: '#121212',
        foregroundColor: 'rgba(255,255,255,0.9)',
      },
      custom_css_url:
        '/tview_charting_advanced/charting_library/custom-theme.css',
      timeframe,
      timeframes: [
        { text: '1m', resolution: '1', title: '1 Minute' },
        { text: '5m', resolution: '5', title: '5 Minutes' },
        { text: '15m', resolution: '15', title: '15 Minutes' },
        { text: '30m', resolution: '30', title: '30 Minutes' },
        { text: '1h', resolution: '60', title: '1 Hour' },
        { text: '4h', resolution: '240', title: '4 Hours' },
        { text: '12h', resolution: '720', title: '12 Hours' },
        { text: 'D', resolution: 'D', title: '1 Day' },
        { text: 'W', resolution: 'W', title: '1 Week' },
      ],
    }

    const widget = new (window as any).TradingView.widget(widgetOptions)
    widgetRef.current = widget

    widget.onChartReady(() => {
      console.log('Chart has loaded!')

      const chart = widget.activeChart()

      // Force apply our custom theme colors after TradingView's default theme loads
      widget.applyOverrides({
        'paneProperties.background': '#121212',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.backgroundGradientStartColor': '#121212',
        'paneProperties.backgroundGradientEndColor': '#121212',
        'paneProperties.vertGridProperties.color': '#1a1a1a',
        'paneProperties.horzGridProperties.color': '#1a1a1a',
        'scalesProperties.backgroundColor': '#121212',
        'scalesProperties.textColor': '#8E8E8E',
        'scalesProperties.lineColor': 'rgba(255,255,255,0.1)',
        'mainSeriesProperties.candleStyle.upColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.downColor': '#FF6468',
        'mainSeriesProperties.candleStyle.wickUpColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.wickDownColor': '#FF6468',
        'mainSeriesProperties.candleStyle.borderUpColor': '#56C0A6',
        'mainSeriesProperties.candleStyle.borderDownColor': '#FF6468',
      })

      // Subscribe to symbol changes
      chart.onSymbolChanged().subscribe(null, (obj: any) => {
        const newSymbol = obj.name
        if (
          newSymbol &&
          newSymbol !== activeSymbolRef.current &&
          onSymbolChange
        ) {
          onSymbolChange(newSymbol)
        }
      })

      // Function to update current candle data
      const updateCurrentCandle = () => {
        try {
          const mainSeries = chart.getSeries()
          if (!mainSeries) return

          // Use safer API calls that don't depend on timeScale
          const barsCount = mainSeries.bars ? mainSeries.bars().size() : 0
          if (barsCount > 0) {
            const lastBarIndex = barsCount - 1
            const bar = mainSeries.barAt ? mainSeries.barAt(lastBarIndex) : null

            if (bar && typeof bar.close === 'number') {
              // Get previous bar for open price
              const prevBar =
                lastBarIndex > 0 && mainSeries.barAt
                  ? mainSeries.barAt(lastBarIndex - 1)
                  : null
              const open =
                prevBar && typeof prevBar.close === 'number'
                  ? prevBar.close
                  : bar.open
              const change = bar.close - open
              const changePercent = open !== 0 ? (change / open) * 100 : 0

              setCurrentCandle({
                open: open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                change: change,
                changePercent: changePercent,
              })
            }
          }
        } catch (e) {
          // Silently handle errors - TradingView API might vary
          console.debug('Error updating current candle:', e)
        }
      }

      // Subscribe to crosshair updates
      chart.crossHairMoved().subscribe(null, updateCurrentCandle)

      // Use interval to update candle data periodically
      const updateInterval = setInterval(updateCurrentCandle, 1000)

      // Initial update
      setTimeout(updateCurrentCandle, 1000)

      // Cleanup interval on unmount (handled by widget.remove())
    })
  }

  return (
    <div
      id="trading-chart"
      ref={chartWrapperRef}
      className="w-full h-full flex flex-col rounded-lg overflow-hidden border border-white/10 bg-[#121212] relative"
    >
      <PriceHeader
        symbol={activeSymbol}
        tickerData={tickerData || null}
        currentCandle={currentCandle}
        leverage={leverage}
        onSymbolClick={onSymbolClick}
        hideSelector={hideSelector}
      />
      <div
        id="tv_chart_container"
        ref={chartContainerRef}
        className="flex-1 w-full"
      />
      {tickerModal}
    </div>
  )
}

export default TVChart
