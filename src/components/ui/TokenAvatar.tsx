'use client';

import { useState, useEffect, useCallback } from 'react';
import { StandardizedAsset } from '@/types/asset';
import { logoCache } from '@/lib/services/logoCache';

interface TokenAvatarProps {
  token: StandardizedAsset;
  size?: string;
  className?: string;
  showChainIndicator?: boolean;
}

// Helper function to get chain icon path from chain name
const getChainIconPath = (chainName?: string): string | null => {
  if (!chainName) return null;
  
  const chainIconMap: Record<string, string> = {
    'ethereum': '/icons/chains/ethereum.svg',
    'bitcoin': '/icons/chains/bitcoin.svg',
    'solana': '/icons/chains/solana.svg',
    'polygon': '/icons/chains/ethereum.svg', // Using ethereum icon as fallback
    'bsc': '/icons/chains/ethereum.svg', // Using ethereum icon as fallback
    'arbitrum': '/icons/chains/ethereum.svg', // Using ethereum icon as fallback
    'optimism': '/icons/chains/optimism.svg',
    'avalanche': '/icons/chains/ethereum.svg', // Using ethereum icon as fallback
    'fantom': '/icons/chains/ethereum.svg', // Using ethereum icon as fallback
    'cardano': '/icons/chains/cardano.svg',
    'polkadot': '/icons/chains/polkadot.svg',
    'cosmos': '/icons/chains/cosmos.svg',
    'algorand': '/icons/chains/algorand-algo-logo.svg',
    'aptos': '/icons/chains/aptos-apt-logo.svg',
    'sui': '/icons/chains/sui.svg',
    'stellar': '/icons/chains/stellar.svg',
    'ripple': '/icons/chains/ripple.svg',
    'litecoin': '/icons/chains/litecoin.svg',
    'dogecoin': '/icons/chains/doge.svg',
    'dash': '/icons/chains/dash.svg',
    'tron': '/icons/chains/tron.svg',
    'ton': '/icons/chains/ton.svg',
    'stacks': '/icons/chains/stacks.svg',
    'ronin': '/icons/chains/ronin.svg',
    'mantle': '/icons/chains/mantle.svg',
    'liquid': '/icons/chains/liquid.svg',
    'icp': '/icons/chains/icp.svg',
    'hyperliquid': '/icons/chains/hyperliquid.svg',
    'hedera': '/icons/chains/hedera.svg',
    'celestia': '/icons/chains/celestia.svg',
    'bittensor': '/icons/chains/bittensor.svg',
    'xec': '/icons/chains/xec.svg',
  };
  
  const normalizedChainName = chainName.toLowerCase();
  return chainIconMap[normalizedChainName] || null;
};

export const TokenAvatar = ({ token, size = "w-12 h-12", className = "", showChainIndicator = true }: TokenAvatarProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chainImageError, setChainImageError] = useState(false);

  const loadImage = useCallback(async () => {
    try {
      setIsLoading(true);
      setImageError(false);
      
      // Use the logoCache service to get standardized logo URL
      const standardizedLogoUrl = logoCache.getStandardizedLogoUrl({
        symbol: token.symbol,
        chainId: token.chainId,
        logoUrl: token.logoUrl,
        source: token.source
      });
      
      if (standardizedLogoUrl) {
        setImageUrl(standardizedLogoUrl);
      } else {
        setImageError(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.warn(`Failed to load logo for ${token.symbol}:`, error);
      setImageError(true);
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  const handleChainImageError = useCallback(() => {
    setChainImageError(true);
  }, []);

  // Get chain icon URL
  const chainIconUrl = token.chainLogoUrl || getChainIconPath(token.chainName);

  // Convert Tailwind size to pixel dimensions
  const getPixelSize = (tailwindSize: string) => {
    if (tailwindSize.includes('w-6') || tailwindSize.includes('h-6')) return 24;
    if (tailwindSize.includes('w-8') || tailwindSize.includes('h-8')) return 32;
    if (tailwindSize.includes('w-10') || tailwindSize.includes('h-10')) return 40;
    if (tailwindSize.includes('w-12') || tailwindSize.includes('h-12')) return 48;
    if (tailwindSize.includes('w-16') || tailwindSize.includes('h-16')) return 64;
    return 32; // default
  };

  // Calculate chain indicator size based on main token size
  const getChainIndicatorSize = (mainSize: string) => {
    if (mainSize.includes('w-6') || mainSize.includes('h-6')) return 'w-3 h-3';
    if (mainSize.includes('w-8') || mainSize.includes('h-8')) return 'w-4 h-4';
    if (mainSize.includes('w-10') || mainSize.includes('h-10')) return 'w-5 h-5';
    if (mainSize.includes('w-12') || mainSize.includes('h-12')) return 'w-6 h-6';
    if (mainSize.includes('w-16') || mainSize.includes('h-16')) return 'w-8 h-8';
    return 'w-4 h-4'; // default
  };

  const chainIndicatorSize = getChainIndicatorSize(size);
  const pixelSize = getPixelSize(size);
  const chainPixelSize = getPixelSize(chainIndicatorSize);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className={`${size} rounded-full bg-gray-200 animate-pulse flex items-center justify-center`}>
          <div className="w-1/2 h-1/2 bg-gray-300 rounded-full"></div>
        </div>
        {showChainIndicator && (
          <div className={`absolute -bottom-1 -right-1 ${chainIndicatorSize} rounded-full bg-gray-300 animate-pulse border-2 border-white`}></div>
        )}
      </div>
    );
  }

  // Show fallback if image failed to load
  if (imageError || !imageUrl) {
    return (
      <div className={`relative ${className}`}>
        <div className={`${size} rounded-full bg-gradient-to-br from-[#0ff378] to-[#0ff378] flex items-center justify-center text-white text-sm font-bold`}>
          {token.symbol.slice(0, 2).toUpperCase()}
        </div>
        {showChainIndicator && chainIconUrl && !chainImageError && (
          <img 
            src={chainIconUrl}
            alt={token.chainName || 'Chain'}
            className={`absolute -bottom-1 -right-1 ${chainIndicatorSize} rounded-full object-cover border-2 border-white bg-white`}
            style={{ objectFit: 'cover' }}
            onError={handleChainImageError}
            loading="lazy"
          />
        )}
        {showChainIndicator && (!chainIconUrl || chainImageError) && token.chainName && (
          <div className={`absolute -bottom-1 -right-1 ${chainIndicatorSize} rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white`}>
            {token.chainName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={imageUrl} 
        alt={token.symbol}
        className={`${size} rounded-full object-cover`}
        style={{ 
          objectFit: 'cover',
        }}
        onError={handleImageError}
        loading="lazy"
      />
      {showChainIndicator && chainIconUrl && !chainImageError && (
        <img 
          src={chainIconUrl}
          alt={token.chainName || 'Chain'}
          className={`absolute -bottom-1 -right-1 ${chainIndicatorSize} rounded-full object-cover border-2 border-white bg-white`}
          onError={handleChainImageError}
          loading="lazy"
        />
      )}
      {showChainIndicator && (!chainIconUrl || chainImageError) && token.chainName && (
        <div className={`absolute -bottom-1 -right-1 ${chainIndicatorSize} rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white`}>
          {token.chainName.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
};

interface ChainAvatarProps {
  chain: {
    id: string | number;
    name: string;
    logoUrl?: string;
  };
  size?: string;
  className?: string;
}

export const ChainAvatar = ({ chain, size = "w-8 h-8", className = "" }: ChainAvatarProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadImage = useCallback(async () => {
    try {
      setIsLoading(true);
      setImageError(false);
      
      // Use the original logo URL from the chain
      const logoUrl = chain.logoUrl;
      
      if (logoUrl) {
        setImageUrl(logoUrl);
      } else {
        setImageError(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.warn(`Failed to load chain logo for ${chain.name}:`, error);
      setImageError(true);
      setIsLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${size} rounded-full bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
        <div className="w-1/2 h-1/2 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  // Show fallback if image failed to load
  if (imageError || !imageUrl) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold ${className}`}>
        {chain.name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={chain.name}
      className={`${size} rounded-full object-cover ${className}`}
      style={{ objectFit: 'cover' }}
      onError={handleImageError}
      loading="lazy"
    />
  );
};
