import { formatUnits } from 'viem';

// Common token decimals mapping
const TOKEN_DECIMALS: Record<string, number> = {
  // Ethereum tokens
  'ETH': 18,
  'WETH': 18,
  'USDT': 6,
  'USDC': 6,
  'DAI': 18,
  'WBTC': 8,
  'BTC': 8,
  
  // Solana tokens (typically 9 decimals)
  'SOL': 9,
  'WSOL': 9,
  
  // Binance tokens
  'BNB': 18,
  'WBNB': 18,
  
  // Default for most EVM tokens
  'DEFAULT': 18
};

// Get decimals for a token symbol
export function getTokenDecimals(tokenSymbol: string): number {
  if (!tokenSymbol) return 18;
  
  const upperSymbol = tokenSymbol.toUpperCase();
  return TOKEN_DECIMALS[upperSymbol] || TOKEN_DECIMALS.DEFAULT;
}

// Format token amount for display
export function formatTokenAmount(
  amount: string | number,
  tokenSymbol: string,
  options?: {
    maxDecimals?: number;
    minDecimals?: number;
  }
): string {
  if (!amount || amount === '0') return '0';
  
  try {
    const amountStr = amount.toString();
    let num: number;
    
    // Detect if this is a Wei amount (very large number, typically > 1000000)
    // or already a decimal amount
    const parsed = parseFloat(amountStr);
    
    if (amountStr.length > 10 && parsed > 1000000 && !amountStr.includes('.')) {
      // This looks like a Wei amount, convert it using token decimals
      const decimals = getTokenDecimals(tokenSymbol);
      num = parsed / Math.pow(10, decimals);
    } else {
      // This is already a decimal amount
      num = parsed;
    }
    
    if (isNaN(num) || num === 0) return '0';
    
    // Handle very small amounts
    if (num > 0 && num < 0.000001) {
      return '<0.000001';
    }
    
    // Smart decimal handling based on size
    let maxDecimals = options?.maxDecimals ?? 6;
    let minDecimals = options?.minDecimals ?? 0;
    
    // For very small amounts, show more decimals
    if (num < 0.01) {
      maxDecimals = Math.max(maxDecimals, 8);
    }
    // For large amounts, show fewer decimals  
    else if (num > 1000) {
      maxDecimals = Math.min(maxDecimals, 2);
    }
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
  } catch (error) {
    console.error('Error formatting token amount:', error, { amount, tokenSymbol });
    return amount.toString();
  }
}

// Extract token symbol from asset identifier (e.g., "1:ETH" -> "ETH")
export function extractTokenSymbol(assetIdentifier: string): string {
  if (!assetIdentifier) return '';
  
  // Handle various formats
  // "1:ETH" -> "ETH"
  // "ETH:ETH" -> "ETH"  
  // "1:sol" -> "SOL"
  // "1:0x..." -> extract from formatted data or use address
  const parts = assetIdentifier.split(':');
  if (parts.length >= 2) {
    const tokenPart = parts[parts.length - 1];
    // If it's an address (starts with 0x), we'll need formatted data
    if (tokenPart.startsWith('0x')) {
      return '';
    }
    return tokenPart.toUpperCase();
  }
  
  return assetIdentifier.toUpperCase();
}