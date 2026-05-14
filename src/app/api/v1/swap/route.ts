import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { SideShiftProvider } from '@/services/swap/providers/sideshift';
import { ChainMappingService } from '@/services/swap/chainMapping';
import { LiFiProvider } from '@/services/swap/providers/lifi';
import { QuoteValidator } from '@/services/swap/quoteValidator';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const log = logger;

  try {
    const body = await request.json();
    log.info({ body }, 'Received swap request');

    const {
      provider,
      settleAddress,
      refundAddress,
      clientId,
      preference,
      settleMemo,
      refundMemo,
      idempotencyKey,
    } = body;

    if (!provider || !settleAddress || !clientId) {
      log.info('Missing required fields: provider, settleAddress, and clientId are required');
      return NextResponse.json(
        { message: 'provider, settleAddress, and clientId are required' },
        { status: 400 }
      );
    }

    if (provider === 'lifi') {
      const {
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        toAddress,
      } = body;

      if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress || !toAddress) {
        return NextResponse.json(
          { message: 'Missing required fields for LiFi swap' },
          { status: 400 }
        );
      }

      const lifiProvider = new LiFiProvider();

      const freshQuote = await lifiProvider.getQuote(
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        preference,
        fromAddress,
        toAddress,
        false
      );

      if (!freshQuote) {
        return NextResponse.json(
          { message: 'Failed to get quote from LiFi' },
          { status: 400 }
        );
      }

      // Execute the LiFi transaction
      const lifiRoute = (freshQuote as any).route || freshQuote;

      return NextResponse.json({
        success: true,
        provider: 'lifi',
        quote: {
          id: lifiRoute.id || requestId,
          fromChain: lifiRoute.fromChainId || fromChain,
          toChain: lifiRoute.toChainId || toChain,
          fromToken: lifiRoute.fromToken || fromToken,
          toToken: lifiRoute.toToken || toToken,
          fromAmount: lifiRoute.fromAmount || fromAmount,
          toAmount: lifiRoute.toAmount,
          estimatedGas: lifiRoute.gasEstimation,
          tool: lifiRoute.tool,
          route: lifiRoute,
        },
        requestId,
      });
    }

    if (provider === 'sideshift') {
      const {
        depositCoin,
        settleCoin,
        depositAmount,
        depositNetwork,
        settleNetwork,
        affiliateId,
      } = body;

      if (!depositCoin || !settleCoin || !depositAmount) {
        return NextResponse.json(
          { message: 'Missing required fields for SideShift swap' },
          { status: 400 }
        );
      }

      const sideShift = new SideShiftProvider();

      // Get a fresh quote
      const quote = await sideShift.getQuote(
        depositCoin,
        settleCoin,
        depositAmount,
        depositNetwork,
        settleNetwork
      );

      if (!quote) {
        return NextResponse.json(
          { message: 'Failed to get quote from SideShift' },
          { status: 400 }
        );
      }

      // Create the shift
      const shift = await (sideShift as any).createShift?.(
        (quote as any).id || quote,
        settleAddress,
        refundAddress,
        affiliateId
      );

      return NextResponse.json({
        success: true,
        provider: 'sideshift',
        shift: shift || quote,
        quote,
        requestId,
      });
    }

    return NextResponse.json(
      { message: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  } catch (error: any) {
    log.error({ error: error.message }, 'Swap request failed');
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
