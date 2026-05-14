// Logo caching service for improved performance and consistency
class LogoCacheService {
  private cache = new Map<string, string>();
  private loadingPromises = new Map<string, Promise<string>>();
  private failedUrls = new Set<string>();

  // Preload critical logos (disabled to prevent interference)
  private criticalLogos: string[] = [];

  constructor() {
    // Preload critical logos on initialization
    if (typeof window !== 'undefined') {
      this.preloadCriticalLogos();
      // Clear any cached problematic URLs
      this.clearProblematicTokens();
    }
  }

  private async preloadCriticalLogos() {
    // Preload in background without blocking
    this.criticalLogos.forEach(url => {
      this.preloadImage(url).catch(() => {
        // Silently fail for preloading
      });
    });
  }

  private preloadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, url);
        resolve(url);
      };
      img.onerror = () => {
        this.failedUrls.add(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }

  // Helper method to enhance image URLs to higher resolution versions
  private enhanceImageUrl(url: string): string {
    // Keep CoinGecko thumb URLs as they are properly sized
    if (url.includes('coingecko.com')) {
      return url;
    }
    
    // Replace other common low-res patterns
    if (url.includes('?w=') || url.includes('?size=')) {
      // Remove size query parameters that might limit resolution
      return url.split('?')[0];
    }
    
    return url;
  }

  async loadLogo(url: string, fallbackUrl?: string): Promise<string> {
    // Return cached result if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Return failed URL immediately if we know it's broken
    if (this.failedUrls.has(url)) {
      if (fallbackUrl) {
        return this.loadLogo(fallbackUrl);
      }
      throw new Error(`Logo failed to load: ${url}`);
    }

    // Check if we're already loading this URL
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading the image
    const loadingPromise = this.preloadImage(url).catch(async (error) => {
      // If primary URL fails, try fallback
      if (fallbackUrl && !this.failedUrls.has(fallbackUrl)) {
        try {
          return await this.loadLogo(fallbackUrl);
        } catch (fallbackError) {
          throw error; // Return original error if fallback also fails
        }
      }
      throw error;
    }).finally(() => {
      // Clean up loading promise
      this.loadingPromises.delete(url);
    });

    this.loadingPromises.set(url, loadingPromise);
    return loadingPromise;
  }

  // Get standardized logo URL with fallbacks
  getStandardizedLogoUrl(token: { symbol: string; chainId: string | number; logoUrl?: string; source?: string }): string {
    const { logoUrl, chainId, symbol, source } = token;
    
    // Force use of chain SVG icons for problematic tokens - these are crisp
    const forceChainIcons: Record<string, string> = {
      'BTC': '/icons/chains/bitcoin.svg',
      'BNB': '/icons/chains/bsc.svg', 
      'SOL': '/icons/chains/solana.svg',
      'CRO': '/icons/chains/cronos.svg',
      'CRONOS': '/icons/chains/cronos.svg',
      'BCH': '/icons/chains/bch.svg'
    };
    
    if (forceChainIcons[symbol]) {
      return forceChainIcons[symbol];
    }
    
    // PRIORITY 1: Use LiFi sourced logo if available
    if (logoUrl && source === 'lifi') {
      return logoUrl;
    }
    
    // PRIORITY 2: Use other sourced logos if available
    if (logoUrl) {
      // If it's a very large image URL, try to get a smaller version
      if (logoUrl.includes('250x250') || logoUrl.includes('512x512') || logoUrl.includes('1000x1000')) {
        const smallerUrl = logoUrl
          .replace('250x250', '64x64')
          .replace('512x512', '64x64')
          .replace('1000x1000', '64x64');
        return smallerUrl;
      }
      return logoUrl;
    }

    // PRIORITY 3: Fallback to chain icons only if no logo is provided
    const chainLogos: Record<string, string> = {
      '1': '/icons/chains/ethereum.svg',
      '42161': '/icons/chains/ethereum.svg', // Arbitrum uses ETH
      '137': '/icons/chains/ethereum.svg', // Polygon
      '56': '/icons/chains/ethereum.svg', // BSC
      '10': '/icons/chains/ethereum.svg', // Optimism
      '8453': '/icons/chains/ethereum.svg', // Base
      '43114': '/icons/chains/ethereum.svg', // Avalanche
      '1151111081099710': '/icons/chains/solana.svg',
      '20000000000001': '/icons/chains/bitcoin.svg',
      '9270000000000000': '/icons/chains/sui.svg',
      'TRON': '/icons/chains/tron.svg', // Tron chain
      'tron': '/icons/chains/tron.svg' // Tron chain (lowercase)
    };

    return chainLogos[String(chainId)] || '/icons/chains/ethereum.svg';
  }

  // Get chain logo URL
  getChainLogoUrl(chainId: string | number): string {
    const chainLogos: Record<string, string> = {
      '1': '/icons/chains/ethereum.svg',
      '42161': '/icons/chains/ethereum.svg', // Arbitrum uses ETH logo
      '137': '/icons/chains/ethereum.svg', // Polygon
      '56': '/icons/chains/ethereum.svg', // BSC  
      '10': '/icons/chains/optimism.svg',
      '8453': '/icons/chains/ethereum.svg', // Base
      '43114': '/icons/chains/ethereum.svg', // Avalanche
      '1151111081099710': '/icons/chains/solana.svg',
      '20000000000001': '/icons/chains/bitcoin.svg',
      '9270000000000000': '/icons/chains/sui.svg',
      'TRON': '/icons/chains/tron.svg', // Tron chain
      'tron': '/icons/chains/tron.svg' // Tron chain (lowercase)
    };

    return chainLogos[String(chainId)] || '/icons/chains/ethereum.svg';
  }

  // Clear cache (useful for development)
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.failedUrls.clear();
  }

  // Clear cache for specific problematic tokens
  clearProblematicTokens() {
    const problematicUrls = [
      'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'
    ];
    
    problematicUrls.forEach(url => {
      this.cache.delete(url);
      this.failedUrls.delete(url);
    });
  }

  // Get cache stats
  getCacheStats() {
    return {
      cached: this.cache.size,
      loading: this.loadingPromises.size,
      failed: this.failedUrls.size
    };
  }
}

// Export singleton instance
export const logoCache = new LogoCacheService();
