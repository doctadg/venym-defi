'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { StandardizedAsset } from '@/types/asset';
import { OnramperQuote } from '@/services/swap/providers/onramper';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

type UIState = 
  | 'none' 
  | 'from' 
  | 'to' 
  | 'settings' 
  | 'bridges' 
  | 'exchanges' 
  | 'review-sideshift' 
  | 'review-lifi' 
  | 'pending-sideshift' 
  | 'pending-lifi' 
  | 'success'
  | 'fiat-selection'
  | 'payment-method'
  | 'onramp-review'
  | 'onramp-pending'
  | 'onramp-success'
  | 'offramp-review'
  | 'offramp-pending'
  | 'offramp-success';

interface SettingContextType {
  // Mode state
  swapMode: 'swap' | 'buy' | 'sell';
  
  // Token and chain state
  fromToken: StandardizedAsset | null;
  toToken: StandardizedAsset | null;
  fromChain: any | null;
  toChain: any | null;
  
  // Fiat state (for buy/sell modes)
  fiatCurrency: string;
  paymentMethod: string;
  
  // Geolocation state
  userCountry: string;
  userCountryCode: string;
  geolocationLoading: boolean;
  
  // Amount and address
  amount: string;
  toAddress: string;
  
  // Settings
  routePriority: 'Best Return' | 'Fastest';
  gasPrice: 'Slow' | 'Normal' | 'Fast';
  slippage: string;
  selectedBridges: string[];
  selectedExchanges: string[];
  
  // Onramper state
  onramperQuotes: OnramperQuote[];
  selectedOnramperQuote: OnramperQuote | null;
  
  // UI state
  isChange: UIState;
  
  // Setters
  setSwapMode: (mode: 'swap' | 'buy' | 'sell') => void;
  setFromToken: (token: StandardizedAsset | null) => void;
  setToToken: (token: StandardizedAsset | null) => void;
  setFromChain: (chain: any) => void;
  setToChain: (chain: any) => void;
  setFiatCurrency: (currency: string) => void;
  setPaymentMethod: (method: string) => void;
  setAmount: (amount: string) => void;
  setToAddress: (address: string) => void;
  setRoutePriority: (priority: 'Best Return' | 'Fastest') => void;
  setGasPrice: (price: 'Slow' | 'Normal' | 'Fast') => void;
  setSlippage: (slippage: string) => void;
  setSelectedBridges: (bridges: string[]) => void;
  setSelectedExchanges: (exchanges: string[]) => void;
  setOnramperQuotes: (quotes: OnramperQuote[]) => void;
  setSelectedOnramperQuote: (quote: OnramperQuote | null) => void;
  setIsChange: (change: UIState) => void;
  
  // Helper methods
  handleChange: (chain: any, token: StandardizedAsset) => void;
}

const SettingContext = createContext<SettingContextType | undefined>(undefined);

export const useSetting = () => {
  const context = useContext(SettingContext);
  if (!context) {
    throw new Error('useSetting must be used within a SettingProvider');
  }
  return context;
};

interface SettingProviderProps {
  children: ReactNode;
}

export function SettingProvider({ children }: SettingProviderProps) {
  // Geolocation hook to get user's location
  const { data: geolocationData, loading: geolocationLoading } = useGeolocation();
  
  // Mode state
  const [swapMode, setSwapMode] = useState<'swap' | 'buy' | 'sell'>('swap');
  
  // Token and chain state
  const [fromToken, setFromToken] = useState<StandardizedAsset | null>(null);
  const [toToken, setToToken] = useState<StandardizedAsset | null>(null);
  const [fromChain, setFromChain] = useState<any | null>(null);
  const [toChain, setToChain] = useState<any | null>(null);
  
  // Fiat state - will be updated with geolocation data
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Amount and address
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  
  // Settings
  const [routePriority, setRoutePriority] = useState<'Best Return' | 'Fastest'>('Best Return');
  const [gasPrice, setGasPrice] = useState<'Slow' | 'Normal' | 'Fast'>('Normal');
  const [slippage, setSlippage] = useState('Auto');
  const [selectedBridges, setSelectedBridges] = useState<string[]>([]);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  
  // Onramper state
  const [onramperQuotes, setOnramperQuotes] = useState<OnramperQuote[]>([]);
  const [selectedOnramperQuote, setSelectedOnramperQuote] = useState<OnramperQuote | null>(null);
  
  // UI state
  const [isChange, setIsChange] = useState<UIState>('none');
  
  // Update fiat currency when geolocation data is available
  // Note: P2P flows (zkp2p) now handle their own currency selection and don't use this auto-detection
  useEffect(() => {
    if (geolocationData && geolocationData.currency && fiatCurrency === 'USD') {
      // Only update if still using default USD and we have geolocation data
      // This affects buy/sell modes but not P2P onramp/offramp flows
      setFiatCurrency(geolocationData.currency);
      console.log(`🌍 Auto-detected currency: ${geolocationData.currency} for ${geolocationData.country} (affects buy/sell only, not P2P)`);
    }
  }, [geolocationData, fiatCurrency]);
  
  // Helper method to handle token selection
  const handleChange = useCallback((chain: any, token: StandardizedAsset) => {
    if (isChange === 'from') {
      setFromChain(chain);
      setFromToken(token);
    } else if (isChange === 'to') {
      setToChain(chain);
      setToToken(token);
    }
    setIsChange('none');
  }, [isChange]);
  
  const value: SettingContextType = {
    // State
    swapMode,
    fromToken,
    toToken,
    fromChain,
    toChain,
    fiatCurrency,
    paymentMethod,
    userCountry: geolocationData?.country || 'United States',
    userCountryCode: geolocationData?.countryCode || 'US',
    geolocationLoading,
    amount,
    toAddress,
    routePriority,
    gasPrice,
    slippage,
    selectedBridges,
    selectedExchanges,
    onramperQuotes,
    selectedOnramperQuote,
    isChange,
    
    // Setters
    setSwapMode,
    setFromToken,
    setToToken,
    setFromChain,
    setToChain,
    setFiatCurrency,
    setPaymentMethod,
    setAmount,
    setToAddress,
    setRoutePriority,
    setGasPrice,
    setSlippage,
    setSelectedBridges,
    setSelectedExchanges,
    setOnramperQuotes,
    setSelectedOnramperQuote,
    setIsChange,
    
    // Helper methods
    handleChange,
  };
  
  return (
    <SettingContext.Provider value={value}>
      {children}
    </SettingContext.Provider>
  );
}