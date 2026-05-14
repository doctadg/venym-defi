import { useEffect, useState, useCallback } from 'react';
import { StandardizedAsset } from '@/types/swap';
import { swapApi } from '@/services/swap/swapApi';
import { ChainMappingService } from '@/services/swap/chainMapping';

const CACHE_KEY = 'venym_swap_tokens';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

interface TokenCache {
  timestamp: number;
  tokens: StandardizedAsset[];
}

// Default popular tokens for quick selection
const DEFAULT_TOKENS: StandardizedAsset[] = [
  // Ethereum
  { source: 'lifi', name: 'Ethereum', symbol: 'ETH', chainId: 1, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/eth.png', chainName: 'Ethereum', priceUsd: 2500, priorityOrder: 1 },
  { source: 'lifi', name: 'USD Coin', symbol: 'USDC', chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdc.png', chainName: 'Ethereum', priceUsd: 1, priorityOrder: 2 },
  { source: 'lifi', name: 'Tether', symbol: 'USDT', chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdt.png', chainName: 'Ethereum', priceUsd: 1, priorityOrder: 3 },
  { source: 'lifi', name: 'Wrapped Bitcoin', symbol: 'WBTC', chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, swappable: true, logoUrl: 'https://assets.li.fi/crypto/wbtc.png', chainName: 'Ethereum', priceUsd: 90000, priorityOrder: 4 },
  // Base
  { source: 'lifi', name: 'Ethereum', symbol: 'ETH', chainId: 8453, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/eth.png', chainName: 'Base', priceUsd: 2500, priorityOrder: 5 },
  { source: 'lifi', name: 'USD Coin', symbol: 'USDC', chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdc.png', chainName: 'Base', priceUsd: 1, priorityOrder: 6 },
  // Arbitrum
  { source: 'lifi', name: 'Ethereum', symbol: 'ETH', chainId: 42161, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/eth.png', chainName: 'Arbitrum', priceUsd: 2500, priorityOrder: 7 },
  { source: 'lifi', name: 'Tether', symbol: 'USDT', chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdt.png', chainName: 'Arbitrum', priceUsd: 1, priorityOrder: 8 },
  // Solana
  { source: 'lifi', name: 'Solana', symbol: 'SOL', chainId: 'SOL', address: '11111111111111111111111111111111', decimals: 9, swappable: true, logoUrl: 'https://assets.li.fi/crypto/sol.png', chainName: 'Solana', priceUsd: 150, priorityOrder: 9 },
  { source: 'lifi', name: 'USD Coin', symbol: 'USDC', chainId: 'SOL', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdc.png', chainName: 'Solana', priceUsd: 1, priorityOrder: 10 },
  // Polygon
  { source: 'lifi', name: 'USD Coin', symbol: 'USDC', chainId: 137, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, swappable: true, logoUrl: 'https://assets.li.fi/crypto/usdc.png', chainName: 'Polygon', priceUsd: 1, priorityOrder: 11 },
  // Optimism
  { source: 'lifi', name: 'Ethereum', symbol: 'ETH', chainId: 10, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/eth.png', chainName: 'Optimism', priceUsd: 2500, priorityOrder: 12 },
  // BSC
  { source: 'lifi', name: 'BNB', symbol: 'BNB', chainId: 56, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/bnb.png', chainName: 'BNB Smart Chain', priceUsd: 600, priorityOrder: 13 },
  // Avalanche
  { source: 'lifi', name: 'Avalanche', symbol: 'AVAX', chainId: 43114, address: '0x0000000000000000000000000000000000000000', decimals: 18, swappable: true, logoUrl: 'https://assets.li.fi/crypto/avax.png', chainName: 'Avalanche', priceUsd: 35, priorityOrder: 14 },
];

export function useSwapTokens() {
  const [tokens, setTokens] = useState<StandardizedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: TokenCache = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION && parsed.tokens.length > 0) {
          setTokens(parsed.tokens);
          setLoading(false);
          // Background refresh if stale
          if (Date.now() - parsed.timestamp > CACHE_DURATION / 2) {
            fetchFromApi();
          }
          return;
        }
      }
    } catch {}

    await fetchFromApi();
  }, []);

  const fetchFromApi = async () => {
    try {
      setLoading(true);
      // Fetch tokens from popular chains
      const chains = [1, 8453, 42161, 10, 137, 56, 43114, 324, 59144];
      const allTokens: StandardizedAsset[] = [];

      for (const chainId of chains) {
        try {
          const chainTokens = await swapApi.getLiFiTokens(chainId);
          const chainIdStr = String(chainId);
          const chainInfo = ChainMappingService.getChainInfo(chainId);
          const tokensForChain = chainTokens[chainIdStr] || [];

          for (const t of tokensForChain) {
            allTokens.push({
              source: 'lifi',
              name: t.name || t.symbol,
              symbol: t.symbol,
              chainId,
              address: t.address,
              decimals: t.decimals,
              logoUrl: t.logoURI || t.icon,
              chainName: chainInfo?.name,
              swappable: true,
              priceUsd: t.priceUSD ? parseFloat(t.priceUSD) : undefined,
            });
          }
        } catch {
          // Skip chain if it fails
        }
      }

      // Merge with defaults (keep defaults for priority)
      const defaultAddrs = new Set(DEFAULT_TOKENS.map(d => `${d.chainId}:${d.address}`.toLowerCase()));
      const extras = allTokens.filter(t => !defaultAddrs.has(`${t.chainId}:${t.address}`.toLowerCase()));

      const merged = [...DEFAULT_TOKENS, ...extras].sort((a, b) => {
        const aP = a.priorityOrder ?? Infinity;
        const bP = b.priorityOrder ?? Infinity;
        if (aP !== bP) return aP - bP;
        return a.symbol.localeCompare(b.symbol);
      });

      setTokens(merged);
      setError(null);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tokens: merged }));
      } catch {}
    } catch (e: any) {
      setError(e.message);
      // Fallback to defaults
      if (tokens.length === 0) setTokens(DEFAULT_TOKENS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const getTokensByChain = useCallback((chainId: string | number) => {
    return tokens.filter(t => String(t.chainId) === String(chainId));
  }, [tokens]);

  const searchTokens = useCallback((query: string) => {
    const q = query.toLowerCase();
    if (!q) return DEFAULT_TOKENS;
    return tokens.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      String(t.chainId) === q
    ).slice(0, 50);
  }, [tokens]);

  return { tokens, loading, error, getTokensByChain, searchTokens, refetch: fetchTokens };
}
