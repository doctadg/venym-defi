import { StandardizedAsset } from '@/types/asset';
import { ChainMappingService } from '@/lib/chains/chainMapping';

/**
 * Utility to construct StandardizedAsset data from raw quote responses
 * This ensures we preserve rich asset metadata in the database
 */
export class AssetDataBuilder {
  
  /**
   * Build StandardizedAsset for SideShift transactions
   */
  static buildSideShiftAssetData(
    coin: string,
    network: string,
    amount: string,
    chainId: string | number
  ): StandardizedAsset {
    const chainInfo = ChainMappingService.getChainInfo(chainId);
    
    return {
      source: 'sideshift',
      name: coin.toUpperCase(),
      symbol: coin.toUpperCase(),
      chainId: chainId,
      address: coin.toLowerCase(), // SideShift uses coin symbols as addresses
      decimals: this.getTokenDecimals(coin),
      logoUrl: this.getTokenLogoUrl(coin),
      chainLogoUrl: this.getChainLogoUrl(chainId),
      chainName: chainInfo?.name || network,
      swappable: true,
      providerId: {
        sideshift: coin.toLowerCase()
      },
      priceUsd: undefined, // Will be populated by price service if available
    };
  }

  /**
   * Build StandardizedAsset for LiFi transactions
   */
  static buildLiFiAssetData(
    token: {
      name?: string;
      symbol?: string;
      decimals?: number;
      address?: string;
      logoURI?: string;
    },
    chainId: string | number
  ): StandardizedAsset {
    const chainInfo = ChainMappingService.getChainInfo(chainId);
    
    return {
      source: 'lifi',
      name: token.name || token.symbol || 'Unknown Token',
      symbol: token.symbol || 'UNKNOWN',
      chainId: chainId,
      address: token.address || '0x0000000000000000000000000000000000000000',
      decimals: token.decimals || 18,
      logoUrl: token.logoURI,
      chainLogoUrl: this.getChainLogoUrl(chainId),
      chainName: chainInfo?.name || `Chain ${chainId}`,
      swappable: true,
      providerId: {
        lifi: token.address || token.symbol
      },
      priceUsd: undefined, // Will be populated by price service if available
    };
  }

  /**
   * Get token decimals based on symbol
   */
  private static getTokenDecimals(symbol: string): number {
    const decimalsMap: Record<string, number> = {
      'ETH': 18,
      'WETH': 18,
      'USDT': 6,
      'USDC': 6,
      'DAI': 18,
      'WBTC': 8,
      'BTC': 8,
      'SOL': 9,
      'WSOL': 9,
      'BNB': 18,
      'WBNB': 18,
    };
    
    return decimalsMap[symbol.toUpperCase()] || 18;
  }

  /**
   * Get token logo URL using CoinGecko CDN
   */
  private static getTokenLogoUrl(symbol: string): string | undefined {
    const logoMap: Record<string, string> = {
      'eth': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      'btc': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      'sol': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
      'usdc': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      'usdt': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      'bnb': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
      'dai': 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
      'wbtc': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    };
    
    return logoMap[symbol.toLowerCase()];
  }

  /**
   * Get chain logo URL based on chain ID
   */
  private static getChainLogoUrl(chainId: string | number): string | undefined {
    const chainLogos: Record<string, string> = {
      '1': '/icons/chains/ethereum.svg',
      '8453': '/icons/chains/ethereum.svg', // Base
      '56': '/icons/chains/ethereum.svg', // BSC
      '137': '/icons/chains/ethereum.svg', // Polygon
      '42161': '/icons/chains/ethereum.svg', // Arbitrum
      '10': '/icons/chains/optimism.svg', // Optimism
      '43114': '/icons/chains/ethereum.svg', // Avalanche
      '1151111081099710': '/icons/chains/solana.svg', // Solana
      '20000000000001': '/icons/chains/bitcoin.svg', // Bitcoin
      'SOL': '/icons/chains/solana.svg',
      'BTC': '/icons/chains/bitcoin.svg',
      'ETH': '/icons/chains/ethereum.svg',
    };
    
    return chainLogos[String(chainId)];
  }
}