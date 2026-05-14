/**
 * Stub Onramper provider module.
 * Onramper integration is not yet implemented in venym-defi.
 * This module provides the type stubs needed by SettingProvider.
 */

export interface OnramperQuote {
  id: string;
  provider: string;
  fromCurrency: string;
  toCurrency: string;
  fromNetwork: string;
  toNetwork: string;
  amount: number;
  receiveAmount: number;
  rate: number;
  paymentMethod: string;
  [key: string]: unknown;
}
