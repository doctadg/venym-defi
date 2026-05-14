export interface StandardizedAsset {
  source: 'lifi' | 'sideshift';
  name: string;
  symbol: string;
  chainId: string | number;
  address: string;
  decimals: number;
  logoUrl?: string;
  chainLogoUrl?: string; // Added for chain logo from Li.Fi
  chainName?: string; // Added for actual chain name from Li.Fi
  swappable: boolean;
  providerId?: {
    lifi?: string;
    sideshift?: string;
  };
  priceUsd?: number;
  isPriorityToken?: boolean; // Kept for now, but priorityOrder will be primary
  priorityOrder?: number; // For fine-grained sorting of priority tokens
}

export interface TokenPair {
  fromChainId: string | number;
  toChainId: string | number;
  fromToken: string;
  toToken: string;
  fromSymbol: string;
  toSymbol: string;
}
