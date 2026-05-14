// ============= CROSS-CHAIN SWAP TYPES =============

export interface StandardizedAsset {
  source: "lifi" | "sideshift";
  name: string;
  symbol: string;
  chainId: string | number;
  address: string;
  decimals: number;
  logoUrl?: string;
  chainLogoUrl?: string;
  chainName?: string;
  swappable: boolean;
  providerId?: {
    lifi?: string;
    sideshift?: string;
  };
  priceUsd?: number;
  isPriorityToken?: boolean;
  priorityOrder?: number;
}

export interface UnifiedQuote {
  id: string;
  provider: "sideshift" | "lifi";
  actualProvider?: string;
  actualProviderLogo?: string;
  outputAmount: string;
  fees: {
    total: string;
  };
  estimatedTime: number;
  rawQuote: any;
  transactionRequest?: any;
  chainId: string | number;
  depositAddress?: string;
  depositCoin?: string;
  depositNetwork?: string;
  depositAmount?: string;
  settleAddress?: string;
  settleCoin?: string;
  settleNetwork?: string;
  settleAmount?: string;
  expiresAt?: string;
  status?: string;
  type?: "fixed" | "variable";
  depositMemo?: string;
  refundAddress?: string;
  refundMemo?: string;
}

export interface TokenPair {
  fromChainId: string | number;
  toChainId: string | number;
  fromToken: string;
  toToken: string;
  fromSymbol: string;
  toSymbol: string;
}

export type SwapStatus = "idle" | "quoting" | "quoted" | "executing" | "pending" | "success" | "failed";

export interface SwapState {
  fromToken: StandardizedAsset | null;
  toToken: StandardizedAsset | null;
  fromAmount: string;
  preference: "fastest" | "lowest_cost";
  quotes: UnifiedQuote[];
  selectedQuote: UnifiedQuote | null;
  status: SwapStatus;
  error: string | null;
  txHash: string | null;
  providerErrors: Record<string, string>;
}

export interface ChainMapping {
  lifiChainId: string | number;
  walletChainId: string | number;
  sideshiftNetwork?: string;
  chainType: "EVM" | "SVM" | "UTXO" | "MVM";
  name: string;
  symbol: string;
  icon: string;
}

export interface SwapHistoryEntry {
  id: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  provider: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
  txHash?: string;
}
