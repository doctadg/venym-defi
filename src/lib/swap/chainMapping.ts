import { ChainMapping } from '@/types/swap';

export const CHAIN_MAPPINGS: ChainMapping[] = [
  { lifiChainId: 1, walletChainId: 1, sideshiftNetwork: 'ethereum', chainType: 'EVM', name: 'Ethereum', symbol: 'ETH', icon: '⟠' },
  { lifiChainId: 56, walletChainId: 56, sideshiftNetwork: 'bsc', chainType: 'EVM', name: 'BNB Smart Chain', symbol: 'BNB', icon: '🟡' },
  { lifiChainId: 137, walletChainId: 137, sideshiftNetwork: 'polygon', chainType: 'EVM', name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { lifiChainId: 42161, walletChainId: 42161, sideshiftNetwork: 'arbitrum', chainType: 'EVM', name: 'Arbitrum', symbol: 'ETH', icon: '🔵' },
  { lifiChainId: 10, walletChainId: 10, sideshiftNetwork: 'optimism', chainType: 'EVM', name: 'Optimism', symbol: 'ETH', icon: '🔴' },
  { lifiChainId: 8453, walletChainId: 8453, sideshiftNetwork: 'base', chainType: 'EVM', name: 'Base', symbol: 'ETH', icon: '🔷' },
  { lifiChainId: 43114, walletChainId: 43114, sideshiftNetwork: 'avax', chainType: 'EVM', name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
  { lifiChainId: 'SOL', walletChainId: 'solana-mainnet', sideshiftNetwork: 'solana', chainType: 'SVM', name: 'Solana', symbol: 'SOL', icon: '🌞' },
  { lifiChainId: 'solana', walletChainId: 'solana-mainnet', sideshiftNetwork: 'solana', chainType: 'SVM', name: 'Solana', symbol: 'SOL', icon: '🌞' },
  { lifiChainId: 1151111081099710, walletChainId: 'solana-mainnet', sideshiftNetwork: 'solana', chainType: 'SVM', name: 'Solana', symbol: 'SOL', icon: '🌞' },
  { lifiChainId: 'BTC', walletChainId: 'bitcoin-mainnet', sideshiftNetwork: 'bitcoin', chainType: 'UTXO', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { lifiChainId: 'bitcoin', walletChainId: 'bitcoin-mainnet', sideshiftNetwork: 'bitcoin', chainType: 'UTXO', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { lifiChainId: 20000000000001, walletChainId: 'bitcoin-mainnet', sideshiftNetwork: 'bitcoin', chainType: 'UTXO', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { lifiChainId: 'SUI', walletChainId: 'sui-mainnet', sideshiftNetwork: 'sui', chainType: 'MVM', name: 'Sui', symbol: 'SUI', icon: '🌊' },
  { lifiChainId: 9270000000000000, walletChainId: 'sui-mainnet', sideshiftNetwork: 'sui', chainType: 'MVM', name: 'Sui', symbol: 'SUI', icon: '🌊' },
  { lifiChainId: 324, walletChainId: 324, sideshiftNetwork: 'zksyncera', chainType: 'EVM', name: 'zkSync Era', symbol: 'ETH', icon: '⚡' },
  { lifiChainId: 59144, walletChainId: 59144, sideshiftNetwork: 'linea', chainType: 'EVM', name: 'Linea', symbol: 'ETH', icon: '🟦' },
  { lifiChainId: 25, walletChainId: 25, sideshiftNetwork: 'cronos', chainType: 'EVM', name: 'Cronos', symbol: 'CRO', icon: '🦁' },
  { lifiChainId: 81457, walletChainId: 81457, sideshiftNetwork: 'blast', chainType: 'EVM', name: 'Blast', symbol: 'ETH', icon: '💥' },
  { lifiChainId: 'TRON', walletChainId: 'tron-mainnet', sideshiftNetwork: 'tron', chainType: 'EVM', name: 'Tron', symbol: 'TRX', icon: '🇹' },
  { lifiChainId: 'TON', walletChainId: 'ton-mainnet', sideshiftNetwork: 'ton', chainType: 'MVM', name: 'TON', symbol: 'TON', icon: '💎' },
  { lifiChainId: 146, walletChainId: 146, sideshiftNetwork: 'sonic', chainType: 'EVM', name: 'Sonic', symbol: 'SONIC', icon: '🎶' },
];

export class ChainMappingService {
  static getByLiFiChainId(lifiChainId: string | number): ChainMapping | null {
    return CHAIN_MAPPINGS.find(m =>
      m.lifiChainId === lifiChainId || String(m.lifiChainId) === String(lifiChainId)
    ) || null;
  }

  static getBySideShiftNetwork(sideshiftNetwork: string): ChainMapping | null {
    return CHAIN_MAPPINGS.find(m => m.sideshiftNetwork === sideshiftNetwork) || null;
  }

  static lifiToSideShift(lifiChainId: string | number): string | null {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping ? mapping.sideshiftNetwork || null : null;
  }

  static sideshiftToLiFi(sideshiftNetwork: string): string | number | null {
    const mapping = this.getBySideShiftNetwork(sideshiftNetwork);
    return mapping ? mapping.lifiChainId : null;
  }

  static isEVMChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping?.chainType === 'EVM' || false;
  }

  static isSolanaChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping?.chainType === 'SVM' || false;
  }

  static getChainInfo(lifiChainId: string | number): { name: string; symbol: string; icon: string } | null {
    if (lifiChainId === 'SOL' || lifiChainId === 'solana') return { name: 'Solana', symbol: 'SOL', icon: '🌞' };
    if (lifiChainId === 'BTC' || lifiChainId === 'bitcoin') return { name: 'Bitcoin', symbol: 'BTC', icon: '₿' };
    const mapping = this.getByLiFiChainId(lifiChainId);
    if (!mapping) return null;
    return { name: mapping.name, symbol: mapping.symbol, icon: mapping.icon };
  }

  static getUniqueChains(): ChainMapping[] {
    const seen = new Set<string>();
    return CHAIN_MAPPINGS.filter(m => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });
  }
}
