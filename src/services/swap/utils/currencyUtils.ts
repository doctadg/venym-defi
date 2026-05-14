// Conditionally import priceService only on server side
const priceService = typeof window === 'undefined' 
  ? require('@/lib/services/priceService').priceService 
  : null;

import { convertRawAmountToDecimal, parseAssetIdentifier } from './decimalConversion';

// Type definition for Decimal without importing the actual Prisma client
type DecimalLike = {
  toNumber(): number;
};

export interface UsdConversionResult {
  usdValue: number;
  rate: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface FormattedUsdValue {
  formatted: string;
  raw: number;
  isEstimate: boolean;
}

/**
 * Convert a token amount to USD using real-time price data
 */
export async function convertToUsd(
  amount: string | number,
  tokenAddress: string,
  chainId: string
): Promise<UsdConversionResult> {
  // This function only works on the server side
  if (typeof window !== 'undefined' || !priceService) {
    return {
      usdValue: 0,
      rate: 0,
      timestamp: new Date(),
      success: false,
      error: 'Price service not available on client side',
    };
  }

  try {
    // Convert raw amount to decimal format
    const decimalAmount = typeof amount === 'string' 
      ? convertRawAmountToDecimal(amount, chainId, tokenAddress)
      : amount;
    
    if (isNaN(decimalAmount) || decimalAmount <= 0) {
      return {
        usdValue: 0,
        rate: 0,
        timestamp: new Date(),
        success: false,
        error: 'Invalid amount',
      };
    }

    const conversion = await priceService.convertToUsd(
      decimalAmount.toString(),
      tokenAddress,
      chainId
    );

    if (!conversion) {
      return {
        usdValue: 0,
        rate: 0,
        timestamp: new Date(),
        success: false,
        error: 'Price data not available',
      };
    }

    return {
      usdValue: conversion.usdValue,
      rate: conversion.rate,
      timestamp: conversion.timestamp,
      success: true,
    };
  } catch (error) {
    return {
      usdValue: 0,
      rate: 0,
      timestamp: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format USD value with appropriate precision and indicators
 */
export function formatUsdValue(
  value: number | string | DecimalLike | null | undefined,
  options: {
    showCents?: boolean;
    compact?: boolean;
    isEstimate?: boolean;
    prefix?: string;
  } = {}
): FormattedUsdValue {
  const {
    showCents = true,
    compact = false,
    isEstimate = false,
    prefix = '$',
  } = options;

  // Handle null/undefined/invalid values
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return {
      formatted: 'N/A',
      raw: 0,
      isEstimate,
    };
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : 
                   (value && typeof value === 'object' && 'toNumber' in value) ? value.toNumber() : 
                   Number(value);

  if (isNaN(numValue)) {
    return {
      formatted: 'N/A',
      raw: 0,
      isEstimate,
    };
  }

  // Handle very small values
  if (numValue > 0 && numValue < 0.01) {
    return {
      formatted: `<${prefix}0.01`,
      raw: numValue,
      isEstimate,
    };
  }

  // Handle very large values with compact notation
  if (compact && numValue >= 1000000) {
    const millions = numValue / 1000000;
    if (millions >= 1000) {
      const billions = millions / 1000;
      return {
        formatted: `${prefix}${billions.toFixed(1)}B${isEstimate ? '*' : ''}`,
        raw: numValue,
        isEstimate,
      };
    }
    return {
      formatted: `${prefix}${millions.toFixed(1)}M${isEstimate ? '*' : ''}`,
      raw: numValue,
      isEstimate,
    };
  }

  if (compact && numValue >= 1000) {
    const thousands = numValue / 1000;
    return {
      formatted: `${prefix}${thousands.toFixed(1)}K${isEstimate ? '*' : ''}`,
      raw: numValue,
      isEstimate,
    };
  }

  // Standard formatting
  const options_intl: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat('en-US', options_intl).format(numValue);
  
  return {
    formatted: `${formatted}${isEstimate ? '*' : ''}`,
    raw: numValue,
    isEstimate,
  };
}

/**
 * Format USD value as a compact string for display in tight spaces
 */
export function formatUsdCompact(
  value: number | string | DecimalLike | null | undefined,
  isEstimate = false
): string {
  return formatUsdValue(value, { compact: true, isEstimate }).formatted;
}

/**
 * Format USD value with full precision for detailed views
 */
export function formatUsdDetailed(
  value: number | string | DecimalLike | null | undefined,
  isEstimate = false
): string {
  return formatUsdValue(value, { showCents: true, isEstimate }).formatted;
}

/**
 * Calculate percentage change between two USD values
 */
export function calculatePercentageChange(
  oldValue: number | string | DecimalLike,
  newValue: number | string | DecimalLike
): { percentage: number; direction: 'up' | 'down' | 'neutral'; formatted: string } {
  const oldNum = typeof oldValue === 'string' ? parseFloat(oldValue) : 
                 (oldValue && typeof oldValue === 'object' && 'toNumber' in oldValue) ? oldValue.toNumber() : 
                 Number(oldValue);
                 
  const newNum = typeof newValue === 'string' ? parseFloat(newValue) : 
                 (newValue && typeof newValue === 'object' && 'toNumber' in newValue) ? newValue.toNumber() : 
                 Number(newValue);

  if (isNaN(oldNum) || isNaN(newNum) || oldNum === 0) {
    return { percentage: 0, direction: 'neutral', formatted: '0%' };
  }

  const percentage = ((newNum - oldNum) / oldNum) * 100;
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
  const formatted = `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;

  return { percentage, direction, formatted };
}

/**
 * Parse asset string to extract token address and chain ID
 */
export function parseAssetString(asset: string): { tokenAddress: string; chainId: string } | null {
  return parseAssetIdentifier(asset);
}

/**
 * Convert transaction amounts to USD and calculate total volume
 */
export async function calculateTransactionUsdValues(
  fromAsset: string,
  toAsset: string,
  fromAmount: string,
  toAmount: string | null
): Promise<{
  fromAmountUsd: number | null;
  toAmountUsd: number | null;
  totalVolumeUsd: number | null;
  fromTokenUsdRate: number | null;
  toTokenUsdRate: number | null;
  priceTimestamp: Date;
}> {
  // This function only works on the server side
  if (typeof window !== 'undefined' || !priceService) {
    return {
      fromAmountUsd: null,
      toAmountUsd: null,
      totalVolumeUsd: null,
      fromTokenUsdRate: null,
      toTokenUsdRate: null,
      priceTimestamp: new Date(),
    };
  }
  const priceTimestamp = new Date();
  let fromAmountUsd = null;
  let toAmountUsd = null;
  let fromTokenUsdRate = null;
  let toTokenUsdRate = null;

  // Parse asset strings
  const fromAssetInfo = parseAssetString(fromAsset);
  const toAssetInfo = parseAssetString(toAsset);

  // Convert from amount
  if (fromAssetInfo && fromAmount) {
    const fromConversion = await convertToUsd(
      fromAmount,
      fromAssetInfo.tokenAddress,
      fromAssetInfo.chainId
    );
    if (fromConversion.success) {
      fromAmountUsd = fromConversion.usdValue;
      fromTokenUsdRate = fromConversion.rate;
    }
  }

  // Convert to amount
  if (toAssetInfo && toAmount) {
    const toConversion = await convertToUsd(
      toAmount,
      toAssetInfo.tokenAddress,
      toAssetInfo.chainId
    );
    if (toConversion.success) {
      toAmountUsd = toConversion.usdValue;
      toTokenUsdRate = toConversion.rate;
    }
  }

  // Calculate total volume (use the larger of the two values, or the available one)
  const totalVolumeUsd = fromAmountUsd !== null && toAmountUsd !== null
    ? Math.max(fromAmountUsd, toAmountUsd)
    : fromAmountUsd ?? toAmountUsd;

  return {
    fromAmountUsd,
    toAmountUsd,
    totalVolumeUsd,
    fromTokenUsdRate,
    toTokenUsdRate,
    priceTimestamp,
  };
}

/**
 * Validate if a price timestamp is recent enough for reliable calculations
 */
export function isPriceDataFresh(timestamp: Date | string, maxAgeMinutes = 10): boolean {
  const priceTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const ageInMinutes = (now.getTime() - priceTime.getTime()) / (1000 * 60);
  return ageInMinutes <= maxAgeMinutes;
}

/**
 * Format a price staleness indicator
 */
export function formatPriceAge(timestamp: Date | string): string {
  const priceTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const ageInMinutes = Math.floor((now.getTime() - priceTime.getTime()) / (1000 * 60));

  if (ageInMinutes < 1) return 'just now';
  if (ageInMinutes < 60) return `${ageInMinutes}m ago`;
  
  const ageInHours = Math.floor(ageInMinutes / 60);
  if (ageInHours < 24) return `${ageInHours}h ago`;
  
  const ageInDays = Math.floor(ageInHours / 24);
  return `${ageInDays}d ago`;
}

/**
 * Aggregate USD volumes for analytics
 */
export interface VolumeAnalytics {
  totalVolume: number;
  averageTransactionSize: number;
  largestTransaction: number;
  transactionCount: number;
  timeframe: string;
}

export function calculateVolumeAnalytics(
  transactions: Array<{ totalVolumeUsd: number | DecimalLike | null; createdAt: Date }>,
  timeframe: string = 'all'
): VolumeAnalytics {
  const validTransactions = transactions.filter(tx => 
    tx.totalVolumeUsd !== null && tx.totalVolumeUsd !== undefined
  );

  if (validTransactions.length === 0) {
    return {
      totalVolume: 0,
      averageTransactionSize: 0,
      largestTransaction: 0,
      transactionCount: 0,
      timeframe,
    };
  }

  const volumes = validTransactions.map(tx => {
    const volume = tx.totalVolumeUsd;
    return typeof volume === 'string' ? parseFloat(volume) : 
           (volume && typeof volume === 'object' && 'toNumber' in volume) ? volume.toNumber() : 
           Number(volume);
  }).filter(v => !isNaN(v));

  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
  const averageTransactionSize = totalVolume / volumes.length;
  const largestTransaction = Math.max(...volumes);

  return {
    totalVolume,
    averageTransactionSize,
    largestTransaction,
    transactionCount: volumes.length,
    timeframe,
  };
}