import { ChainMappingService } from '@/services/swap/chainMapping';

export interface FormattedAsset {
  chainName: string;
  chainSymbol: string;
  chainIcon?: string;
  tokenSymbol: string;
  tokenName?: string;
  shortDisplay: string; // "USDC on Ethereum"
  fullDisplay: string; // "USDC (USD Coin) on Ethereum"
  isNative: boolean;
  chainId: string;
  tokenAddress: string;
}

// Cache for formatted assets to avoid repeated lookups
const formattedAssetCache = new Map<string, FormattedAsset>();

/**
 * Parse asset string to extract token address and chain ID
 */
function parseAssetString(asset: string): { tokenAddress: string; chainId: string } | null {
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

/**
 * Check if asset is a SideShift coin symbol (e.g., "1:btc", "1:eth") 
 * SideShift uses coin symbols instead of contract addresses
 */
function isSideShiftCoinSymbol(tokenAddress: string): boolean {
  // SideShift coin symbols are typically short (2-6 characters) and lowercase
  return tokenAddress.length <= 6 && 
         tokenAddress === tokenAddress.toLowerCase() &&
         !tokenAddress.startsWith('0x') &&
         tokenAddress !== 'unknown' &&
         tokenAddress !== 'native';
}

/**
 * Format an asset string (e.g., "1:0xA0b86991c5E4De30d...") into a human-readable format
 */
export async function formatAssetDisplay(asset: string): Promise<FormattedAsset | null> {
  // Check cache first
  if (formattedAssetCache.has(asset)) {
    return formattedAssetCache.get(asset)!;
  }

  const parsed = parseAssetString(asset);
  if (!parsed) {
    return null;
  }

  const { chainId, tokenAddress } = parsed;

  try {
    // Get chain information
    const chainInfo = ChainMappingService.getChainInfo(chainId);
    if (!chainInfo) {
      console.warn(`Unknown chain ID: ${chainId} for asset: ${asset}`);
      // For SideShift assets with unknown chains, try to create a reasonable display
      if (isSideShiftCoinSymbol(tokenAddress)) {
        const formatted: FormattedAsset = {
          chainName: `${tokenAddress.toUpperCase()} Network`,
          chainSymbol: tokenAddress.toUpperCase(),
          tokenSymbol: tokenAddress.toUpperCase(),
          tokenName: tokenAddress.toUpperCase(),
          shortDisplay: tokenAddress.toUpperCase(),
          fullDisplay: tokenAddress.toUpperCase(),
          isNative: false,
          chainId,
          tokenAddress,
        };
        formattedAssetCache.set(asset, formatted);
        return formatted;
      }
      return null;
    }

    // Check if it's a native token
    const isNative = tokenAddress.toLowerCase() === 'native' || 
                     tokenAddress === '0x0000000000000000000000000000000000000000' ||
                     tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    let tokenSymbol = chainInfo.symbol; // Default to chain symbol for native
    let tokenName = chainInfo.name;

    if (isNative) {
      // Native token - use chain info
      tokenSymbol = chainInfo.symbol;
      tokenName = chainInfo.name;
    } else if (isSideShiftCoinSymbol(tokenAddress)) {
      // SideShift coin symbol - use the symbol directly and try to get proper name
      tokenSymbol = tokenAddress.toUpperCase();
      tokenName = `${tokenSymbol} Token`;
      
      // Try to get more info about SideShift coins
      try {
        const response = await fetch(`/api/v1/sideshift/coins`);
        if (response.ok) {
          const coins = await response.json();
          const coin = coins.find((c: any) => c.coin === tokenAddress.toLowerCase());
          if (coin) {
            tokenName = coin.name || `${tokenSymbol} Token`;
          }
        }
      } catch (error) {
        // Keep the default name
      }
    } else {
      // Regular token - use static mapping or fallback to address
      if (tokenAddress === 'unknown') {
        tokenSymbol = 'UNKNOWN';
        tokenName = 'Unknown Token';
      } else {
        // Static token mappings for common tokens to avoid API calls
        const staticTokens: Record<string, { symbol: string; name: string }> = {
          '0xa0b86991c5ee4de30d8e30b62d6c6c6c6c6c6c6c6': { symbol: 'USDC', name: 'USD Coin' },
          '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD' },
          '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', name: 'Dai Stablecoin' },
          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', name: 'Wrapped BTC' },
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', name: 'Wrapped Ether' },
        };
        
        const tokenInfo = staticTokens[tokenAddress.toLowerCase()];
        if (tokenInfo) {
          tokenSymbol = tokenInfo.symbol;
          tokenName = tokenInfo.name;
        } else {
          // Fallback to abbreviated address - no API calls
          tokenSymbol = `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
          tokenName = 'Unknown Token';
        }
      }
    }

    const formatted: FormattedAsset = {
      chainName: chainInfo.name,
      chainSymbol: chainInfo.symbol,
      chainIcon: chainInfo.icon,
      tokenSymbol,
      tokenName,
      shortDisplay: tokenSymbol,
      fullDisplay: tokenSymbol,
      isNative,
      chainId,
      tokenAddress,
    };

    // Cache the result
    formattedAssetCache.set(asset, formatted);
    return formatted;
  } catch (error) {
    console.error('Error formatting asset:', error);
    return null;
  }
}

/**
 * Format an asset string synchronously (best effort, may return abbreviated format)
 */
export function formatAssetDisplaySync(asset: string): string {
  const parsed = parseAssetString(asset);
  if (!parsed) {
    return asset;
  }

  const { chainId, tokenAddress } = parsed;
  const chainInfo = ChainMappingService.getChainInfo(chainId);
  
  if (!chainInfo) {
    return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
  }

  const isNative = tokenAddress.toLowerCase() === 'native' || 
                   tokenAddress === '0x0000000000000000000000000000000000000000' ||
                   tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  if (isNative) {
    return chainInfo.symbol;
  }

  if (isSideShiftCoinSymbol(tokenAddress)) {
    return tokenAddress.toUpperCase();
  }

  if (tokenAddress === 'unknown') {
    return 'UNKNOWN';
  }

  // For non-native tokens, we can't get the symbol synchronously
  // Return just the abbreviated address - no chain name to keep it clean
  return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
}

/**
 * Get chain color based on chain ID (for visual styling)
 */
export function getChainColor(chainId: string): string {
  const colorMap: Record<string, string> = {
    '1': 'blue', // Ethereum
    '56': 'yellow', // BSC
    '137': 'purple', // Polygon
    '43114': 'red', // Avalanche
    '250': 'blue', // Fantom
    '42161': 'blue', // Arbitrum
    '10': 'red', // Optimism
    '1151111081099710': 'purple', // Solana
    '20000000000001': 'orange', // Bitcoin
  };

  return colorMap[chainId] || 'gray';
}

/**
 * Batch format multiple assets for performance
 */
export async function formatAssetsDisplayBatch(assets: string[]): Promise<Map<string, FormattedAsset | null>> {
  const results = new Map<string, FormattedAsset | null>();
  
  // Process all assets in parallel
  const promises = assets.map(async (asset) => {
    const formatted = await formatAssetDisplay(asset);
    results.set(asset, formatted);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Clear the formatted asset cache (useful when token data is updated)
 */
export function clearAssetFormatterCache(): void {
  formattedAssetCache.clear();
}