import { cache } from '@/lib/cache';

const LIFI_API_URL = "https://li.quest/v1";

export interface LiFiQuote {
  id: string;
  provider: 'lifi';
  fromChainId: string | number;
  toChainId: string | number;
  fromToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
  };
  toToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
  };
  fromAmount: string;
  toAmount: string;
  estimatedTime: number; // in seconds
  fees: {
    providerFee: string;
    networkFee: string;
    total: string;
  };
  transactionRequest: any; // Store transaction request for direct execution
  rawQuote: any; // Store the raw LiFi response for provider extraction
}

export class LiFiProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LIFI_API_KEY || "";
  }

  private async fetchFromApi<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${LIFI_API_URL}${endpoint}`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // ENHANCED LOGGING FOR VERCEL DEBUGGING
    console.log('[LiFi] fetchFromApi - Environment check:', {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString(),
      endpoint,
      fullUrl: url
    });
    
    console.log('[LiFi] fetchFromApi - API Key check:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      apiKeyStart: this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'none',
      envVarExists: !!process.env.LIFI_API_KEY,
      envVarLength: process.env.LIFI_API_KEY ? process.env.LIFI_API_KEY.length : 0
    });
    
    if (this.apiKey) {
      headers.set('x-lifi-api-key', this.apiKey);
    }
    
    console.log('[LiFi] fetchFromApi - Headers before request:', {
      headers: Object.fromEntries(headers.entries()),
      url,
      method: options.method || 'GET'
    });
    
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers.set(key, value);
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers.set(key, value);
        });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    // Increase timeout for Vercel environment to handle cold starts and network latency
    const timeoutMs = process.env.VERCEL ? 12000 : 7000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const requestStartTime = Date.now();
    
    // ENHANCED LOGGING: Log request details
    console.log('[LiFi] fetchFromApi - Making request:', {
      url,
      method: options.method || 'GET',
      hasBody: !!options.body,
      bodyLength: options.body ? JSON.stringify(options.body).length : 0,
      requestHeaders: Object.fromEntries(headers.entries()),
      timeout: timeoutMs,
      startTime: requestStartTime
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const requestDuration = Date.now() - requestStartTime;

      // ENHANCED LOGGING: Log response details
      console.log('[LiFi] fetchFromApi - Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${requestDuration}ms`,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        url: response.url,
        redirected: response.redirected,
        retryAttempt: retryCount
      });

      if (!response.ok) {
        let errorDetails;
        let responseText = '';
        try {
          responseText = await response.text();
          errorDetails = JSON.parse(responseText);
        } catch (parseError) {
          errorDetails = { message: `HTTP ${response.status}: ${response.statusText}` };
          console.log('[LiFi] fetchFromApi - Failed to parse error response:', {
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            responseText: responseText.substring(0, 500) // First 500 chars
          });
        }
        
        // ENHANCED LOGGING: Log error details
        console.error('[LiFi] fetchFromApi - API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          responseText: responseText.substring(0, 1000),
          requestUrl: url,
          requestMethod: options.method || 'GET',
          duration: `${requestDuration}ms`,
          retryAttempt: retryCount
        });
        
        throw new Error(
          `LiFi API error (${response.status}): ${errorDetails.message || errorDetails.error || response.statusText}`
        );
      }

      // ENHANCED LOGGING: Log successful response
      const responseData = await response.json();
      console.log('[LiFi] fetchFromApi - Success:', {
        status: response.status,
        duration: `${requestDuration}ms`,
        hasTransactionRequest: !!responseData.transactionRequest,
        hasEstimate: !!responseData.estimate,
        responseKeys: Object.keys(responseData),
        estimateKeys: responseData.estimate ? Object.keys(responseData.estimate) : [],
        retryAttempt: retryCount
      });

      return responseData;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const requestDuration = Date.now() - requestStartTime;
      
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
      );
      
      // ENHANCED LOGGING: Log all errors with context
      if (isTimeout) {
        console.error('[LiFi] fetchFromApi - Request timeout:', {
          url,
          duration: `${requestDuration}ms`,
          timeout: timeoutMs,
          error: 'Request aborted due to timeout',
          retryAttempt: retryCount
        });
      } else {
        console.error('[LiFi] fetchFromApi - Request failed:', {
          url,
          duration: `${requestDuration}ms`,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorStack: error instanceof Error ? error.stack : 'No stack',
          requestMethod: options.method || 'GET',
          retryAttempt: retryCount
        });
      }
      
      // Retry logic for Vercel environment - only retry timeouts and network errors
      const maxRetries = process.env.VERCEL ? 2 : 0; // Only retry on Vercel
      const shouldRetry = (isTimeout || isNetworkError) && retryCount < maxRetries;
      
      if (shouldRetry) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[LiFi] fetchFromApi - Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`, {
          url,
          error: error instanceof Error ? error.message : String(error),
          isTimeout,
          isNetworkError
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.fetchFromApi(endpoint, options, retryCount + 1);
      }
      
      // If not retrying or max retries reached, throw appropriate error
      if (isTimeout) {
        throw new Error('LiFi API request timeout');
      }
      
      throw error;
    }
  }

  private validateAndCleanAmount(amount: string): string {
    console.log('[LiFi] validateAndCleanAmount - Input:', { amount, type: typeof amount });
    
    // Input validation and sanitization
    if (amount === null || amount === undefined) {
      throw new Error('Amount cannot be null or undefined');
    }
    
    const amountStr = String(amount).trim();
    console.log('[LiFi] validateAndCleanAmount - Sanitized:', amountStr);
    
    if (amountStr === '' || amountStr === '0') {
      throw new Error('Amount cannot be empty or zero');
    }
    
    // Fast path for already valid integer strings
    if (/^\d+$/.test(amountStr)) {
      const cleaned = amountStr.replace(/^0+/, '') || '0';
      console.log('[LiFi] validateAndCleanAmount - Fast path result:', cleaned);
      return cleaned;
    }
    
    try {
      // Check if it's in scientific notation (e.g., 1e+18, 1.5E-10, 2.5e21)
      const scientificNotationRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
      const scientificMatch = amountStr.match(scientificNotationRegex);
      
      if (scientificMatch) {
        console.log('[LiFi] validateAndCleanAmount - Scientific notation detected:', scientificMatch);
        
        const mantissa = scientificMatch[1];
        const exponent = parseInt(scientificMatch[2], 10);
        
        console.log('[LiFi] validateAndCleanAmount - Parsed:', { mantissa, exponent });
        
        // Convert scientific notation to full decimal string manually
        const result = this.convertScientificToDecimal(mantissa, exponent);
        console.log('[LiFi] validateAndCleanAmount - Scientific conversion result:', result);
        return result;
      }
      
      // Handle decimal numbers (convert to integer by removing decimal part)
      if (amountStr.includes('.')) {
        const decimalMatch = amountStr.match(/^(\d+)\.?\d*$/);
        if (decimalMatch) {
          const integerPart = decimalMatch[1].replace(/^0+/, '') || '0';
          console.log('[LiFi] validateAndCleanAmount - Decimal conversion result:', integerPart);
          return integerPart;
        }
      }
      
      // Fallback: try to parse as number and convert carefully
      const numAmount = parseFloat(amountStr);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new Error(`Invalid number format: ${amountStr}`);
      }
      
      // For very large numbers, avoid toFixed which can return scientific notation
      const intAmount = Math.floor(numAmount);
      if (intAmount === 0) {
        throw new Error(`Amount too small: ${amountStr}`);
      }
      
      const result = intAmount.toString();
      console.log('[LiFi] validateAndCleanAmount - Fallback result:', result);
      return result;
      
    } catch (error) {
      console.error('[LiFi] validateAndCleanAmount - Error:', error);
      throw new Error(`Unable to process amount: ${amountStr} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToLiFiChainId(chainId: string | number): string {
    const chainIdStr = String(chainId);
    
    // Map our internal chain IDs to LiFi's expected format
    const chainMapping: Record<string, string> = {
      // Solana - LiFi uses "SOL" instead of the numeric ID
      '1151111081099710': 'SOL',
      'SOL': 'SOL',
      'solana': 'SOL',
      
      // Bitcoin - LiFi uses "BTC" 
      '20000000000001': 'BTC',
      'BTC': 'BTC',
      'bitcoin': 'BTC',
      
      // Sui - LiFi uses "SUI"
      '9270000000000000': 'SUI', 
      'SUI': 'SUI',
      'sui': 'SUI',
      
      // EVM chains use numeric IDs
      '1': '1',     // Ethereum
      '56': '56',   // BSC
      '137': '137', // Polygon
      '42161': '42161', // Arbitrum
      '10': '10',   // Optimism
      '8453': '8453', // Base
      '43114': '43114', // Avalanche
      '324': '324', // zkSync Era
      '59144': '59144', // Linea
      '534352': '534352', // Scroll
      '1101': '1101', // Polygon zkEVM
      '100': '100', // Gnosis
      '250': '250', // Fantom
      '1285': '1285', // Moonriver
      '1284': '1284', // Moonbeam
      '122': '122', // FUSE
      '288': '288', // Boba
      '34443': '34443', // Mode
      '1088': '1088', // Metis
      '1135': '1135', // Lisk
      '130': '130', // Unichain
      '1313161554': '1313161554', // Aurora
      '1329': '1329', // Sei
      '13371': '13371', // Immutable zkEVM
      '146': '146', // Sonic
      '1625': '1625', // Gravity
      '167000': '167000', // Taiko
      '1868': '1868', // Soneium
      '1923': '1923', // Swellchain
      '204': '204', // opBNB
      '21000000': '21000000', // Corn
      '232': '232', // Lens
      '25': '25', // Cronos
      '2741': '2741', // Abstract
      '30': '30', // Rootstock
      '33139': '33139', // Apechain
      '42220': '42220', // Celo
      '480': '480', // World Chain
      '50': '50', // XDC
      '5000': '5000', // Mantle
      '55244': '55244', // Superposition
      '57073': '57073', // Ink
      '60808': '60808', // BOB
      '80094': '80094', // Berachain
      '8217': '8217', // Kaia
      '999': '999', // HyperEVM
      '81457': '81457', // Blast
    };
    
    // Return mapped value or original value if not found
    const result = chainMapping[chainIdStr] || chainIdStr;
    
    console.log('[LiFi] convertToLiFiChainId:', {
      input: chainIdStr,
      output: result,
      isMapped: chainMapping[chainIdStr] !== undefined
    });
    
    return result;
  }

  private convertScientificToDecimal(mantissa: string, exponent: number): string {
    console.log('[LiFi] convertScientificToDecimal - Input:', { mantissa, exponent });
    
    // Remove any leading + sign from mantissa
    const cleanMantissa = mantissa.replace(/^\+/, '');
    
    // Handle negative exponents (very small numbers - should result in 0 for integer conversion)
    if (exponent < 0) {
      console.log('[LiFi] convertScientificToDecimal - Negative exponent, returning 0');
      throw new Error('Amount too small (negative exponent in scientific notation)');
    }
    
    // Split mantissa into integer and decimal parts
    const parts = cleanMantissa.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    
    console.log('[LiFi] convertScientificToDecimal - Mantissa parts:', { integerPart, decimalPart });
    
    // Calculate total digits we need
    const totalDigits = integerPart.length + exponent;
    
    // Build the result string
    let result = integerPart + decimalPart;
    
    // Remove any existing decimal point for integer conversion
    result = result.replace('.', '');
    
    // Add zeros if needed
    const zerosToAdd = exponent - decimalPart.length;
    if (zerosToAdd > 0) {
      result += '0'.repeat(zerosToAdd);
    } else if (zerosToAdd < 0) {
      // Trim excess decimal digits for integer conversion
      result = result.substring(0, result.length + zerosToAdd);
    }
    
    // Remove leading zeros but keep at least one digit
    result = result.replace(/^0+/, '') || '0';
    
    // Validate result is a valid integer string
    if (!/^\d+$/.test(result)) {
      throw new Error(`Invalid conversion result: ${result}`);
    }
    
    console.log('[LiFi] convertScientificToDecimal - Final result:', result);
    return result;
  }

  async getMultipleQuotes(
    fromChainId: string | number,
    toChainId: string | number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string = '0x0000000000000000000000000000000000000000',
    toAddress?: string
  ): Promise<LiFiQuote[]> {
    console.log('[LiFi] getMultipleQuotes - Starting comprehensive route search:', {
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      fromAmount,
      preference
    });

    const quotes: LiFiQuote[] = [];
    const cleanAmount = this.validateAndCleanAmount(fromAmount);
    const finalToAddress = toAddress || fromAddress;

    // PERFORMANCE OPTIMIZATION: Parallel route requests instead of sequential
    console.log('[LiFi] Requesting routes in parallel for maximum speed...');
    
    const routeRequests = [
      // Strategy 1: Diverse routes without order constraint
      this.getAdvancedRoutes({
        fromChainId,
        toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: cleanAmount,
        fromAddress,
        toAddress: finalToAddress,
        options: {
          slippage: 0.05,
          allowSwitchChain: false
        }
      }).catch(error => {
        console.warn('[LiFi] Diverse routes request failed:', error);
        return { routes: [] };
      }),
      
      // Strategy 2: FASTEST optimized routes
      this.getAdvancedRoutes({
        fromChainId,
        toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: cleanAmount,
        fromAddress,
        toAddress: finalToAddress,
        options: {
          order: 'FASTEST',
          slippage: 0.03,
          allowSwitchChain: false
        }
      }).catch(error => {
        console.warn('[LiFi] FASTEST routes request failed:', error);
        return { routes: [] };
      }),
      
      // Strategy 3: CHEAPEST optimized routes
      this.getAdvancedRoutes({
        fromChainId,
        toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: cleanAmount,
        fromAddress,
        toAddress: finalToAddress,
        options: {
          order: 'CHEAPEST',
          slippage: 0.03,
          allowSwitchChain: false
        }
      }).catch(error => {
        console.warn('[LiFi] CHEAPEST routes request failed:', error);
        return { routes: [] };
      })
    ];

    // Execute all requests in parallel
    const [diverseRoutes, fastestRoutes, cheapestRoutes] = await Promise.all(routeRequests);
    
    console.log('[LiFi] Parallel route requests completed:', {
      diverseCount: diverseRoutes.routes?.length || 0,
      fastestCount: fastestRoutes.routes?.length || 0,
      cheapestCount: cheapestRoutes.routes?.length || 0
    });

    // Process all routes and convert to quotes
    const allRoutes = [
      ...(diverseRoutes.routes || []).slice(0, 3),
      ...(fastestRoutes.routes || []).slice(0, 2), 
      ...(cheapestRoutes.routes || []).slice(0, 2)
    ];

    // Use a Map to track unique quotes by provider and key characteristics
    const quoteMap = new Map<string, LiFiQuote>();

    for (const route of allRoutes) {
      try {
        const quote = this.convertRouteToQuote(route, fromAmount);
        
        // Create a unique key based on provider, output amount, and time
        // This helps deduplicate essentially identical quotes from the same provider
        const outputAmount = parseFloat(quote.toAmount || '0');
        const estimatedTime = quote.estimatedTime || 0;
        const actualProvider = quote.provider;
        
        const uniqueKey = `${actualProvider}_${outputAmount.toFixed(6)}_${estimatedTime}`;
        
        // Only add if we haven't seen this exact combination before
        if (!quoteMap.has(uniqueKey)) {
          quoteMap.set(uniqueKey, quote);
        } else {
          console.log(`[LiFi] Filtering duplicate quote from ${actualProvider} with same output and time`);
        }
      } catch (error) {
        console.warn('[LiFi] Failed to convert route to quote:', error);
      }
    }

    // Convert map values back to array
    quotes.push(...Array.from(quoteMap.values()));

    // Fallback to single quote if all advanced routes failed
    if (quotes.length === 0) {
      console.log('[LiFi] All advanced routes failed, falling back to single quote...');
      try {
        const singleQuote = await this.getQuote(fromChainId, toChainId, fromToken, toToken, fromAmount, preference, fromAddress, toAddress, true);
        quotes.push(singleQuote);
      } catch (error) {
        console.error('[LiFi] Single quote fallback also failed:', error);
        throw error;
      }
    }

    console.log(`[LiFi] getMultipleQuotes completed with ${quotes.length} quotes`);
    return quotes;
  }

  private convertRouteToQuote(route: any, originalFromAmount: string): LiFiQuote {
    // PERFORMANCE OPTIMIZATION: Streamlined route processing with minimal logging
    
    // Handle different route structures from advanced routes vs single quote
    let estimate, action, stepInfo;
    
    if (route.estimate && route.action) {
      // Single quote format
      estimate = route.estimate;
      action = route.action;
      stepInfo = { action };
    } else if (route.steps && route.steps.length > 0) {
      // Advanced routes format - use first step
      const step = route.steps[0];
      estimate = step.estimate;
      action = step.action;
      stepInfo = step;
    } else {
      throw new Error('Invalid route structure: missing estimate or action data');
    }

    if (!estimate || !action) {
      throw new Error('Route missing required estimate or action data');
    }
    
    // Calculate fees efficiently
    let totalFeeCost = 0;
    let totalGasCost = 0;

    if (estimate.feeCosts) {
      totalFeeCost = estimate.feeCosts.reduce((sum: number, fee: any) => sum + parseFloat(fee.amountUSD || '0'), 0);
    }

    if (estimate.gasCosts) {
      totalGasCost = estimate.gasCosts.reduce((sum: number, gas: any) => sum + parseFloat(gas.amountUSD || '0'), 0);
    }

    const totalFees = (totalFeeCost + totalGasCost).toString();
    const toAmountWeiString = estimate.toAmount;
    const toTokenDecimals = action.toToken.decimals;

    // Optimized amount conversion
    let toAmountHuman: string;
    if (toAmountWeiString.length <= toTokenDecimals) {
      toAmountHuman = '0.' + '0'.repeat(toTokenDecimals - toAmountWeiString.length) + toAmountWeiString;
    } else {
      const integerPart = toAmountWeiString.slice(0, toAmountWeiString.length - toTokenDecimals);
      const decimalPart = toAmountWeiString.slice(toAmountWeiString.length - toTokenDecimals);
      toAmountHuman = integerPart + '.' + decimalPart;
    }
    toAmountHuman = toAmountHuman.replace(/\.?0+$/, '');
    if (toAmountHuman.endsWith('.')) {
      toAmountHuman = toAmountHuman.slice(0, -1);
    }

    // Streamlined toolDetails extraction
    const toolDetails = route.steps?.[0]?.toolDetails || 
                       route.toolDetails || 
                       stepInfo?.toolDetails || 
                       null;

    const quote: LiFiQuote = {
      id: route.id,
      provider: 'lifi',
      fromChainId: action.fromChainId,
      toChainId: action.toChainId,
      fromToken: {
        address: action.fromToken.address,
        decimals: action.fromToken.decimals,
        symbol: action.fromToken.symbol,
        name: action.fromToken.name,
        logoURI: action.fromToken.logoURI
      },
      toToken: {
        address: action.toToken.address,
        decimals: action.toToken.decimals,
        symbol: action.toToken.symbol,
        name: action.toToken.name,
        logoURI: action.toToken.logoURI
      },
      fromAmount: originalFromAmount,
      toAmount: toAmountHuman,
      estimatedTime: estimate.executionDuration || 60,
      fees: {
        providerFee: totalFeeCost.toString(),
        networkFee: totalGasCost.toString(),
        total: totalFees
      },
      transactionRequest: route.transactionRequest || stepInfo.transactionRequest,
      rawQuote: {
        ...route,
        toolDetails // Ensure toolDetails is available in rawQuote
      }
    };

    return quote;
  }

  async getQuote(
    fromChainId: string | number,
    toChainId: string | number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    preference: 'fastest' | 'lowest_cost',
    fromAddress: string = '0x0000000000000000000000000000000000000000',
    toAddress?: string,
    isPreviewMode: boolean = true
  ): Promise<LiFiQuote> {
    // ENHANCED LOGGING: Start of getQuote method
    console.log('[LiFi] getQuote - Method start:', {
      timestamp: new Date().toISOString(),
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      fromAmount,
      preference,
      fromAddress,
      toAddress,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV
      }
    });

    // Early validation of fromAddress
    if (!fromAddress || typeof fromAddress !== 'string') {
      console.error('[LiFi] getQuote - Invalid fromAddress:', {
        fromAddress,
        type: typeof fromAddress
      });
      throw new Error(`Invalid fromAddress: ${fromAddress} (type: ${typeof fromAddress})`);
    }
    
    // Use numeric chain IDs as per working CURL example
    // The working CURL used fromChain=1151111081099710 successfully
    const fromChainParam = String(fromChainId);
    const toChainParam = String(toChainId);
    
    console.log('[LiFi] getQuote - Chain ID conversion:', {
      originalFromChainId: fromChainId,
      originalToChainId: toChainId,
      fromChainParam,
      toChainParam
    });
    
    const cleanAmount = this.validateAndCleanAmount(fromAmount);
    console.log('[LiFi] getQuote - Amount validation complete:', { 
      originalAmount: fromAmount, 
      cleanedAmount: cleanAmount,
      fromChainId,
      toChainId,
      fromToken,
      toToken
    });
    
    let validToAddress = toAddress;
    
    const isValidAddressForChain = (address: string, chainId: string | number): boolean => {
      const chainIdStr = String(chainId);
      
      // EVM chains validation
      if (['1', '56', '137', '42161', '10', '8453'].includes(chainIdStr)) {
        return address.startsWith('0x') && address.length === 42;
      }
      
      // Solana validation - be more lenient for Solana addresses
      if (chainIdStr === '1151111081099710' || chainIdStr === 'SOL' || chainIdStr === 'solana') {
        return !address.startsWith('0x') && address.length >= 32 && address.length <= 44;
      }
      
      // Bitcoin validation
      if (chainIdStr === '20000000000001' || chainIdStr === 'BTC' || chainIdStr === 'bitcoin') {
        return !address.startsWith('0x') && (address.length >= 26 && address.length <= 62);
      }
      
      // Sui validation - Sui addresses are 32 bytes hex encoded with 0x prefix (66 chars total)
      if (chainIdStr === '9270000000000000' || chainIdStr === 'SUI' || chainIdStr === 'sui' || chainIdStr === 'sui-mainnet') {
        return address.startsWith('0x') && address.length === 66;
      }
      
      return true;
    };
    
    console.log('[LiFi] Address validation check:', {
      fromAddress,
      toAddress,
      fromChainId,
      toChainId,
      isValidFromAddress: isValidAddressForChain(fromAddress, fromChainId),
      isValidToAddress: toAddress ? isValidAddressForChain(toAddress, toChainId) : 'not provided'
    });
    
    if (!toAddress || !isValidAddressForChain(toAddress, toChainId)) {
      if (!isPreviewMode) {
        // For actual swaps, never use placeholder addresses
        throw new Error(`Invalid or missing destination address for chain ${toChainId}. Address: ${toAddress}`);
      }
      
      // Only use placeholder addresses for preview quotes
      const chainIdStr = String(toChainId);
      
      if (['1', '56', '137', '42161', '10', '8453'].includes(chainIdStr)) {
        validToAddress = '0xA5BD439c4d4Fc7cA8B14A9FE77fd5C4FFd7e4996';
      } else if (chainIdStr === '1151111081099710' || chainIdStr === 'SOL' || chainIdStr === 'solana') {
        validToAddress = '11111111111111111111111111111112';
      } else if (chainIdStr === '20000000000001' || chainIdStr === 'BTC' || chainIdStr === 'bitcoin') {
        validToAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      } else if (chainIdStr === '9270000000000000' || chainIdStr === 'SUI' || chainIdStr === 'sui' || chainIdStr === 'sui-mainnet') {
        validToAddress = '0x0000000000000000000000000000000000000000000000000000000000000001';
      } else {
        validToAddress = toAddress || fromAddress;
      }
    }
    
    // Match the exact parameter order from the working example  
    // Working order: fromChain, toChain, fromToken, toToken, fromAddress, fromAmount, fee, toAddress, integrator
    const params = new URLSearchParams();
    params.append('fromChain', fromChainParam);
    params.append('toChain', toChainParam);
    params.append('fromToken', fromToken);
    params.append('toToken', toToken);
    params.append('fromAddress', fromAddress);
    params.append('fromAmount', cleanAmount);
    params.append('fee', '0.01'); // 1% fee
    params.append('toAddress', validToAddress || fromAddress);
    params.append('integrator', 'hyperswapai');

    const apiUrl = `/quote?${params}`;
    
    // ENHANCED LOGGING: Pre-request details
    console.log('[LiFi] getQuote - Making API request with fee parameter:', {
      url: apiUrl,
      fullUrl: `${LIFI_API_URL}${apiUrl}`,
      fromAmount: cleanAmount,
      params: Object.fromEntries(params.entries()),
      feeParameter: params.get('fee'),
      integratorParameter: params.get('integrator'),
      apiKeyPresent: !!this.apiKey,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await this.fetchFromApi<any>(apiUrl, {
        method: 'GET'
      });

      // ENHANCED LOGGING: Post-request success
      console.log('[LiFi] getQuote - API request successful:', {
        hasResponse: !!response,
        hasTransactionRequest: !!response?.transactionRequest,
        hasEstimate: !!response?.estimate,
        responseId: response?.id,
        fromChainId,
        toChainId
      });

      if (!response.transactionRequest) {
        throw new Error('No transaction request in LiFi response');
      }

      if (!response.transactionRequest.to) {
        console.warn('LiFi transaction request missing "to" address - quote may need refresh for execution');
      }

      let totalFeeCost = 0;
      let totalGasCost = 0;

      if (response.estimate?.feeCosts) {
        response.estimate.feeCosts.forEach((fee: any) => {
          totalFeeCost += parseFloat(fee.amountUSD || '0');
        });
      }

      if (response.estimate?.gasCosts) {
        response.estimate.gasCosts.forEach((gas: any) => {
          totalGasCost += parseFloat(gas.amountUSD || '0');
        });
      }

      const totalFees = (totalFeeCost + totalGasCost).toString();
      const toAmountWeiString = response.estimate.toAmount;
      const toTokenDecimals = response.action.toToken.decimals;

      let toAmountHuman: string;
      if (toAmountWeiString.length <= toTokenDecimals) {
        toAmountHuman = '0.' + '0'.repeat(toTokenDecimals - toAmountWeiString.length) + toAmountWeiString;
      } else {
        const integerPart = toAmountWeiString.slice(0, toAmountWeiString.length - toTokenDecimals);
        const decimalPart = toAmountWeiString.slice(toAmountWeiString.length - toTokenDecimals);
        toAmountHuman = integerPart + '.' + decimalPart;
      }
      toAmountHuman = toAmountHuman.replace(/\.?0+$/, '');
      if (toAmountHuman.endsWith('.')) {
        toAmountHuman = toAmountHuman.slice(0, -1);
      }

      const quote: LiFiQuote = {
        id: response.id,
        provider: 'lifi',
        fromChainId,
        toChainId,
        fromToken: {
          address: response.action.fromToken.address,
          decimals: response.action.fromToken.decimals,
          symbol: response.action.fromToken.symbol,
          name: response.action.fromToken.name,
          logoURI: response.action.fromToken.logoURI
        },
        toToken: {
          address: response.action.toToken.address,
          decimals: response.action.toToken.decimals,
          symbol: response.action.toToken.symbol,
          name: response.action.toToken.name,
          logoURI: response.action.toToken.logoURI
        },
        fromAmount,
        toAmount: toAmountHuman,
        estimatedTime: response.estimate.executionDuration || 60,
        fees: {
          providerFee: totalFeeCost.toString(),
          networkFee: totalGasCost.toString(),
          total: totalFees
        },
        transactionRequest: response.transactionRequest,
        rawQuote: response // Store the raw LiFi response
      };

      // ENHANCED LOGGING: Quote creation success
      console.log('[LiFi] getQuote - Quote created successfully:', {
        quoteId: quote.id,
        toAmount: quote.toAmount,
        estimatedTime: quote.estimatedTime,
        totalFees: quote.fees.total,
        fromSymbol: quote.fromToken.symbol,
        toSymbol: quote.toToken.symbol
      });

      return quote;
    } catch (error) {
      // ENHANCED LOGGING: Error details
      console.error('[LiFi] getQuote - Failed:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        fromAmount: cleanAmount,
        preference,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getStatus(transactionHash: string, fromChainId: string | number, toChainId: string | number): Promise<any> {
    const fromChainParam = String(fromChainId);
    const toChainParam = String(toChainId);
    return this.fetchFromApi(`/status?txHash=${transactionHash}&fromChain=${fromChainParam}&toChain=${toChainParam}`);
  }

  async getChains(): Promise<any[]> {
    try {
      const response = await this.fetchFromApi<any>('/chains');
      return response.chains || [];
    } catch (error) {
      console.error('Failed to fetch chains from LiFi:', error);
      throw error;
    }
  }

  async getTokens(chainTypes: ('EVM' | 'SVM' | 'UTXO' | 'MVM')[]): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (chainTypes && chainTypes.length > 0) {
        params.append('chainTypes', chainTypes.join(','));
      }
      
      const endpoint = params.toString() ? `/tokens?${params}` : '/tokens';
      const response = await this.fetchFromApi<any>(endpoint);
      return response.tokens || {};
    } catch (error) {
      console.error('Failed to fetch tokens from LiFi:', error);
      throw error;
    }
  }

  async getTokenDetails(chain: string, token: string): Promise<any> {
    try {
      const response = await this.fetchFromApi<any>(`/token?chain=${chain}&token=${token}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch token details for ${token} on ${chain}:`, error);
      throw error;
    }
  }

  async getTools(chains?: string[]): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (chains && chains.length > 0) {
        params.append('chains', chains.join(','));
      }
      
      const endpoint = params.toString() ? `/tools?${params}` : '/tools';
      const response = await this.fetchFromApi<any>(endpoint);
      return response.tools || [];
    } catch (error) {
      console.error('Failed to fetch tools from LiFi:', error);
      throw error;
    }
  }

  async getAdvancedRoutes(routeRequest: {
    fromChainId: string | number;
    toChainId: string | number;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
    options?: {
      slippage?: number;
      order?: 'FASTEST' | 'CHEAPEST' | 'SAFEST';
      allowSwitchChain?: boolean;
    };
  }): Promise<any> {
    try {
      console.log('[LiFi] getAdvancedRoutes - Making request:', {
        fromChainId: routeRequest.fromChainId,
        toChainId: routeRequest.toChainId,
        fromTokenAddress: routeRequest.fromTokenAddress,
        toTokenAddress: routeRequest.toTokenAddress,
        fromAmount: routeRequest.fromAmount,
        options: routeRequest.options
      });

      const body = {
        fromChainId: String(routeRequest.fromChainId),
        toChainId: String(routeRequest.toChainId),
        fromTokenAddress: routeRequest.fromTokenAddress,
        toTokenAddress: routeRequest.toTokenAddress,
        fromAmount: routeRequest.fromAmount,
        fromAddress: routeRequest.fromAddress,
        toAddress: routeRequest.toAddress,
        options: {
          slippage: routeRequest.options?.slippage || 0.03,
          ...(routeRequest.options?.order && { order: routeRequest.options.order }),
          allowSwitchChain: routeRequest.options?.allowSwitchChain || false,
          integrator: 'hyperswapai',
          // Request maximum route diversity
          maxPriceImpact: 0.4,
          allowDestinationCall: false
        },
        fee: 0.01
      };

      console.log('[LiFi] getAdvancedRoutes - Request body with fee parameter:', JSON.stringify(body, null, 2));
      console.log('[LiFi] getAdvancedRoutes - Fee parameter explicitly:', body.fee);

      const response = await this.fetchFromApi<any>('/advanced/routes', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      console.log('[LiFi] getAdvancedRoutes - Response received:', {
        hasRoutes: !!response?.routes,
        routeCount: response?.routes?.length || 0,
        responseKeys: Object.keys(response || {})
      });

      return response;
    } catch (error) {
      console.error('[LiFi] getAdvancedRoutes - Failed:', {
        error: error instanceof Error ? error.message : String(error),
        fromChainId: routeRequest.fromChainId,
        toChainId: routeRequest.toChainId,
        fromTokenAddress: routeRequest.fromTokenAddress,
        toTokenAddress: routeRequest.toTokenAddress
      });
      throw error;
    }
  }
}
