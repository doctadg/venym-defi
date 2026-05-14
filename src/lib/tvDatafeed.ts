import { fetchCandles, subscribeToCandles, Subscription } from '../services/api';

// Types for TradingView Datafeed API (simplified)
interface SymbolInfo {
    name: string;
    ticker: string;
    description: string;
    type: string;
    session: string;
    timezone: string;
    exchange: string;
    minmov: number;
    pricescale: number;
    has_intraday: boolean;
    has_no_volume: boolean;
    has_weekly_and_monthly: boolean;
    supported_resolutions: string[];
    volume_precision: number;
    data_status: string;
}

interface Bar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const RESOLUTION_MAP: Record<string, string> = {
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '240': '4h',
    '720': '12h',
    'D': '1d',
    '1D': '1d',
    'W': '1w',
    '1W': '1w'
};

const REVERSE_RESOLUTION_MAP: Record<string, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '12h': '720',
    '1d': 'D',
    '1w': 'W'
};

export class TVDatafeed {
    private subscriptions: Map<string, Subscription> = new Map();
    private lastBarTimeBySubscriber: Map<string, number> = new Map();
    private lastBarBySubscriber: Map<string, Bar> = new Map();

    private normalizeTimestampToMs(ts: number): number {
        // Heuristic:
        // seconds epoch is ~1e9-1e10
        // ms epoch is ~1e12-1e13
        // us epoch is ~1e15-1e16
        if (ts > 1e14) return Math.floor(ts / 1000); // us to ms
        if (ts < 1e11) return ts * 1000; // s to ms
        return ts;
    }

    private intervalMsFromResolution(appResolution: string): number | null {
        const match = /^(\d+)([mhdw])$/.exec(appResolution);
        if (!match) return null;
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        if (!Number.isFinite(amount) || amount <= 0) return null;

        switch (unit) {
            case 'm':
                return amount * 60_000;
            case 'h':
                return amount * 60 * 60_000;
            case 'd':
                return amount * 24 * 60 * 60_000;
            case 'w':
                return amount * 7 * 24 * 60 * 60_000;
            default:
                return null;
        }
    }

    private alignTimeToResolution(tsMs: number, appResolution: string): number {
        const intervalMs = this.intervalMsFromResolution(appResolution);
        if (!intervalMs) return tsMs;
        return Math.floor(tsMs / intervalMs) * intervalMs;
    }

    /**
     * Fill gaps in bar data by forward-filling the previous candle's close price.
     * This creates flat candles (open=high=low=close=prevClose, volume=0) for missing periods,
     * making the chart look continuous instead of having floating disconnected candles.
     */
    private fillGaps(bars: Bar[], appResolution: string): Bar[] {
        if (bars.length < 2) return bars;

        const intervalMs = this.intervalMsFromResolution(appResolution);
        if (!intervalMs) return bars;

        // Cap the maximum number of synthetic bars to insert per gap
        // to avoid blowing up memory for very sparse data
        const MAX_FILL_PER_GAP = 120;

        const filled: Bar[] = [];

        for (let i = 0; i < bars.length; i++) {
            if (i === 0) {
                filled.push(bars[i]);
                continue;
            }

            const prevBar = bars[i - 1];
            const currBar = bars[i];
            const gap = currBar.time - prevBar.time;

            // If there's a gap larger than the expected interval, fill it
            if (gap > intervalMs) {
                const missingPeriods = Math.floor(gap / intervalMs) - 1;
                const periodsToFill = Math.min(missingPeriods, MAX_FILL_PER_GAP);

                for (let j = 1; j <= periodsToFill; j++) {
                    const syntheticTime = prevBar.time + (j * intervalMs);
                    // Don't insert if it would overlap with the current bar
                    if (syntheticTime >= currBar.time) break;

                    filled.push({
                        time: syntheticTime,
                        open: prevBar.close,
                        high: prevBar.close,
                        low: prevBar.close,
                        close: prevBar.close,
                        volume: 0,
                    });
                }
            }

            filled.push(currBar);
        }

        return filled;
    }

    getServerTime(callback: (time: number) => void) {
        // Fetch server time from health endpoint
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/health`)
            .then(res => res.json())
            .then(json => {
                if (json.timestamp) {
                    const serverTime = Math.floor(new Date(json.timestamp).getTime() / 1000);
                    callback(serverTime);
                } else {
                    callback(Math.floor(Date.now() / 1000));
                }
            })
            .catch(() => {
                callback(Math.floor(Date.now() / 1000));
            });
    }

    onReady(callback: (config: any) => void) {
        setTimeout(() => {
            callback({
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '720', 'D', 'W'],
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true,
            });
        }, 0);
    }

    resolveSymbol(
        symbolName: string,
        onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
        onResolveErrorCallback: (reason: string) => void
    ) {
        // Symbol comes in as "BTC/USD" or similar.
        // We can just use it directly or strip /USD if needed by backend, 
        // but our api.ts handles normalization.

        const symbolInfo: SymbolInfo = {
            name: symbolName,
            ticker: symbolName,
            description: symbolName,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: '',
            minmov: 1,
            pricescale: 100, // Adjust based on symbol if needed (e.g. 100 for 2 decimals, 10000 for 4)
            has_intraday: true,
            has_no_volume: false,
            has_weekly_and_monthly: true,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '720', 'D', 'W'],
            volume_precision: 2,
            data_status: 'streaming',
        };

        setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    }

    async getBars(
        symbolInfo: SymbolInfo,
        resolution: string,
        periodParams: any,
        onHistoryCallback: (bars: any[], meta: any) => void,
        onErrorCallback: (error: string) => void
    ) {
        const { from, to, firstDataRequest } = periodParams;

        try {
            const appResolution = RESOLUTION_MAP[resolution] || '1h';
            // Request maximum available history from backend
            const limit = 10000;

            const candles = await fetchCandles(symbolInfo.ticker, appResolution, limit);

            if (!candles || candles.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = candles.map(c => {
                const open = parseFloat(c.o);
                const high = parseFloat(c.h);
                const low = parseFloat(c.l);
                const close = parseFloat(c.c);
                const volume = parseFloat(c.v);

                // Sanitize OHLC: ensure high >= max(open, close), low <= min(open, close)
                const sanitizedHigh = Math.max(high, open, close);
                const sanitizedLow = Math.min(low, open, close);

                return {
                    time: this.alignTimeToResolution(this.normalizeTimestampToMs(c.t), appResolution),
                    open,
                    high: sanitizedHigh,
                    low: sanitizedLow,
                    close,
                    volume,
                };
            })
                .filter(bar => {
                    // Filter out degenerate bars (all-zero or NaN prices)
                    if (isNaN(bar.open) || isNaN(bar.close) || isNaN(bar.high) || isNaN(bar.low)) return false;
                    if (bar.open <= 0 && bar.close <= 0 && bar.high <= 0 && bar.low <= 0) return false;
                    return true;
                })
                .sort((a, b) => a.time - b.time);

            // De-duplicate bars with the same timestamp (keep the last one as it's most up-to-date)
            const deduped: Bar[] = [];
            for (const bar of bars) {
                if (deduped.length > 0 && deduped[deduped.length - 1].time === bar.time) {
                    deduped[deduped.length - 1] = bar;
                } else {
                    deduped.push(bar);
                }
            }

            // Fill gaps between candles with flat bars carrying forward the previous close
            const filledBars = this.fillGaps(deduped, appResolution);

            // For first data request, return all available bars
            // For subsequent requests (scrolling left), filter by range
            let filteredBars = filledBars;
            if (!firstDataRequest) {
                filteredBars = filledBars.filter(bar => bar.time >= from * 1000 && bar.time <= to * 1000);
            }

            if (filteredBars.length === 0) {
                // No more data available for this range
                onHistoryCallback([], { noData: true });
                return;
            }

            onHistoryCallback(filteredBars, { noData: false });
        } catch (error) {
            console.error('[TVDatafeed] getBars error:', error);
            onErrorCallback(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    subscribeBars(
        symbolInfo: SymbolInfo,
        resolution: string,
        onRealtimeCallback: (bar: any) => void,
        subscriberUID: string,
        onResetCacheNeededCallback: () => void
    ) {
        const appResolution = RESOLUTION_MAP[resolution] || '1h';
        const intervalMs = this.intervalMsFromResolution(appResolution);

        const subscription = subscribeToCandles(symbolInfo.ticker, appResolution, (data) => {
            const rawTime = this.normalizeTimestampToMs(data.t);
            const time = this.alignTimeToResolution(rawTime, appResolution);

            // console.debug(`[TVDatafeed] Realtime update: ${symbolInfo.ticker} ${appResolution} raw=${rawTime} aligned=${time}`);

            const previousTime = this.lastBarTimeBySubscriber.get(subscriberUID);
            if (previousTime !== undefined && time < previousTime) {
                // TradingView will throw "time violation" if bars go backwards.
                // This can happen if the backend emits candle updates using non-aligned timestamps.
                console.warn('[TVDatafeed] Dropping out-of-order realtime bar', {
                    symbol: symbolInfo.ticker,
                    resolution,
                    previousTime,
                    time
                });
                return;
            }

            const open = parseFloat(data.o);
            const high = parseFloat(data.h);
            const low = parseFloat(data.l);
            const close = parseFloat(data.c);
            const volume = parseFloat(data.v);

            // Reject degenerate candles (all-zero or NaN prices)
            if (isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) {
                console.warn('[TVDatafeed] Dropping NaN realtime bar', data);
                return;
            }
            if (open <= 0 && close <= 0 && high <= 0 && low <= 0) {
                console.warn('[TVDatafeed] Dropping zero-price realtime bar', data);
                return;
            }

            // Sanitize OHLC: ensure high >= max(open, close), low <= min(open, close)
            const sanitizedHigh = Math.max(high, open, close);
            const sanitizedLow = Math.min(low, open, close);

            // Fill gaps in realtime: if the new bar is more than 1 interval away from the last,
            // emit synthetic flat bars in between to keep the chart continuous
            if (previousTime !== undefined && intervalMs && time > previousTime + intervalMs) {
                const lastBar = this.lastBarBySubscriber.get(subscriberUID);
                const fillPrice = lastBar ? lastBar.close : open;
                const gapPeriods = Math.floor((time - previousTime) / intervalMs) - 1;
                const maxFill = Math.min(gapPeriods, 60); // Cap at 60 synthetic bars per realtime gap

                for (let j = 1; j <= maxFill; j++) {
                    const syntheticTime = previousTime + (j * intervalMs);
                    if (syntheticTime >= time) break;

                    const syntheticBar: Bar = {
                        time: syntheticTime,
                        open: fillPrice,
                        high: fillPrice,
                        low: fillPrice,
                        close: fillPrice,
                        volume: 0,
                    };
                    this.lastBarTimeBySubscriber.set(subscriberUID, syntheticTime);
                    onRealtimeCallback(syntheticBar);
                }
            }

            this.lastBarTimeBySubscriber.set(subscriberUID, time);

            const bar: Bar = {
                time,
                open,
                high: sanitizedHigh,
                low: sanitizedLow,
                close,
                volume: isNaN(volume) ? 0 : volume,
            };
            this.lastBarBySubscriber.set(subscriberUID, bar);
            onRealtimeCallback(bar);
        });

        this.subscriptions.set(subscriberUID, subscription);
    }

    unsubscribeBars(subscriberUID: string) {
        const subscription = this.subscriptions.get(subscriberUID);
        if (subscription) {
            subscription.close();
            this.subscriptions.delete(subscriberUID);
        }
        this.lastBarTimeBySubscriber.delete(subscriberUID);
        this.lastBarBySubscriber.delete(subscriberUID);
    }
}
