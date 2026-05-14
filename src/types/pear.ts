// ============= PEAR PROTOCOL FRONTEND TYPES =============

export interface PearAssetAllocation {
    asset: string;
    weight: number;
}

export interface PearMarket {
    id: string;
    displayName: string;
    assetLogos: string[];
    longAssets: PearAssetAllocation[];
    shortAssets: PearAssetAllocation[];
    ratio: number;
    weightedRatio: number;
    change24h: number;
    volume24h: number;
    openInterest: number;
    netFunding: number;
    engine?: string;
}

export interface PearActiveMarkets {
    active: PearMarket[];
    topGainers: PearMarket[];
    topLosers: PearMarket[];
    highlighted: PearMarket[];
    watchlist: PearMarket[];
}

export interface PearRiskParameter {
    type: 'PERCENTAGE' | 'DOLLAR' | 'POSITION_VALUE' | 'PRICE' | 'PRICE_RATIO' | 'WEIGHTED_RATIO';
    value: number;
    isTrailing?: boolean;
    trailingDeltaValue?: number;
    trailingActivationValue?: number;
}

export interface PearPosition {
    positionId: string;
    longAssets: PearAssetAllocation[];
    shortAssets: PearAssetAllocation[];
    entryRatio: number;
    markRatio: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
    leverage: number;
    marginUsed: number;
    usdValue: number;
    stopLoss?: PearRiskParameter;
    takeProfit?: PearRiskParameter;
    status: string;
    createdAt: number;
}

export interface PearOrder {
    orderId: string;
    orderType: string;
    status: string;
    longAssets: PearAssetAllocation[];
    shortAssets: PearAssetAllocation[];
    usdValue: number;
    leverage: number;
    parameters?: Record<string, unknown>;
    createdAt: number;
}

export type PearExecutionType = 'SYNC' | 'MARKET' | 'TRIGGER' | 'TWAP' | 'LADDER' | 'TP' | 'SL' | 'SPOT_MARKET' | 'SPOT_LIMIT' | 'SPOT_TWAP';
export type PearTriggerType = 'PRICE' | 'PRICE_RATIO' | 'WEIGHTED_RATIO' | 'BTC_DOM' | 'CROSS_ASSET_PRICE' | 'PREDICTION_MARKET_OUTCOME';
export type PearTriggerDirection = 'MORE_THAN' | 'LESS_THAN';

export interface PearCreatePositionRequest {
    slippage: number;
    executionType: PearExecutionType;
    leverage: number;
    usdValue: number;
    longAssets: PearAssetAllocation[];
    shortAssets: PearAssetAllocation[];
    // Trigger fields
    triggerType?: PearTriggerType;
    triggerValue?: number;
    direction?: PearTriggerDirection;
    assetName?: string;       // for CROSS_ASSET_PRICE trigger
    marketCode?: string;      // for PREDICTION_MARKET_OUTCOME trigger
    // TWAP fields
    twapDuration?: number;           // minutes
    twapIntervalSeconds?: number;    // seconds between chunks
    randomizeExecution?: boolean;
    // Ladder fields
    ladderConfig?: Record<string, unknown>;
    // Risk management
    stopLoss?: PearRiskParameter;
    takeProfit?: PearRiskParameter;
    // Referral
    referralCode?: string;
}

export interface PearAuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}

export interface PearAgentWallet {
    agentWalletAddress: string;
    status: string;
}
