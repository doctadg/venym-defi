export interface FormattedUsdValue {
  formatted: string;
  raw: number;
  isEstimate: boolean;
}

/**
 * Format USD value with appropriate precision and indicators
 */
export function formatUsdValue(
  value: number | string | null | undefined,
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

  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);

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
  value: number | string | null | undefined,
  isEstimate = false
): string {
  return formatUsdValue(value, { compact: true, isEstimate }).formatted;
}

/**
 * Format USD value with full precision for detailed views
 */
export function formatUsdDetailed(
  value: number | string | null | undefined,
  isEstimate = false
): string {
  return formatUsdValue(value, { showCents: true, isEstimate }).formatted;
}