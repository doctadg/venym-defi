import { formatUnits } from 'viem';

// Token decimal mappings - chainId:tokenAddress -> decimals
const TOKEN_DECIMALS_MAP: Record<string, number> = {
  // Ethereum mainnet (1)
  '1:0x0000000000000000000000000000000000000000': 18, // ETH
  '1:0xdAC17F958D2ee523a2206206994597C13D831ec7': 6,  // USDT
  '1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 6,  // USDC
  
  // Base (8453)
  '8453:0x0000000000000000000000000000000000000000': 18, // ETH
  '8453:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 6,  // USDC
  '8453:0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2': 6,  // USDT
  '8453:0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf': 8,  // cbBTC
  
  // BSC (56)
  '56:0x0000000000000000000000000000000000000000': 18, // BNB
  '56:0x55d398326f99059fF775485246999027B3197955': 18, // USDT
  
  // Polygon (137)
  '137:0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 6, // USDT
  
  // Arbitrum (42161)
  '42161:0x0000000000000000000000000000000000000000': 18, // ETH
  '42161:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': 6,  // USDT
  
  // Solana (1151111081099710)
  '1151111081099710:11111111111111111111111111111111': 9, // SOL
  '1151111081099710:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
  
  // Blast (81457)
  '81457:0x4300000000000000000000000000000000000003': 18, // WETH
  
  // Optimism (10)
  '10:0x0000000000000000000000000000000000000000': 18, // ETH
  
  // Linea (59144)
  '59144:0x0000000000000000000000000000000000000000': 18, // ETH
  
  // Polygon zkEVM (1101)
  '1101:0x0000000000000000000000000000000000000000': 18, // ETH
  
  // Arbitrum Nova (146)
  '146:0x0000000000000000000000000000000000000000': 18, // ETH
  
  // Bitcoin
  'BTC:BTC': 8,
};

// Get decimals for a token
export function getTokenDecimals(chainId: string, tokenAddress: string): number {
  const key = `${chainId}:${tokenAddress}`;
  
  // Check direct mapping
  if (TOKEN_DECIMALS_MAP[key]) {
    return TOKEN_DECIMALS_MAP[key];
  }
  
  // Check for special cases
  if (tokenAddress === 'SOL' || tokenAddress.includes('SOL')) {
    return 9;
  }
  
  if (tokenAddress === 'BTC' || tokenAddress.includes('BTC')) {
    return 8;
  }
  
  // Default to 18 for EVM tokens
  return 18;
}

// Convert raw amount to human-readable format
export function convertRawAmountToDecimal(
  rawAmount: string,
  chainId: string,
  tokenAddress: string
): number {
  try {
    // Handle edge cases
    if (!rawAmount || rawAmount === '0') {
      return 0;
    }
    
    // Check if the amount is already in decimal format (contains a decimal point)
    // This is a heuristic - if the number has a decimal point and is small enough,
    // it's likely already converted
    if (rawAmount.includes('.')) {
      const num = parseFloat(rawAmount);
      // If it's a reasonable decimal number (not scientific notation), return it
      if (!isNaN(num) && num < 1e9) {
        return num;
      }
    }
    
    const decimals = getTokenDecimals(chainId, tokenAddress);
    
    // Use viem's formatUnits to handle big numbers properly
    const formatted = formatUnits(BigInt(rawAmount), decimals);
    return parseFloat(formatted);
  } catch (error) {
    // Fallback: try direct conversion
    try {
      const num = parseFloat(rawAmount);
      if (!isNaN(num)) {
        // If it's a very large number, assume it needs decimal conversion
        if (num > 1e9) {
          const decimals = getTokenDecimals(chainId, tokenAddress);
          return num / Math.pow(10, decimals);
        }
        // Otherwise return as-is
        return num;
      }
    } catch {}
    return 0;
  }
}

// Parse asset string to extract chain and token
export function parseAssetIdentifier(asset: string): { chainId: string; tokenAddress: string } | null {
  try {
    const parts = asset.split(':');
    if (parts.length !== 2) {
      return null;
    }
    return {
      chainId: parts[0],
      tokenAddress: parts[1],
    };
  } catch {
    return null;
  }
}