import { useState, useEffect } from 'react';
import { parseTransactionError, TransactionError } from '@/lib/errors/transactionErrors';
import { QuoteResult } from '@/lib/hooks/useImprovedAutoQuote';
import { StandardizedAsset } from '@/types/asset';

type SwapParams = {
  quote: QuoteResult;
  fromToken: StandardizedAsset;
  toToken: StandardizedAsset;
  fromAmount: string;
  fromAddress: string;
  settleAddress: string;
  refundAddress?: string;
  clientId?: string;
  preference?: 'fastest' | 'lowest_cost';
  walletId: string;
};

type SwapResult = {
  transactionId: string;
  provider: string;
  type?: string;
  // For transaction-based swaps (LiFi, etc.)
  transactionRequest?: any;
  chainId?: string;
  txHash?: string;
  // For SideShift deposit-based swaps
  shiftId?: string;
  depositAddress?: string;
  depositMemo?: string;
  expiresAt?: string;
  requiresSigning?: boolean; // Indicates if transaction signing is required
};

export const useSwap = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TransactionError | null>(null);
  const [walletAdapter, setWalletAdapter] = useState<any>(null);

  // Dynamic import of wallet adapter on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/wallets').then((module) => {
        setWalletAdapter(module.walletAdapter);
      });
    }
  }, []);

  const clearError = () => {
    setError(null);
  };

  const executeSwap = async (params: SwapParams): Promise<SwapResult> => {
    setLoading(true);
    try {
      // Construct the request body based on the provider
      const requestBody: any = {
        provider: params.quote.provider,
        settleAddress: params.settleAddress,
        refundAddress: params.refundAddress,
        clientId: params.clientId || 'hyperswap-web',
        preference: params.preference || 'fastest',
      };

      if (params.quote.provider === 'lifi') {
        const fromAmountWei = (parseFloat(params.fromAmount) * Math.pow(10, params.fromToken.decimals)).toString();
        requestBody.fromChain = params.fromToken.chainId;
        requestBody.toChain = params.toToken.chainId;
        requestBody.fromToken = params.fromToken.address;
        requestBody.toToken = params.toToken.address;
        requestBody.fromAmount = fromAmountWei;
        requestBody.fromAddress = params.fromAddress;
        requestBody.toAddress = params.settleAddress;
        requestBody.fromDecimals = params.fromToken.decimals;
        requestBody.toDecimals = params.toToken.decimals;
      } else {
        // For SideShift and others, use the quoteId
        requestBody.quoteId = params.quote.quoteId;
      }

      // Step 1: Call the swap API to get transaction data or deposit info
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Use client ID if provided for widget authentication, otherwise use internal API key
      if (params.clientId) {
        headers['x-client-id'] = params.clientId;
      } else {
        headers['x-api-key'] = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '';
      }

      const response = await fetch('/api/v1/swap', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Swap request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Step 2: Handle different swap types based on requiresSigning flag
      if (data.requiresSigning === false) {
        // For non-signing swaps like SideShift, return the deposit information directly
        return {
          transactionId: data.transactionId,
          provider: data.provider,
          type: data.type,
          shiftId: data.shiftId,
          depositAddress: data.depositAddress,
          depositMemo: data.depositMemo,
          expiresAt: data.expiresAt
        };
      } else {
        // For transaction-based providers that require signing
        if (data.transactionRequest && data.chainId && walletAdapter) {
          console.log('Setting up transaction for wallet execution:', {
            provider: data.provider,
            chainId: data.chainId,
            transactionRequest: data.transactionRequest
          });
          
          // Handle different transaction types
          const txType = data.transactionRequest.type || 'evm';
          let quoteData: any;
          
          if (txType === 'solana') {
            // Solana transactions only have data field
            if (!data.transactionRequest.data) {
              throw new Error('Solana transaction request missing "data" field');
            }
            
            quoteData = {
              integrator: "hyperswap-ai",
              transactionRequest: {
                data: data.transactionRequest.data,
                type: 'solana'
              }
            };
          } else if (txType === 'bitcoin') {
            // Bitcoin transactions have to, value, and optional data (memo)
            if (!data.transactionRequest.to || !data.transactionRequest.value) {
              throw new Error('Bitcoin transaction request missing required fields');
            }
            
            quoteData = {
              integrator: "hyperswap-ai",
              transactionRequest: {
                to: data.transactionRequest.to,
                data: data.transactionRequest.data || '',
                value: data.transactionRequest.value,
                type: 'bitcoin'
              }
            };
          } else {
            // EVM transactions
            if (!data.transactionRequest.to) {
              throw new Error('Transaction request missing "to" address');
            }
            
            if (!data.transactionRequest.data) {
              throw new Error('Transaction request missing "data" field');
            }
            
            quoteData = {
              integrator: "hyperswap-ai",
              transactionRequest: {
                to: data.transactionRequest.to,
                data: data.transactionRequest.data,
                value: data.transactionRequest.value || "0x0",
                from: data.transactionRequest.from,
                chainId: data.chainId,
                gasPrice: data.transactionRequest.gasPrice,
                gasLimit: data.transactionRequest.gasLimit || data.transactionRequest.gas,
                type: 'evm'
              }
            };
          }
          
          console.log('Setting quote data for wallet adapter:', quoteData);
          walletAdapter.setQuote(quoteData);
          
          // Step 3: Execute the transaction through the wallet
          console.log('Executing transaction through wallet adapter...');
          const txHash = await walletAdapter.executeTransaction();
          console.log('Transaction executed successfully:', txHash);
          
          return {
            transactionId: data.transactionId,
            provider: data.provider,
            transactionRequest: data.transactionRequest,
            chainId: data.chainId,
            txHash,
            requiresSigning: true
          };
        } else if (!walletAdapter) {
          throw new Error('Wallet adapter not loaded');
        } else {
          console.error('Invalid transaction data received:', {
            hasTransactionRequest: !!data.transactionRequest,
            hasChainId: !!data.chainId,
            transactionRequest: data.transactionRequest,
            chainId: data.chainId
          });
          throw new Error('Invalid transaction data received from server');
        }
      }
    } catch (err) {
      // Parse the error to get user-friendly information
      const parsedError = parseTransactionError(err);
      setError(parsedError);
      
      // Re-throw the original error for upstream handling
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { executeSwap, loading, error, clearError };
};
