// Chain ID mapping between LiFi and wallet providers
export interface ChainMapping {
  lifiChainId: string | number;
  walletChainId: string | number;
  sideshiftNetwork?: string; // New property for SideShift network name
  chainType: 'EVM' | 'SVM' | 'UTXO' | 'MVM';
  name: string;
  symbol: string;
  icon: string;
  walletProviders: {
    phantom?: 'ethereum' | 'solana' | 'bitcoin' | 'sui';
    backpack?: 'ethereum' | 'solana';
    [key: string]: string | undefined;
  };
}

// Comprehensive chain mapping
export const CHAIN_MAPPINGS: ChainMapping[] = [
  // Ethereum Mainnet
  {
    lifiChainId: 1,
    walletChainId: 1,
    sideshiftNetwork: 'ethereum',
    chainType: 'EVM',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '⟠',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // BNB Smart Chain
  {
    lifiChainId: 56,
    walletChainId: 56,
    sideshiftNetwork: 'bsc',
    chainType: 'EVM',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    icon: '🟡',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Polygon
  {
    lifiChainId: 137,
    walletChainId: 137,
    sideshiftNetwork: 'polygon',
    chainType: 'EVM',
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '🟣',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Arbitrum
  {
    lifiChainId: 42161,
    walletChainId: 42161,
    sideshiftNetwork: 'arbitrum',
    chainType: 'EVM',
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔵',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Optimism
  {
    lifiChainId: 10,
    walletChainId: 10,
    sideshiftNetwork: 'optimism',
    chainType: 'EVM',
    name: 'Optimism',
    symbol: 'ETH',
    icon: '🔴',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Base
  {
    lifiChainId: 8453,
    walletChainId: 8453,
    sideshiftNetwork: 'base',
    chainType: 'EVM',
    name: 'Base',
    symbol: 'ETH',
    icon: '🔷',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Avalanche
  {
    lifiChainId: 43114,
    walletChainId: 43114,
    sideshiftNetwork: 'avax',
    chainType: 'EVM',
    name: 'Avalanche',
    symbol: 'AVAX',
    icon: '🔺',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Solana - LiFi uses different chain ID representation
  {
    lifiChainId: 'SOL',
    walletChainId: 'solana-mainnet',
    sideshiftNetwork: 'solana',
    chainType: 'SVM',
    name: 'Solana',
    symbol: 'SOL',
    icon: '🌞',
    walletProviders: {
      phantom: 'solana',
      backpack: 'solana'
    }
  },
  // Alternative Solana representations
  {
    lifiChainId: 'solana',
    walletChainId: 'solana-mainnet',
    sideshiftNetwork: 'solana',
    chainType: 'SVM',
    name: 'Solana',
    symbol: 'SOL',
    icon: '🌞',
    walletProviders: {
      phantom: 'solana',
      backpack: 'solana'
    }
  },
  {
    lifiChainId: 1151111081099710,
    walletChainId: 'solana-mainnet',
    sideshiftNetwork: 'solana',
    chainType: 'SVM',
    name: 'Solana',
    symbol: 'SOL',
    icon: '🌞',
    walletProviders: {
      phantom: 'solana',
      backpack: 'solana'
    }
  },
  // Bitcoin - LiFi representation
  {
    lifiChainId: 'BTC',
    walletChainId: 'bitcoin-mainnet',
    sideshiftNetwork: 'bitcoin',
    chainType: 'UTXO',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    walletProviders: {
      phantom: 'bitcoin'
    }
  },
  {
    lifiChainId: 'bitcoin',
    walletChainId: 'bitcoin-mainnet',
    sideshiftNetwork: 'bitcoin',
    chainType: 'UTXO',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    walletProviders: {
      phantom: 'bitcoin'
    }
  },
  {
    lifiChainId: 20000000000001,
    walletChainId: 'bitcoin-mainnet',
    sideshiftNetwork: 'bitcoin',
    chainType: 'UTXO',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    walletProviders: {
      phantom: 'bitcoin'
    }
  },
  // Sui - LiFi representation
  {
    lifiChainId: 'SUI',
    walletChainId: 'sui-mainnet',
    sideshiftNetwork: 'sui',
    chainType: 'MVM',
    name: 'Sui',
    symbol: 'SUI',
    icon: '🌊',
    walletProviders: {
      phantom: 'sui'
    }
  },
  {
    lifiChainId: 'sui',
    walletChainId: 'sui-mainnet',
    sideshiftNetwork: 'sui',
    chainType: 'MVM',
    name: 'Sui',
    symbol: 'SUI',
    icon: '🌊',
    walletProviders: {
      phantom: 'sui'
    }
  },
  // Tron
  {
    lifiChainId: 'TRON', // Assuming a LiFi chain ID for Tron if it exists, otherwise use a placeholder
    walletChainId: 'tron-mainnet', // Assuming a wallet chain ID for Tron
    sideshiftNetwork: 'tron',
    chainType: 'EVM', // Tron is EVM compatible
    name: 'Tron',
    symbol: 'TRX',
    icon: '🇹',
    walletProviders: {} // No specific wallet providers listed for Tron in WALLET_DEFINITIONS
  },
  // Hedera
  {
    lifiChainId: 'HEDERA', // Assuming a LiFi chain ID for Hedera
    walletChainId: 'hedera-mainnet', // Assuming a wallet chain ID for Hedera
    sideshiftNetwork: 'hedera',
    chainType: 'EVM', // Hedera is EVM compatible
    name: 'Hedera',
    symbol: 'HBAR',
    icon: 'ℏ',
    walletProviders: {}
  },
  // Algorand
  {
    lifiChainId: 'ALGORAND', // Assuming a LiFi chain ID for Algorand
    walletChainId: 'algorand-mainnet', // Assuming a wallet chain ID for Algorand
    sideshiftNetwork: 'algorand',
    chainType: 'MVM', // Algorand is not EVM, SVM, or UTXO
    name: 'Algorand',
    symbol: 'ALGO',
    icon: '🅰️',
    walletProviders: {}
  },
  // Cronos
  {
    lifiChainId: 25,
    walletChainId: 25,
    sideshiftNetwork: 'cronos',
    chainType: 'EVM',
    name: 'Cronos',
    symbol: 'CRO',
    icon: '🦁',
    walletProviders: {
      phantom: 'ethereum', // Assuming EVM compatible wallets support Cronos
      backpack: 'ethereum'
    }
  },
  // Fetch.ai
  {
    lifiChainId: 'FETCH', // Assuming a LiFi chain ID for Fetch.ai
    walletChainId: 'fetch-mainnet', // Assuming a wallet chain ID for Fetch.ai
    sideshiftNetwork: 'fetch',
    chainType: 'EVM', // Fetch.ai is Cosmos-SDK based, but often interacts with EVM
    name: 'Fetch.ai',
    symbol: 'FET',
    icon: '🤖',
    walletProviders: {}
  },
  // Bitcoin Cash
  {
    lifiChainId: 'BCH', // Assuming a LiFi chain ID for Bitcoin Cash
    walletChainId: 'bitcoincash-mainnet', // Assuming a wallet chain ID for Bitcoin Cash
    sideshiftNetwork: 'bitcoincash',
    chainType: 'UTXO',
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    icon: '฿',
    walletProviders: {}
  },
  // Liquid
  {
    lifiChainId: 'LIQUID', // Assuming a LiFi chain ID for Liquid
    walletChainId: 'liquid-mainnet', // Assuming a wallet chain ID for Liquid
    sideshiftNetwork: 'liquid',
    chainType: 'UTXO',
    name: 'Liquid',
    symbol: 'L-BTC',
    icon: '💧',
    walletProviders: {}
  },
  // HyperEVM
  {
    lifiChainId: 'HYPEREVM', // Assuming a LiFi chain ID for HyperEVM
    walletChainId: 'hyperevm-mainnet', // Assuming a wallet chain ID for HyperEVM
    sideshiftNetwork: 'hyperevm',
    chainType: 'EVM',
    name: 'Hyperliquid',
    symbol: 'HYPE',
    icon: '⚡',
    walletProviders: {}
  },
  // Sonic
  {
    lifiChainId: 'SONIC', // Assuming a LiFi chain ID for Sonic
    walletChainId: 'sonic-mainnet', // Assuming a wallet chain ID for Sonic
    sideshiftNetwork: 'sonic',
    chainType: 'EVM', // Assuming EVM compatibility
    name: 'Sonic',
    symbol: 'SONIC',
    icon: '🎶',
    walletProviders: {}
  },
  // Aptos
  {
    lifiChainId: 'APTOS', // Assuming a LiFi chain ID for Aptos
    walletChainId: 'aptos-mainnet', // Assuming a wallet chain ID for Aptos
    sideshiftNetwork: 'aptos',
    chainType: 'MVM', // Move VM
    name: 'Aptos',
    symbol: 'APT',
    icon: '🅰️',
    walletProviders: {}
  },
  // zkSync Era
  {
    lifiChainId: 324,
    walletChainId: 324,
    sideshiftNetwork: 'zksyncera',
    chainType: 'EVM',
    name: 'zkSync Era',
    symbol: 'ETH',
    icon: '⚡',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Blast
  {
    lifiChainId: 'BLAST', // Assuming a LiFi chain ID for Blast
    walletChainId: 'blast-mainnet', // Assuming a wallet chain ID for Blast
    sideshiftNetwork: 'blast',
    chainType: 'EVM',
    name: 'Blast',
    symbol: 'ETH',
    icon: '💥',
    walletProviders: {}
  },
  // Linea
  {
    lifiChainId: 59144,
    walletChainId: 59144,
    sideshiftNetwork: 'linea',
    chainType: 'EVM',
    name: 'Linea',
    symbol: 'ETH',
    icon: '🟦',
    walletProviders: {
      phantom: 'ethereum',
      backpack: 'ethereum'
    }
  },
  // Scroll
  {
    lifiChainId: 'SCROLL', // Assuming a LiFi chain ID for Scroll
    walletChainId: 'scroll-mainnet', // Assuming a wallet chain ID for Scroll
    sideshiftNetwork: 'scroll',
    chainType: 'EVM',
    name: 'Scroll',
    symbol: 'ETH',
    icon: '📜',
    walletProviders: {}
  },
  // TON
  {
    lifiChainId: 'TON',
    walletChainId: 'ton-mainnet',
    sideshiftNetwork: 'ton',
    chainType: 'MVM',
    name: 'TON',
    symbol: 'TON',
    icon: '💎',
    walletProviders: {}
  },
  // Sui with proper chain ID
  {
    lifiChainId: 9270000000000000,
    walletChainId: 'sui-mainnet',
    sideshiftNetwork: 'sui',
    chainType: 'MVM',
    name: 'Sui',
    symbol: 'SUI',
    icon: '🌊',
    walletProviders: {
      phantom: 'sui'
    }
  },
];

// Utility functions
export class ChainMappingService {
  // Get chain mapping by LiFi chain ID
  static getByLiFiChainId(lifiChainId: string | number): ChainMapping | null {
    return CHAIN_MAPPINGS.find(mapping => 
      mapping.lifiChainId === lifiChainId ||
      String(mapping.lifiChainId) === String(lifiChainId)
    ) || null;
  }

  // Get chain mapping by wallet chain ID
  static getByWalletChainId(walletChainId: string | number): ChainMapping | null {
    return CHAIN_MAPPINGS.find(mapping => 
      mapping.walletChainId === walletChainId ||
      String(mapping.walletChainId) === String(walletChainId)
    ) || null;
  }

  // Get chain mapping by SideShift network name
  static getBySideShiftNetwork(sideshiftNetwork: string): ChainMapping | null {
    return CHAIN_MAPPINGS.find(mapping => 
      mapping.sideshiftNetwork === sideshiftNetwork
    ) || null;
  }

  // Convert LiFi chain ID to wallet chain ID
  static lifiToWallet(lifiChainId: string | number): string | number | null {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping ? mapping.walletChainId : null;
  }

  // Convert wallet chain ID to LiFi chain ID
  static walletToLiFi(walletChainId: string | number): string | number | null {
    const mapping = this.getByWalletChainId(walletChainId);
    return mapping ? mapping.lifiChainId : null;
  }

  // Convert SideShift network name to LiFi chain ID
  static sideshiftToLiFi(sideshiftNetwork: string): string | number | null {
    const mapping = this.getBySideShiftNetwork(sideshiftNetwork);
    return mapping ? mapping.lifiChainId : null;
  }

  // Convert LiFi chain ID to SideShift network name
  static lifiToSideShift(lifiChainId: string | number): string | null {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping ? mapping.sideshiftNetwork || null : null;
  }

  // Get the correct provider API for a wallet and chain
  static getWalletProvider(walletId: string, lifiChainId: string | number): string | null {
    const mapping = this.getByLiFiChainId(lifiChainId);
    if (!mapping) return null;
    
    return mapping.walletProviders[walletId] || null;
  }

  // Check if chain is EVM compatible
  static isEVMChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping?.chainType === 'EVM' || false;
  }

  // Check if chain is Solana
  static isSolanaChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    const result = mapping?.chainType === 'SVM' || false;
    
    // Debug logging
    console.log('isSolanaChain check:', {
      lifiChainId,
      mapping: mapping ? { name: mapping.name, chainType: mapping.chainType } : null,
      result
    });
    
    return result;
  }

  // Check if chain is Bitcoin
  static isBitcoinChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping?.chainType === 'UTXO' || false;
  }

  // Check if chain is Sui
  static isSuiChain(lifiChainId: string | number): boolean {
    const mapping = this.getByLiFiChainId(lifiChainId);
    return mapping?.chainType === 'MVM' || false;
  }

  // Get chain info for display
  static getChainInfo(lifiChainId: string | number): { name: string; symbol: string; icon: string } | null {
    // Special handling for SideShift chain identifiers
    if (lifiChainId === 'SOL' || lifiChainId === 'solana') {
      return { name: 'Solana', symbol: 'SOL', icon: '🌞' };
    }
    if (lifiChainId === 'ETH' || lifiChainId === 'ethereum') {
      return { name: 'Ethereum', symbol: 'ETH', icon: '⟠' };
    }
    if (lifiChainId === 'BTC' || lifiChainId === 'bitcoin') {
      return { name: 'Bitcoin', symbol: 'BTC', icon: '₿' };
    }
    
    const mapping = this.getByLiFiChainId(lifiChainId);
    if (!mapping) return null;
    
    return {
      name: mapping.name,
      symbol: mapping.symbol,
      icon: mapping.icon
    };
  }

  // Get all supported chains for a wallet
  static getSupportedChainsForWallet(walletId: string): ChainMapping[] {
    return CHAIN_MAPPINGS.filter(mapping => 
      mapping.walletProviders[walletId] !== undefined
    );
  }
}
