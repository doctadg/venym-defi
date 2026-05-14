export enum OrderSide {
  LONG = 'Long',
  SHORT = 'Short'
}

export enum OrderType {
  MARKET = 'Market',
  LIMIT = 'Limit',
  STOP_LIMIT = 'Stop Limit'
}

export interface Ticker {
  symbol: string;
  price: string;
  change: string;
  isPositive: boolean;
}

export interface CandleData {
  time: string;
  value: number;
}

export enum AppView {
  TRADE = 'Trade',
  PAIR_TRADING = 'Pair Trading',
  PORTFOLIO = 'Portfolio',
  POINTS = 'Points',
  LEADERBOARD = 'Leaderboard',
  REFERRAL = 'Referral',
  SETTINGS = 'Settings'
}

export interface Trade {
  id: string;
  symbol: string;
  exchange: string;
  price: string;
  size: string;
  side: OrderSide;
  timestamp: number;
}

export interface Position {
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  size: string;
  entryPrice: string;
  markPrice: string;
  liquidationPrice: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: string;
  leverage: number;
  collateral: string;
  margin: string;
  timestamp: number;
  walletAddress: string;
}

export interface Balance {
  asset: string;
  free: string;
  locked?: string;
  total: string;
  crossWalletBalance?: string;
  crossUnPnl?: string;
  maxWithdrawAmount?: string;
}

export interface ExchangeBalance {
  success: boolean;
  exchange: string;
  address: string;
  balances: Balance[];
  withdrawable?: string;
  accountValue?: string;
  accountIndex?: number;
  collateral?: string;
  availableBalance?: string;
  accountType?: string;
}

export interface ServerWalletBalance {
  eth: string;
  usdc: string;
  address: string;
}

export interface HyperliquidBalance {
  usdc: string;
  accountValue: string;
  withdrawable: string;
}

export interface LighterBalance {
  collateral?: string;
  availableBalance?: string;
  totalAssetValue?: string;
}

export interface PacificaBalance {
  availableBalance?: string;
  collateral?: string;
  accountValue?: string;
}

export interface AvantisBalance {
  usdc?: string;
  availableBalance?: string;
}

export interface AggregatedBalance {
  serverWallet: ServerWalletBalance;
  hyperliquid: HyperliquidBalance;
  aster: Balance[];
  lighter?: LighterBalance;
  pacifica?: PacificaBalance;
  avantis?: AvantisBalance;
}

export interface Order {
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'UNKNOWN';
  price: string;
  quantity: string;
  filledQuantity: string;
  averagePrice?: string;
  timestamp: number;
  exchange?: string;
  clientOrderId?: string;
  reduceOnly?: boolean;
  triggerPrice?: string;
}

export interface OpenPositionPayload {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  size: string;
  leverage?: number;
  orderType: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'STOP_LIMIT' | 'MARKET_ZERO_FEE';
  limitPrice?: string;
  /** Current market price — required for Avantis market orders */
  marketPrice?: string;
  preferredExchange?: 'hyperliquid' | 'aster' | 'lighter' | 'pacifica' | 'avantis';
}

export interface DepositPayload {
  fromAddress: string;
  tokenSymbol: string;
  amount: string;
  broker?: number;
  allowanceSignedTx?: string;
  signedDepositTx?: string;
  depositSignedTx?: string;
}

export interface TradeVolumeData {
  userAddress: string;
  platform: "hyperliquid" | "aster" | "lighter" | "avantis" | "pacifica";
  marketId: string;
  side: "buy" | "sell";
  size: string;
  price: string;
  notionalValue: number;
  leverage: number;
  fees: number;
  timestamp: number;
  orderId?: string;
}

export interface RoutingInfo {
  recommended: string;
  price: number;
  reason: string;
  savings: number;
  savingsPercent: number;
  alternatives: {
    [key: string]: {
      price: number;
      available: boolean;
    };
  };
}

export interface TickerData {
  symbol: string;
  logoUrl?: string;
  markPrice?: string;
  oraclePrice?: string;
  lastPrice?: string;
  price24h?: string;
  change24h?: string;
  changePercent24h?: string;
  volume24h?: string;
  openInterest?: string;
  fundingRate?: string;
  fundingCountdown?: string;
  high24h?: string;
  low24h?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  timestamp?: number;
  platform?: string;
  leverage?: number;
  marketType?: 'perpetual' | 'spot';
  availability?: {
    hyperliquid?: boolean;
    aster?: boolean;
    lighter?: boolean;
    pacifica?: boolean;
    avantis?: boolean;
    [key: string]: boolean | undefined;
  };
}
