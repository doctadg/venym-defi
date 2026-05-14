// Simple Moving Average
export const calculateSMA = (data: number[], period: number): (number | null)[] => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(null);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        sma.push(sum / period);
    }
    return sma;
};

// Exponential Moving Average
export const calculateEMA = (data: number[], period: number): (number | null)[] => {
    const ema = [];
    const k = 2 / (period + 1);

    let sum = 0;
    for (let j = 0; j < period; j++) {
        sum += data[j];
    }
    let prevEma = sum / period;

    for (let i = 0; i < period - 1; i++) {
        ema.push(null);
    }
    ema.push(prevEma);

    for (let i = period; i < data.length; i++) {
        const current = data[i];
        const newEma = current * k + prevEma * (1 - k);
        ema.push(newEma);
        prevEma = newEma;
    }
    return ema;
};

// Relative Strength Index
export const calculateRSI = (data: number[], period: number = 14): (number | null)[] => {
    const rsi = [];
    const gains = [];
    const losses = [];

    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < period; i++) {
        rsi.push(null);
    }

    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    return rsi;
};

// Bollinger Bands
export const calculateBollingerBands = (data: number[], period: number = 20, stdDevMultiplier: number = 2) => {
    const upper = [];
    const lower = [];
    const middle = calculateSMA(data, period);

    for (let i = 0; i < data.length; i++) {
        if (middle[i] === null) {
            upper.push(null);
            lower.push(null);
            continue;
        }

        // Calculate StdDev
        let sumSqDiff = 0;
        for (let j = 0; j < period; j++) {
            const val = data[i - j];
            const diff = val - (middle[i] as number);
            sumSqDiff += diff * diff;
        }
        const stdDev = Math.sqrt(sumSqDiff / period);

        upper.push((middle[i] as number) + stdDev * stdDevMultiplier);
        lower.push((middle[i] as number) - stdDev * stdDevMultiplier);
    }

    return { upper, middle, lower };
};

// MACD
export const calculateMACD = (data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] === null || slowEMA[i] === null) {
            macdLine.push(null);
        } else {
            macdLine.push((fastEMA[i] as number) - (slowEMA[i] as number));
        }
    }

    // Calculate Signal Line (EMA of MACD Line)
    // Filter out nulls for calculation but keep alignment
    const validMacd = macdLine.filter(v => v !== null) as number[];
    const signalLineValid = calculateEMA(validMacd, signalPeriod);

    // Re-align signal line with original data
    const signalLine = [];
    const nullCount = macdLine.length - validMacd.length;
    for (let i = 0; i < nullCount; i++) signalLine.push(null);
    signalLine.push(...signalLineValid);

    const histogram = [];
    for (let i = 0; i < data.length; i++) {
        if (macdLine[i] !== null && signalLine[i] !== null) {
            histogram.push((macdLine[i] as number) - (signalLine[i] as number));
        } else {
            histogram.push(null);
        }
    }

    return { macd: macdLine, signal: signalLine, histogram };
};

// Stochastic Oscillator
export const calculateStochastic = (
    data: { high: number; low: number; close: number }[],
    period: number = 14,
    signalPeriod: number = 3
) => {
    const kLine = [];
    const dLine = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            kLine.push(null);
            continue;
        }

        let highestHigh = -Infinity;
        let lowestLow = Infinity;

        for (let j = 0; j < period; j++) {
            const candle = data[i - j];
            if (candle.high > highestHigh) highestHigh = candle.high;
            if (candle.low < lowestLow) lowestLow = candle.low;
        }

        const currentClose = data[i].close;
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        kLine.push(k);
    }

    // Calculate %D (SMA of %K)
    // Align kLine for SMA calculation
    const validK = kLine.filter(v => v !== null) as number[];
    const dValues = calculateSMA(validK, signalPeriod);

    // Re-align D line
    const nullCount = kLine.length - validK.length;
    for (let i = 0; i < nullCount; i++) dLine.push(null);
    dLine.push(...dValues);

    return { k: kLine, d: dLine };
};
