import {
  SideShiftCoin,
  SideShiftFixedShift,
  SideShiftPair,
  SideShiftQuote,
  SideShiftShiftStatus,
  SideShiftVariableShift,
} from "./types";
import { ChainMappingService } from '@/lib/chains/chainMapping';
import logger from '@/lib/logger';

const SIDESHIFT_API_URL = "https://sideshift.ai/api/v2";

// Define a unified interface for shift creation responses
export interface UnifiedShiftResponse {
  id: string;
  depositAddress: string;
  depositCoin: string;
  depositNetwork: string;
  depositAmount?: string; // For fixed shifts
  settleAddress: string;
  settleCoin: string;
  settleNetwork: string;
  settleAmount?: string; // For fixed shifts
  expiresAt: string;
  status: string;
  type: "fixed" | "variable";
  depositMemo?: string;
  refundAddress?: string;
  refundMemo?: string;
  chainId: string | number; // Normalized chain ID
}

export class SideShiftProvider {
  private secret: string;
  private affiliateId: string;

  constructor() {
    this.secret = process.env.SIDESHIFT_SECRET || "";
    this.affiliateId = process.env.SIDESHIFT_AFFILIATE_ID || "";
  }

  private async fetchFromApi<T>(
    endpoint: string,
    options: RequestInit = {},
    userIp?: string
  ): Promise<T> {
    const url = `${SIDESHIFT_API_URL}${endpoint}`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-sideshift-secret', this.secret);
    
    // Add any existing headers from options
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

    if (userIp) {
      headers.set('x-user-ip', userIp);
    }

    const maxRetries = 2; // Allow 2 retries for SideShift API reliability
    let retryCount = 0;
    let response: Response | null = null;
    let responseTime = 0;
    let errorDetails: any = null;

    while (retryCount < maxRetries) {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout - give SideShift adequate time
      
      try {
        logger.debug({
          message: 'Initiating SideShift API request',
          endpoint,
          method: options.method || 'GET',
          headers: Object.fromEntries(headers.entries()),
          body: options.body ? JSON.parse(options.body as string) : undefined,
          attempt: retryCount + 1
        });

        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        responseTime = Date.now() - startTime;

        // If successful, break out of retry loop
        if (response.ok) {
          break;
        }

        // If 500 error, try again after delay
        if (response.status >= 500) {
          errorDetails = await response.text();
          logger.warn({
            message: `SideShift API returned ${response.status}, retrying`,
            endpoint,
            status: response.status,
            attempt: retryCount + 1
          });
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 200)); // Fast retry for quick failure
          continue;
        }
        
        // For non-500 errors, break out to handle normally
        break;
      } catch (error: any) {
        clearTimeout(timeoutId);
        responseTime = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
          errorDetails = 'Request timeout';
          logger.warn({
            message: 'SideShift API request timed out, retrying',
            endpoint,
            attempt: retryCount + 1
          });
        } else {
          errorDetails = error.message;
          logger.warn({
            message: 'SideShift API request failed, retrying',
            endpoint,
            error: error.message,
            attempt: retryCount + 1
          });
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Fast retry for quick failure
      }
    }

    // If all retries failed and we don't have a response
    if (!response) {
      throw new Error(
        `SideShift API request failed after ${maxRetries} attempts: ${errorDetails || 'Network error'}`
      );
    }

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        try {
          errorDetails = await response.text();
        } catch {
          errorDetails = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
      }
      
      // Provide better error message for 500 errors
      if (response.status >= 500) {
        const errorBody = JSON.stringify(errorDetails, null, 2);
        logger.error({
          message: 'SideShift API 500 Error Body',
          errorBody
        });
        return Promise.reject(new Error(
          `SideShift API is currently unavailable (${response.status}). Details: ${errorBody}`
        ));
      }
      
      // Properly extract error message from SideShift response structure
      let errorMessage = errorDetails.error?.message || 
                         errorDetails.message || 
                         errorDetails.error ||
                         response.statusText;

      // Map specific error cases to more meaningful messages
      if (errorMessage.includes('Invalid network')) {
        errorMessage = 'Invalid network: Incorrect/missing depositNetwork or settleNetwork. See /v2/coins for supported networks.';
      } else if (errorMessage.includes('Invalid coin')) {
        errorMessage = 'Invalid coin: Unsupported depositCoin or settleCoin. See /v2/coins for supported cryptocurrencies.';
      } else if (errorMessage.includes('Amount too low')) {
        errorMessage = 'Amount too low: depositAmount is below minimum. See /v2/pair for minimum values.';
      } else if (errorMessage.includes('Amount too high')) {
        errorMessage = 'Amount too high: depositAmount exceeds maximum. See /v2/pair for maximum values.';
      } else if (errorMessage.includes('Deposit and settle method must be different')) {
        errorMessage = 'Deposit and settle methods must be different. Use different coins/networks.';
      } else if (errorMessage.includes('Memo is not supported')) {
        errorMessage = 'Memo not supported: settleCoin does not support memos. Check networksWithMemo array.';
      } else if (errorMessage.includes('quoteId') && errorMessage.includes('invalid')) {
        errorMessage = 'Invalid quoteId: The provided quote ID is invalid or expired. Request a new quote.';
      }

      console.error('SideShift API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        requestBody: options.body
      });
      
      logger.error({
        message: 'SideShift API Error',
        url,
        status: response.status,
        statusText: response.statusText,
        errorDetails: errorMessage,
        responseTime,
        requestBody: options.body
      });
      
      throw new Error(
        `SideShift API error (${response.status}): ${errorMessage}`
      );
    }

    const data = await response.json();
    
    logger.debug({
      message: 'Received SideShift API response',
      endpoint,
      status: response.status,
      responseTime,
      data
    });
    
    return data;
  }

  async getCoins(): Promise<SideShiftCoin[]> {
    return this.fetchFromApi<SideShiftCoin[]>("/coins");
  }

  async getPair(from: string, to: string, amount?: number): Promise<SideShiftPair> {
    const params = new URLSearchParams({
      affiliateId: this.affiliateId,
    });
    if (amount) {
      params.append("amount", amount.toString());
    }
    return this.fetchFromApi<SideShiftPair>(`/pair/${from}/${to}?${params.toString()}`);
  }

  /**
   * Step 1: Create a quote for fixed rate shifts
   * This should be called first to get a quote ID
   */
  async createQuote(
    depositCoin: string,
    settleCoin: string,
    depositAmount: string | null,
    settleAmount: string | null,
    depositNetwork?: string,
    settleNetwork?: string,
    userIp?: string
  ): Promise<SideShiftQuote> {
    const requestBody = {
      depositCoin,
      settleCoin,
      depositAmount,
      settleAmount,
      depositNetwork,
      settleNetwork,
      affiliateId: this.affiliateId,
    };

    logger.info({
      message: 'Creating SideShift quote',
      requestBody,
      userIp
    });

    return this.fetchFromApi<SideShiftQuote>("/quotes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    }, userIp);
  }

  /**
   * Step 2: Create a fixed shift using the quote ID
   * This should be called after getting a quote to create the actual shift
   */
  async createFixedShift(
    quoteId: string,
    settleAddress: string,
    refundAddress?: string,
    settleMemo?: string,
    refundMemo?: string,
    externalId?: string,
    userIp?: string
  ): Promise<UnifiedShiftResponse> {
    const requestBody: any = {
      quoteId,
      settleAddress,
      settleMemo,
      refundMemo,
      externalId,
      affiliateId: this.affiliateId,
    };

    // Omit refundAddress entirely to avoid validation errors
    // Users can set refund address manually on SideShift.ai if needed

    logger.info({
      message: 'Creating SideShift fixed shift',
      requestBody,
      userIp
    });

    const shift = await this.fetchFromApi<SideShiftFixedShift>("/shifts/fixed", {
      method: "POST",
      body: JSON.stringify(requestBody),
    }, userIp);

    const chainId = ChainMappingService.getBySideShiftNetwork(shift.depositNetwork)?.lifiChainId || shift.depositNetwork;

    return {
      id: shift.id,
      depositAddress: shift.depositAddress,
      depositCoin: shift.depositCoin,
      depositNetwork: shift.depositNetwork,
      depositAmount: shift.depositAmount,
      settleAddress: shift.settleAddress,
      settleCoin: shift.settleCoin,
      settleNetwork: shift.settleNetwork,
      settleAmount: shift.settleAmount,
      expiresAt: shift.expiresAt,
      status: shift.status,
      type: shift.type,
      depositMemo: shift.depositMemo,
      refundAddress: shift.refundAddress,
      refundMemo: shift.refundMemo,
      chainId: chainId,
    };
  }

  async createVariableShift(
    depositCoin: string,
    settleCoin: string,
    settleAddress: string,
    depositNetwork?: string,
    settleNetwork?: string,
    refundAddress?: string,
    settleMemo?: string,
    refundMemo?: string,
    externalId?: string,
    userIp?: string
  ): Promise<UnifiedShiftResponse> {
    const shift = await this.fetchFromApi<SideShiftVariableShift>("/shifts/variable", {
      method: "POST",
      body: JSON.stringify({
        depositCoin,
        settleCoin,
        settleAddress,
        depositNetwork,
        settleNetwork,
        refundAddress,
        settleMemo,
        refundMemo,
        externalId,
        affiliateId: this.affiliateId,
      }),
    }, userIp);

    const chainId = ChainMappingService.getBySideShiftNetwork(shift.depositNetwork)?.lifiChainId || shift.depositNetwork;

    return {
      id: shift.id,
      depositAddress: shift.depositAddress,
      depositCoin: shift.depositCoin,
      depositNetwork: shift.depositNetwork,
      settleAddress: shift.settleAddress,
      settleCoin: shift.settleCoin,
      settleNetwork: shift.settleNetwork,
      expiresAt: shift.expiresAt,
      status: shift.status,
      type: shift.type,
      depositMemo: shift.depositMemo,
      refundAddress: shift.refundAddress,
      refundMemo: shift.refundMemo,
      chainId: chainId,
    };
  }

  async checkPermissions(userIp?: string): Promise<boolean> {
    try {
      // Check if we have valid credentials first
      if (!this.secret || !this.affiliateId) {
        logger.error('Missing SideShift credentials');
        return false;
      }

      // Try to fetch coins as a simple API health check instead of permissions endpoint
      // The permissions endpoint may not exist or may not work as expected
      await this.fetchFromApi<SideShiftCoin[]>("/coins", {
        method: "GET"
      }, userIp);
      
      // If we can successfully fetch coins, we have valid permissions
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to check SideShift permissions - API may be unavailable or credentials invalid');
      return false;
    }
  }

  async getShift(shiftId: string): Promise<SideShiftShiftStatus> {
    return this.fetchFromApi<SideShiftShiftStatus>(`/shifts/${shiftId}`);
  }

  // Get coin icon URL from SideShift API
  getCoinIconUrl(coin: string, network?: string): string {
    const coinNetwork = network ? `${coin}-${network}` : coin;
    return `https://sideshift.ai/api/v2/coins/icon/${coinNetwork}`;
  }
}
