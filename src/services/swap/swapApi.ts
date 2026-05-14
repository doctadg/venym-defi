import { UnifiedQuote, StandardizedAsset } from '@/types/swap';
import { ChainMappingService } from '@/lib/swap/chainMapping';

const LIFI_API_URL = 'https://li.quest/v1';
const SIDESHIFT_API_URL = 'https://sideshift.ai/api/v2';

// ============= LiFi Provider (Client-Side) =============

class LiFiProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_LIFI_API_KEY || '';
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${LIFI_API_URL}${endpoint}`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (this.apiKey) headers.set('x-lifi-api-key', this.apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`LiFi API error (${response.status}): ${err}`);
      }
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getQuotes(params: {
    fromChainId: string | number;
    toChainId: string | number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress?: string;
  }): Promise<UnifiedQuote[]> {
    const {
      fromChainId, toChainId, fromToken, toToken, fromAmount, fromAddress, toAddress
    } = params;

    const fromChain = this.convertChainId(fromChainId);
    const toChain = this.convertChainId(toChainId);

    // Try advanced routes first for multiple quotes
    try {
      const body = {
        fromChainId: String(fromChain),
        toChainId: String(toChain),
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: fromAmount,
        fromAddress: fromAddress,
        toAddress: toAddress || fromAddress,
        options: {
          slippage: 0.03,
          allowSwitchChain: false,
          integrator: 'venym',
        },
      };

      const response = await this.fetchApi<any>('/advanced/routes', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (response.routes && response.routes.length > 0) {
        return response.routes.slice(0, 5).map((route: any) => this.convertRouteToQuote(route, fromAmount));
      }
    } catch (e) {
      console.warn('[Swap] Advanced routes failed, trying single quote:', e);
    }

    // Fallback to single quote
    try {
      const queryParams = new URLSearchParams({
        fromChain: String(fromChain),
        toChain: String(toChain),
        fromToken: fromToken,
        toToken: toToken,
        fromAmount: fromAmount,
        fromAddress: fromAddress,
        toAddress: toAddress || fromAddress,
        fee: '0.01',
        integrator: 'venym',
      });

      const response = await this.fetchApi<any>(`/quote?${queryParams}`);
      if (response) {
        return [this.convertSingleQuoteToUnified(response, fromAmount)];
      }
    } catch (e) {
      console.warn('[Swap] Single quote also failed:', e);
    }

    return [];
  }

  async getChains(): Promise<any[]> {
    const response = await this.fetchApi<any>('/chains');
    return response.chains || [];
  }

  async getTokens(chainId: string | number): Promise<any> {
    const chain = this.convertChainId(chainId);
    const response = await this.fetchApi<any>(`/tokens?chains=${chain}`);
    return response.tokens || {};
  }

  async getStatus(txHash: string, fromChain: string | number, toChain: string | number): Promise<any> {
    return this.fetchApi(`/status?txHash=${txHash}&fromChain=${this.convertChainId(fromChain)}&toChain=${this.convertChainId(toChain)}`);
  }

  private convertChainId(chainId: string | number): string {
    const str = String(chainId);
    const mapping: Record<string, string> = {
      '1151111081099710': 'SOL', 'SOL': 'SOL', 'solana': 'SOL',
      '20000000000001': 'BTC', 'BTC': 'BTC', 'bitcoin': 'BTC',
      '9270000000000000': 'SUI', 'SUI': 'SUI', 'sui': 'SUI',
    };
    return mapping[str] || str;
  }

  private convertRouteToQuote(route: any, originalAmount: string): UnifiedQuote {
    const step = route.steps?.[0];
    const estimate = step?.estimate || route.estimate;
    const action = step?.action || route.action;
    const toolDetails = route.steps?.[0]?.toolDetails || route.toolDetails;

    let toAmountHuman = '0';
    if (estimate?.toAmount && action?.toToken) {
      const wei = estimate.toAmount;
      const dec = action.toToken.decimals;
      if (wei.length <= dec) {
        toAmountHuman = '0.' + '0'.repeat(dec - wei.length) + wei;
      } else {
        toAmountHuman = wei.slice(0, wei.length - dec) + '.' + wei.slice(wei.length - dec);
      }
      toAmountHuman = toAmountHuman.replace(/\.?0+$/, '').replace(/\.$/, '');
    }

    let totalFee = 0;
    if (estimate?.feeCosts) totalFee += estimate.feeCosts.reduce((s: number, f: any) => s + parseFloat(f.amountUSD || '0'), 0);
    if (estimate?.gasCosts) totalFee += estimate.gasCosts.reduce((s: number, g: any) => s + parseFloat(g.amountUSD || '0'), 0);

    return {
      id: route.id || crypto.randomUUID(),
      provider: 'lifi',
      actualProvider: toolDetails?.name || 'LiFi',
      actualProviderLogo: toolDetails?.logoURI || '',
      outputAmount: toAmountHuman,
      fees: { total: totalFee.toString() },
      estimatedTime: estimate?.executionDuration || 60,
      rawQuote: route,
      transactionRequest: route.transactionRequest || step?.transactionRequest,
      chainId: action?.fromChainId || 1,
    };
  }

  private convertSingleQuoteToUnified(response: any, originalAmount: string): UnifiedQuote {
    const est = response.estimate;
    const act = response.action;

    let toAmountHuman = '0';
    if (est?.toAmount && act?.toToken) {
      const wei = est.toAmount;
      const dec = act.toToken.decimals;
      if (wei.length <= dec) {
        toAmountHuman = '0.' + '0'.repeat(dec - wei.length) + wei;
      } else {
        toAmountHuman = wei.slice(0, wei.length - dec) + '.' + wei.slice(wei.length - dec);
      }
      toAmountHuman = toAmountHuman.replace(/\.?0+$/, '').replace(/\.$/, '');
    }

    let totalFee = 0;
    if (est?.feeCosts) totalFee += est.feeCosts.reduce((s: number, f: any) => s + parseFloat(f.amountUSD || '0'), 0);
    if (est?.gasCosts) totalFee += est.gasCosts.reduce((s: number, g: any) => s + parseFloat(g.amountUSD || '0'), 0);

    return {
      id: response.id || crypto.randomUUID(),
      provider: 'lifi',
      actualProvider: response.toolDetails?.name || 'LiFi',
      actualProviderLogo: response.toolDetails?.logoURI || '',
      outputAmount: toAmountHuman,
      fees: { total: totalFee.toString() },
      estimatedTime: est?.executionDuration || 60,
      rawQuote: response,
      transactionRequest: response.transactionRequest,
      chainId: act?.fromChainId || 1,
    };
  }
}

// ============= SideShift Provider (Client-Side) =============

class SideShiftProvider {
  private secret: string;
  private affiliateId: string;

  constructor() {
    this.secret = process.env.NEXT_PUBLIC_SIDESHIFT_SECRET || '';
    this.affiliateId = process.env.NEXT_PUBLIC_SIDESHIFT_AFFILIATE_ID || '';
  }

  async getQuote(params: {
    depositCoin: string;
    settleCoin: string;
    depositAmount: string;
    depositNetwork?: string;
    settleNetwork?: string;
  }): Promise<UnifiedQuote | null> {
    const { depositCoin, settleCoin, depositAmount, depositNetwork, settleNetwork } = params;

    try {
      const response = await fetch(`${SIDESHIFT_API_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sideshift-secret': this.secret },
        body: JSON.stringify({
          depositCoin: depositCoin.toLowerCase(),
          settleCoin: settleCoin.toLowerCase(),
          depositAmount,
          depositNetwork,
          settleNetwork,
          affiliateId: this.affiliateId,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn('[SideShift] Quote failed:', err);
        return null;
      }

      const quote = await response.json();
      if (!quote.settleAmount || parseFloat(quote.settleAmount) <= 0) return null;

      return {
        id: crypto.randomUUID(),
        provider: 'sideshift',
        actualProvider: 'SideShift',
        outputAmount: quote.settleAmount,
        fees: { total: '0' },
        estimatedTime: 900,
        rawQuote: quote,
        depositCoin: quote.depositCoin,
        depositNetwork: quote.depositNetwork,
        depositAmount: quote.depositAmount,
        settleCoin: quote.settleCoin,
        settleNetwork: quote.settleNetwork,
        settleAmount: quote.settleAmount,
        expiresAt: quote.expiresAt,
        type: 'fixed',
      };
    } catch (e) {
      console.warn('[SideShift] Quote error:', e);
      return null;
    }
  }

  async createShift(params: {
    quoteId: string;
    settleAddress: string;
    refundAddress?: string;
  }): Promise<any> {
    const response = await fetch(`${SIDESHIFT_API_URL}/shifts/fixed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sideshift-secret': this.secret },
      body: JSON.stringify({
        quoteId: params.quoteId,
        settleAddress: params.settleAddress,
        affiliateId: this.affiliateId,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`SideShift shift creation failed: ${err}`);
    }

    return response.json();
  }

  async getShiftStatus(shiftId: string): Promise<any> {
    const response = await fetch(`${SIDESHIFT_API_URL}/shifts/${shiftId}`, {
      headers: { 'x-sideshift-secret': this.secret },
    });
    if (!response.ok) throw new Error('Failed to get shift status');
    return response.json();
  }
}

// ============= Aggregated Swap API =============

export const swapApi = {
  lifiProvider: new LiFiProvider(),
  sideshiftProvider: new SideShiftProvider(),

  async getAggregatedQuotes(params: {
    fromChain: string | number;
    toChain: string | number;
    fromToken: StandardizedAsset;
    toToken: StandardizedAsset;
    amount: string;
    fromAddress: string;
    toAddress?: string;
    preference?: 'fastest' | 'lowest_cost';
  }): Promise<{ quotes: UnifiedQuote[]; errors: Record<string, string> }> {
    const { fromChain, toChain, fromToken, toToken, amount, fromAddress, toAddress, preference = 'fastest' } = params;
    const errors: Record<string, string> = {};
    const quotes: UnifiedQuote[] = [];

    const PROVIDER_TIMEOUT = 10000;

    const withTimeout = <T>(promise: Promise<T>, ms: number, name: string): Promise<T> =>
      Promise.race([promise, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${name} timeout`)), ms))]);

    // Convert amount to wei for LiFi
    const amountWei = this.toWei(amount, fromToken.decimals);

    // LiFi
    const lifiPromise = withTimeout(
      this.lifiProvider.getQuotes({
        fromChainId: fromChain,
        toChainId: toChain,
        fromToken: fromToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : fromToken.address,
        toToken: toToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : toToken.address,
        fromAmount: amountWei,
        fromAddress,
        toAddress: toAddress || fromAddress,
      }).catch(e => { errors.lifi = e.message; return [] as UnifiedQuote[]; }),
      PROVIDER_TIMEOUT, 'LiFi'
    );

    // SideShift
    const depositNetwork = ChainMappingService.lifiToSideShift(fromChain);
    const settleNetwork = ChainMappingService.lifiToSideShift(toChain);
    let sideshiftPromise: Promise<UnifiedQuote | null> = Promise.resolve(null);
    if (depositNetwork && settleNetwork && toAddress) {
      sideshiftPromise = withTimeout(
        this.sideshiftProvider.getQuote({
          depositCoin: fromToken.symbol,
          settleCoin: toToken.symbol,
          depositAmount: amount,
          depositNetwork,
          settleNetwork,
        }).catch(e => { errors.sideshift = e.message; return null; }),
        PROVIDER_TIMEOUT, 'SideShift'
      );
    }

    const [lifiQuotes, sideshiftQuote] = await Promise.all([lifiPromise, sideshiftPromise]);

    quotes.push(...lifiQuotes);
    if (sideshiftQuote) quotes.push(sideshiftQuote);

    // Filter zero-output quotes
    const valid = quotes.filter(q => parseFloat(q.outputAmount) > 0);

    // Sort by preference
    valid.sort((a, b) => {
      if (preference === 'fastest') {
        const timeDiff = a.estimatedTime - b.estimatedTime;
        return Math.abs(timeDiff) <= 60 ? parseFloat(b.outputAmount) - parseFloat(a.outputAmount) : timeDiff;
      } else {
        const outputDiff = parseFloat(b.outputAmount) - parseFloat(a.outputAmount);
        const ratio = Math.abs(outputDiff) / parseFloat(a.outputAmount);
        return ratio <= 0.01 ? a.estimatedTime - b.estimatedTime : outputDiff;
      }
    });

    return { quotes: valid.slice(0, 5), errors };
  },

  toWei(amount: string, decimals: number): string {
    const [intPart = '0', decPart = ''] = amount.split('.');
    const padded = (decPart + '0'.repeat(decimals)).slice(0, decimals);
    const clean = (intPart + padded).replace(/^0+/, '') || '0';
    return clean;
  },

  async getLiFiChains() {
    return this.lifiProvider.getChains();
  },

  async getLiFiTokens(chainId: string | number) {
    return this.lifiProvider.getTokens(chainId);
  },

  async getTransactionStatus(txHash: string, fromChain: string | number, toChain: string | number) {
    return this.lifiProvider.getStatus(txHash, fromChain, toChain);
  },
};

export default swapApi;
