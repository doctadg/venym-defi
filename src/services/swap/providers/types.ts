/**
 * SideShift API type definitions.
 * Based on SideShift.ai API v2 specification.
 */

export interface SideShiftCoin {
  coin: string;
  name: string;
  networks: SideShiftCoinNetwork[];
  hasDepositNetwork?: boolean;
  icon?: string;
  rate?: number;
  min?: string;
  max?: string;
}

export interface SideShiftCoinNetwork {
  network: string;
  name: string;
  symbol: string;
  icon?: string;
  deposit?: boolean;
  settle?: boolean;
}

export interface SideShiftPair {
  from: string;
  to: string;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string;
  toNetwork: string;
  rate: number;
  min: string;
  max: string;
  depositFee?: string;
  settleFee?: string;
}

export interface SideShiftQuote {
  id: string;
  coinPair: string;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string;
  toNetwork: string;
  depositAmount: string;
  settleAmount: string;
  rate: number;
  expiresAt: string;
  createdAt: string;
}

export type SideShiftShiftStatus =
  | 'waiting'
  | 'depositing'
  | 'processing'
  | 'refunded'
  | 'settled'
  | 'expired'
  | 'awaiting_deposit'
  | 'completed';

export interface SideShiftFixedShift {
  id: string;
  type: 'fixed';
  depositAddress: string;
  depositCoin: string;
  depositNetwork: string;
  depositAmount: string;
  depositMemo?: string;
  settleAddress: string;
  settleCoin: string;
  settleNetwork: string;
  settleAmount: string;
  status: SideShiftShiftStatus;
  createdAt: string;
  expiresAt: string;
  rate: number;
  refundAddress?: string;
  refundMemo?: string;
  [key: string]: unknown;
}

export interface SideShiftVariableShift {
  id: string;
  type: 'variable';
  depositAddress: string;
  depositCoin: string;
  depositNetwork: string;
  settleAddress: string;
  settleCoin: string;
  settleNetwork: string;
  status: SideShiftShiftStatus;
  createdAt: string;
  expiresAt?: string;
  rate: number;
  depositMemo?: string;
  refundAddress?: string;
  refundMemo?: string;
  [key: string]: unknown;
}

export type SideShiftStatus = SideShiftFixedShift | SideShiftVariableShift;
