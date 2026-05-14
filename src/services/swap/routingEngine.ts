import { SideShiftProvider, UnifiedShiftResponse } from './sideshift';
import { LiFiProvider, LiFiQuote } from './lifi';
import { SideShiftQuote } from './sideshift/types';
import { TokenService } from '@/lib/tokenService';
import { PlaceholderAddressService } from '@/lib/placeholderAddresses';
import { ChainMappingService } from '@/lib/chains/chainMapping';
import { QuoteValidator } from './quoteValidator';
import { QuoteCacheManager } from './quoteCacheManager';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';

export interface UnifiedQuote {
  id: string;
  provider: 'sideshift' | 'lifi';
  actualProvider?: string; // The actual provider name (e.g., "1inch", "Uniswap", etc.)
  actualProviderLogo?: string; // Logo URL for the actual provider
  outputAmount: string;
  fees: {
    total: string;
  };
  estimatedTime: number;
  rawQuote: any;
  transactionRequest?: any; // For LiFi - contains transaction data
  chainId: string | number;
  // SideShift specific fields (for display purposes)
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

export class RoutingEngine {
  private sideShiftProvider: SideShiftProvider;
  private liFiProvider: LiFiProvider;

  constructor() {
    this.sideShiftProvider = new SideShiftProvider();
    this.liFiProvider = new LiFiProvider();
  }

  async getAggregatedQuotes(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string,
    fromDecimals: number,
    toAddress?: string,
    fromTokenInfo?: any,
    toTokenInfo?: any
  ): Promise<{ quotes: UnifiedQuote[], providerErrors: Record<string, string> }> {
    // Convert chain IDs to appropriate format for token lookup
    const fromChainId = isNaN(Number(fromChain)) ? fromChain : Number(fromChain);
    const toChainId = isNaN(Number(toChain)) ? toChain : Number(toChain);
    
    // Use provided token info or fallback to TokenService lookup
    let actualFromTokenInfo = fromTokenInfo;
    let actualToTokenInfo = toTokenInfo;
    
    // Only initialize TokenService if token info is not provided
    if (!actualFromTokenInfo || !actualToTokenInfo) {
      await TokenService.init();
      actualFromTokenInfo = actualFromTokenInfo || TokenService.getToken(fromChainId, fromToken);
      actualToTokenInfo = actualToTokenInfo || TokenService.getToken(toChainId, toToken);
    }
    
    // Collect all quote promises with provider names and timeouts
    const quotePromises: Array<{ provider: string, promise: Promise<UnifiedQuote | UnifiedQuote[] | null> }> = [];
    const PROVIDER_TIMEOUT = 10000; // 10 second timeout per provider - optimized for V4 interface speed

    // Create timeout wrapper function
    const withTimeout = <T>(promise: Promise<T>, timeout: number, providerName: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`${providerName} timeout after ${timeout}ms`)), timeout)
        )
      ]);
    };

    // Map chain IDs to SideShift network names using ChainMappingService
    const depositNetwork = ChainMappingService.lifiToSideShift(fromChainId);
    const settleNetwork = ChainMappingService.lifiToSideShift(toChainId);

    // Start both providers concurrently
    quotePromises.push({
      provider: 'lifi',
      promise: withTimeout(
        this.getLiFiQuotes(fromChain, toChain, fromToken, toToken, amount, preference, fromAddress, toAddress),
        PROVIDER_TIMEOUT,
        'LiFi'
      )
    });

    // Add SideShift if chains are supported and we have a destination address
    if (depositNetwork && settleNetwork && toAddress) {
      quotePromises.push({
        provider: 'sideshift',
        promise: withTimeout(
          this.getSideShiftQuote(
            fromChain, 
            toChain, 
            fromToken, 
            toToken, 
            amount, 
            fromDecimals, 
            toAddress,
            actualFromTokenInfo,
            actualToTokenInfo
          ),
          PROVIDER_TIMEOUT,
          'SideShift'
        )
      });
    }

    console.log(`[RoutingEngine] Starting ${quotePromises.length} provider requests concurrently...`);

    // Execute all quote requests with LiFi having a head start
    const results = await Promise.allSettled(quotePromises.map(p => p.promise));
    const providerErrors: Record<string, string> = {};
    
    // Process results and collect errors
    const rawQuotes: UnifiedQuote[] = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const providerName = quotePromises[i].provider;
      
      if (result.status === 'fulfilled' && result.value !== null) {
        // Handle both single quote and array of quotes
        const quotes = Array.isArray(result.value) ? result.value : [result.value];
        
        for (const quote of quotes) {
          // Pre-filter quotes with zero or invalid output amounts
          const outputAmount = parseFloat(quote.outputAmount || '0');
          if (outputAmount <= 0) {
            logger.debug({
              message: 'Filtering out quote with zero or invalid output amount',
              quoteId: quote.id,
              provider: quote.provider,
              outputAmount: quote.outputAmount
            });
          } else {
            rawQuotes.push(quote);
          }
        }
        
        if (quotes.length === 0 || rawQuotes.length === 0) {
          providerErrors[providerName] = 'No valid quotes returned';
        }
      } else if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        providerErrors[providerName] = errorMessage;
        logger.warn({
          message: `Provider ${providerName} failed to return quote`,
          error: errorMessage,
          timeout: errorMessage.includes('timeout')
        });
      } else {
        providerErrors[providerName] = 'No quote returned';
      }
    }

    // Validate and sanitize all quotes
    const { validQuotes, invalidQuotes } = QuoteValidator.validateAndSanitizeBatch(rawQuotes);
    
    if (invalidQuotes.length > 0) {
      logger.warn({ 
        invalidCount: invalidQuotes.length,
        invalidQuotes: invalidQuotes.map(q => ({ 
          id: q.quote.id, 
          provider: q.quote.provider, 
          errors: q.errors 
        }))
      }, 'Some quotes failed validation');
    }

    // Additional deduplication step to catch any remaining duplicates
    // This is especially important for LiFi quotes that might have different IDs but same provider/output
    const uniqueQuotes = new Map<string, any>();
    const deduplicatedQuotes = [];
    
    for (const quote of validQuotes) {
      const actualProvider = quote.actualProvider || quote.provider;
      const outputAmount = parseFloat(quote.outputAmount || '0');
      const estimatedTime = quote.estimatedTime || 0;
      
      // Create a more lenient unique key for final deduplication
      const uniqueKey = `${actualProvider}_${outputAmount.toFixed(4)}_${Math.round(estimatedTime / 30) * 30}`; // Round time to nearest 30s
      
      if (!uniqueQuotes.has(uniqueKey)) {
        uniqueQuotes.set(uniqueKey, quote);
        deduplicatedQuotes.push(quote);
      } else {
        logger.debug(`Filtering duplicate quote from ${actualProvider} in routing engine`);
      }
    }
    
    logger.info(`Deduplication: ${validQuotes.length} -> ${deduplicatedQuotes.length} unique quotes`);
    const finalQuotes = deduplicatedQuotes;

    // Enhanced sorting based on preference with multiple criteria for better ranking
    finalQuotes.sort((a, b) => {
      if (preference === 'fastest') {
        // Primary: Sort by estimated time
        const timeDiff = a.estimatedTime - b.estimatedTime;
        // Secondary: If times are similar (within 60 seconds), prefer better output amount
        if (Math.abs(timeDiff) <= 60) {
          return parseFloat(b.outputAmount) - parseFloat(a.outputAmount);
        }
        return timeDiff;
      } else {
        // Primary: Sort by highest output amount (better rate)
        const outputDiff = parseFloat(b.outputAmount) - parseFloat(a.outputAmount);
        // Secondary: If output amounts are similar (within 1%), prefer faster time
        const outputRatio = Math.abs(outputDiff) / parseFloat(a.outputAmount);
        if (outputRatio <= 0.01) {
          return a.estimatedTime - b.estimatedTime;
        }
        return outputDiff;
      }
    });

    // Limit to top 3 quotes for clean frontend display
    const topQuotes = finalQuotes.slice(0, 3);

    // Cache individual quotes for later retrieval (non-blocking)
    if (topQuotes.length > 0) {
      QuoteCacheManager.batchCacheUnifiedQuotes(topQuotes).catch(error => {
        logger.error({ error }, 'Failed to batch cache unified quotes');
      });
    }

    return { quotes: topQuotes, providerErrors };
  }

  // Legacy method for backward compatibility
  async getBestQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string = '0xA5BD439c4d4Fc7cA8B14A9FE77fd5C4FFd7e4996',
    fromDecimals: number,
    toAddress?: string,
    quoteType: 'fixed' | 'variable' = 'variable'
  ): Promise<UnifiedQuote> {
    const result = await this.getAggregatedQuotes(
      fromChain, toChain, fromToken, toToken, amount, preference, 
      fromAddress, fromDecimals, toAddress
    );
    
    if (result.quotes.length === 0) {
      throw new Error('ROUTE_NOT_SUPPORTED');
    }
    
    return result.quotes[0]; // Return the best quote
  }

  /**
   * Converts wei amount to human-readable format using BigInt for precision
   * This handles scientific notation by first converting to a full integer string
   */
  private convertWeiToHumanReadable(weiAmount: string, decimals: number): string {
    console.log('[SideShift] convertWeiToHumanReadable - Input:', { weiAmount, decimals });
    
    try {
      // Handle null/undefined/empty inputs
      if (!weiAmount || weiAmount === '0') {
        return '0';
      }
      
      const weiAmountStr = String(weiAmount).trim();
      
      // Handle scientific notation by converting to full integer string
      const scientificNotationRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
      const scientificMatch = weiAmountStr.match(scientificNotationRegex);
      let weiDecimalString = weiAmountStr;
      
      if (scientificMatch) {
        console.log('[SideShift] Scientific notation detected:', scientificMatch);
        weiDecimalString = this.convertScientificToDecimal(scientificMatch[1], parseInt(scientificMatch[2], 10));
        console.log('[SideShift] Scientific conversion result:', weiDecimalString);
      }

      // Remove leading zeros and ensure it's a valid integer
      weiDecimalString = weiDecimalString.replace(/^0+/, '') || '0';
      
      // For zero decimals, return the integer part directly
      if (decimals === 0) {
        return weiDecimalString;
      }
      
      // Convert to BigInt for precise division
      const bigIntValue = BigInt(weiDecimalString);
      const divisor = BigInt('1' + '0'.repeat(decimals));
      
      const quotient = bigIntValue / divisor;
      const remainder = bigIntValue % divisor;
      
      // Format the fractional part with proper padding and trailing zero removal
      if (remainder === BigInt(0)) {
        return quotient.toString();
      }
      
      let fractionalPart = remainder.toString().padStart(decimals, '0');
      fractionalPart = fractionalPart.replace(/0+$/, '');
      
      return `${quotient.toString()}.${fractionalPart}`;
    } catch (error) {
      console.error('[SideShift] convertWeiToHumanReadable error:', error);
      throw new Error(`Failed to convert wei amount: ${weiAmount}`);
    }
  }

  /**
   * Converts scientific notation to decimal string
   * Same logic as LiFi but for SideShift context
   */
  private convertScientificToDecimal(mantissa: string, exponent: number): string {
    console.log('[SideShift] convertScientificToDecimal - Input:', { mantissa, exponent });
    
    // Remove any leading + sign from mantissa
    const cleanMantissa = mantissa.replace(/^\+/, '');
    
    // Handle negative exponents (very small numbers)
    if (exponent < 0) {
      // For negative exponents, we need to create a very small decimal number
      const totalDecimalPlaces = Math.abs(exponent);
      const parts = cleanMantissa.split('.');
      const integerPart = parts[0] || '0';
      const decimalPart = parts[1] || '';
      
      // Combine all digits without decimal point
      const allDigits = integerPart + decimalPart;
      
      // Create the result with proper decimal places
      const zerosToAdd = totalDecimalPlaces - allDigits.length + 1;
      if (zerosToAdd > 0) {
        const result = '0.' + '0'.repeat(zerosToAdd) + allDigits;
        console.log('[SideShift] Negative exponent result:', result);
        return result;
      } else {
        // No additional zeros needed
        const result = '0.' + allDigits;
        console.log('[SideShift] Negative exponent result (no extra zeros):', result);
        return result;
      }
    }
    
    // Handle positive exponents (large numbers)
    const parts = cleanMantissa.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    
    // Build the result string
    let result = integerPart + decimalPart;
    
    // Add zeros if needed
    const zerosToAdd = exponent - decimalPart.length;
    if (zerosToAdd > 0) {
      result += '0'.repeat(zerosToAdd);
    } else if (zerosToAdd < 0) {
      // Need to place decimal point in the middle
      const decimalPosition = result.length + zerosToAdd;
      if (decimalPosition > 0) {
        result = result.slice(0, decimalPosition) + '.' + result.slice(decimalPosition);
      } else {
        result = '0.' + '0'.repeat(-decimalPosition) + result;
      }
    }
    
    // Remove leading zeros but keep at least one digit
    result = result.replace(/^0+/, '') || '0';
    
    console.log('[SideShift] convertScientificToDecimal - Final result:', result);
    return result;
  }

  /**
   * Get SideShift quote only (not shift) during quote phase
   * This follows the 2-step process: 1) Get quote, 2) Create shift during swap
   */
  private async getSideShiftQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    fromDecimals: number,
    settleAddress: string,
    fromTokenInfo?: any,
    toTokenInfo?: any
  ): Promise<UnifiedQuote | null> {
    try {
      const fromChainId = isNaN(Number(fromChain)) ? fromChain : Number(fromChain);
      const toChainId = isNaN(Number(toChain)) ? toChain : Number(toChain);

      console.log('[SideShift] getSideShiftQuote - Starting with:', {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        fromDecimals,
        settleAddress
      });

      // Use provided token info or fallback to TokenService lookup
      let actualFromTokenInfo = fromTokenInfo;
      let actualToTokenInfo = toTokenInfo;
      
      // Only call TokenService if token info is not provided
      if (!actualFromTokenInfo || !actualToTokenInfo) {
        await TokenService.init();
        actualFromTokenInfo = actualFromTokenInfo || TokenService.getToken(fromChainId, fromToken);
        actualToTokenInfo = actualToTokenInfo || TokenService.getToken(toChainId, toToken);
      }
      
      if (!actualFromTokenInfo || !actualToTokenInfo) {
        console.log('[SideShift] Missing token info:', { actualFromTokenInfo, actualToTokenInfo });
        return null;
      }
      
      const depositCoin = actualFromTokenInfo.symbol.toLowerCase();
      const settleCoin = actualToTokenInfo.symbol.toLowerCase();
      
      console.log('[SideShift] Token mapping:', { depositCoin, settleCoin });
      
      // Convert amount from wei to human-readable for SideShift using robust converter
      const amountHumanReadable = this.convertWeiToHumanReadable(amount, fromDecimals);
      const amountNumber = parseFloat(amountHumanReadable);
      
      console.log('[SideShift] Amount conversion:', {
        originalWei: amount,
        decimals: fromDecimals,
        humanReadable: amountHumanReadable,
        parsed: amountNumber
      });
      
      if (amountNumber <= 0) {
        console.log('[SideShift] Invalid amount:', amountNumber);
        return null;
      }
      
      // Map chain IDs to SideShift network names using ChainMappingService
      const depositNetwork = ChainMappingService.lifiToSideShift(fromChainId);
      const settleNetwork = ChainMappingService.lifiToSideShift(toChainId);

      if (!depositNetwork || !settleNetwork) {
        return null;
      }

      // Get quote directly - let SideShift handle limit validation
      const quote = await this.sideShiftProvider.createQuote(
        depositCoin,
        settleCoin,
        amountHumanReadable,
        null,
        depositNetwork,
        settleNetwork
      );

      // Validate quote has valid settle amount
      if (!quote.settleAmount || parseFloat(quote.settleAmount) <= 0) {
        return null;
      }

      // Create unified quote object (no transaction request for SideShift)
      const unifiedQuote: UnifiedQuote = {
        id: uuidv4(), // Generate unique ID for caching
        provider: 'sideshift',
        actualProvider: 'SideShift',
        actualProviderLogo: '/sideshift.jpg',
        outputAmount: quote.settleAmount,
        fees: {
          total: '0' // SideShift fees are included in the rate
        },
        estimatedTime: 900, // 15 minutes for fixed quotes
        rawQuote: quote, // Store the SideShift quote for later shift creation
        transactionRequest: null, // No transaction request - SideShift uses deposit address
        chainId: fromChainId,
        // Store quote details for display
        depositCoin: quote.depositCoin,
        depositNetwork: quote.depositNetwork,
        depositAmount: quote.depositAmount,
        settleCoin: quote.settleCoin,
        settleNetwork: quote.settleNetwork,
        settleAmount: quote.settleAmount,
        expiresAt: quote.expiresAt,
        type: "fixed"
      };
      
      return unifiedQuote;
    } catch (error) {
      return null;
    }
  }

  private async getLiFiQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string,
    toAddress?: string
  ): Promise<UnifiedQuote | null> {
    try {
      // ENHANCED LOGGING: RoutingEngine LiFi call start
      console.log('[RoutingEngine] getLiFiQuote - Starting LiFi quote request:', {
        timestamp: new Date().toISOString(),
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        preference,
        fromAddress,
        toAddress,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL,
          vercelEnv: process.env.VERCEL_ENV
        }
      });

      // Convert chain IDs to proper format for LiFi, preserving large numbers
      // Don't use parseInt() as it can lose precision for very large chain IDs like Solana (1151111081099710)
      const fromChainId = fromChain;
      const toChainId = toChain;
      
      console.log('[RoutingEngine] getLiFiQuote - Chain ID handling:', {
        originalFromChain: fromChain,
        originalToChain: toChain,
        fromChainId,
        toChainId
      });
      
      // Use appropriate placeholder address based on chain type if needed
      let validFromAddress = fromAddress;
      
      // Check if we need to use a placeholder address
      const needsPlaceholder = fromAddress === '0x0000000000000000000000000000000000000000' ||
                              PlaceholderAddressService.isPlaceholderAddress(fromAddress);
      
      if (needsPlaceholder) {
        validFromAddress = PlaceholderAddressService.getPlaceholderAddress(fromChainId);
      }
      
      // Use appropriate placeholder address for toAddress if needed
      let validToAddress = toAddress;
      if (!toAddress || PlaceholderAddressService.isPlaceholderAddress(toAddress)) {
        validToAddress = PlaceholderAddressService.getPlaceholderAddress(toChainId);
      }
      
      console.log('[RoutingEngine] getLiFiQuote - Calling LiFi provider with:', {
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        preference,
        validFromAddress,
        validToAddress,
        timestamp: new Date().toISOString()
      });

      const quote = await this.liFiProvider.getQuote(
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        preference,
        validFromAddress,
        validToAddress,
        true // isPreviewMode = true for quotes
      );

      console.log('[RoutingEngine] getLiFiQuote - LiFi provider returned quote:', {
        quoteId: quote?.id,
        toAmount: quote?.toAmount,
        estimatedTime: quote?.estimatedTime,
        hasTransactionRequest: !!quote?.transactionRequest,
        timestamp: new Date().toISOString()
      });
      
      // Extract actual provider information from the raw quote
      let actualProvider = 'LiFi';
      let actualProviderLogo = '';
      
      if (quote.rawQuote?.toolDetails) {
        actualProvider = quote.rawQuote.toolDetails.name || 'LiFi';
        actualProviderLogo = quote.rawQuote.toolDetails.logoURI || '';
      }

      const unifiedQuote: UnifiedQuote = {
        id: uuidv4(), // Generate unique ID for caching
        provider: 'lifi',
        actualProvider,
        actualProviderLogo,
        outputAmount: quote.toAmount,
        fees: {
          total: quote.fees.total
        },
        estimatedTime: quote.estimatedTime,
        rawQuote: quote, // This is already the processed LiFi quote
        transactionRequest: quote.transactionRequest,
        chainId: quote.fromChainId
      };

      console.log('[RoutingEngine] getLiFiQuote - Created unified quote:', {
        id: unifiedQuote.id,
        provider: unifiedQuote.provider,
        actualProvider: unifiedQuote.actualProvider,
        outputAmount: unifiedQuote.outputAmount,
        estimatedTime: unifiedQuote.estimatedTime,
        timestamp: new Date().toISOString()
      });

      return unifiedQuote;
    } catch (error) {
      // ENHANCED LOGGING: RoutingEngine LiFi error
      console.error('[RoutingEngine] getLiFiQuote - LiFi quote failed:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        preference,
        fromAddress,
        toAddress,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  private async getLiFiQuotes(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string,
    toAddress?: string
  ): Promise<UnifiedQuote[] | null> {
    try {
      console.log('[RoutingEngine] getLiFiQuotes - Starting multiple LiFi quotes request:', {
        timestamp: new Date().toISOString(),
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        preference,
        fromAddress,
        toAddress
      });

      const fromChainId = fromChain;
      const toChainId = toChain;
      
      // Use appropriate placeholder address based on chain type if needed
      let validFromAddress = fromAddress;
      
      const needsPlaceholder = fromAddress === '0x0000000000000000000000000000000000000000' ||
                              PlaceholderAddressService.isPlaceholderAddress(fromAddress);
      
      if (needsPlaceholder) {
        validFromAddress = PlaceholderAddressService.getPlaceholderAddress(fromChainId);
      }
      
      let validToAddress = toAddress;
      if (!toAddress || PlaceholderAddressService.isPlaceholderAddress(toAddress)) {
        validToAddress = PlaceholderAddressService.getPlaceholderAddress(toChainId);
      }
      
      console.log('[RoutingEngine] getLiFiQuotes - Calling LiFi provider with:', {
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        preference,
        validFromAddress,
        validToAddress
      });

      const quotes = await this.liFiProvider.getMultipleQuotes(
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        preference,
        validFromAddress,
        validToAddress
      );

      console.log('[RoutingEngine] getLiFiQuotes - LiFi provider returned quotes:', {
        count: quotes.length,
        quotes: quotes.map(q => ({
          id: q.id,
          toAmount: q.toAmount,
          estimatedTime: q.estimatedTime
        }))
      });
      
      // Convert LiFi quotes to unified quotes
      const unifiedQuotes: UnifiedQuote[] = [];
      
      for (const quote of quotes) {
        // Extract actual provider information from the raw quote
        let actualProvider = 'LiFi';
        let actualProviderLogo = '';
        
        if (quote.rawQuote?.toolDetails) {
          actualProvider = quote.rawQuote.toolDetails.name || 'LiFi';
          actualProviderLogo = quote.rawQuote.toolDetails.logoURI || '';
        }

        const unifiedQuote: UnifiedQuote = {
          id: uuidv4(), // Generate unique ID for caching
          provider: 'lifi',
          actualProvider,
          actualProviderLogo,
          outputAmount: quote.toAmount,
          fees: {
            total: quote.fees.total
          },
          estimatedTime: quote.estimatedTime,
          rawQuote: quote,
          transactionRequest: quote.transactionRequest,
          chainId: quote.fromChainId
        };

        unifiedQuotes.push(unifiedQuote);
      }

      console.log('[RoutingEngine] getLiFiQuotes - Created unified quotes:', {
        count: unifiedQuotes.length,
        quotes: unifiedQuotes.map(q => ({
          id: q.id,
          provider: q.provider,
          actualProvider: q.actualProvider,
          outputAmount: q.outputAmount,
          estimatedTime: q.estimatedTime
        }))
      });

      return unifiedQuotes;
    } catch (error) {
      console.error('[RoutingEngine] getLiFiQuotes - Multiple LiFi quotes failed:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        preference,
        fromAddress,
        toAddress
      });
      return null;
    }
  }
}
