import { formatTokenPrice } from "./format";
import { StandardizedAsset } from '@/types/asset';

export interface CalculateFeeParams {
  fromAmount: string | bigint;
  fromToken: StandardizedAsset;
  toToken: StandardizedAsset;
}

export async function calculateFee(params: CalculateFeeParams) {
  const { fromAmount } = params;

  const amountInUSD = formatTokenPrice(
    fromAmount,
    (params.fromToken.priceUsd || 0).toString(),
    params.fromToken.decimals
  );

  const sourceStablecoinTokenAddresses = getStablecoinTokenAddresses(
    params.fromToken.chainId
  );

  const destinationStablecoinTokenAddresses = getStablecoinTokenAddresses(
    params.toToken.chainId
  );

  const fromTokenAddress = params.fromToken.address.toLowerCase();
  const toTokenAddress = params.toToken.address.toLowerCase();

  const isSourceStablecoin = sourceStablecoinTokenAddresses.some(
    (token) => token.address.toLowerCase() === fromTokenAddress
  );

  const isDestinationStablecoin = destinationStablecoinTokenAddresses.some(
    (token) => token.address.toLowerCase() === toTokenAddress
  );

  if (isSourceStablecoin && isDestinationStablecoin) {
    if (amountInUSD <= 100_000) {
      return 0.001; // 0.10%
    } else if (amountInUSD <= 1_000_000) {
      return 0.0007; // 0.07%
    } else {
      return 0.0005; // 0.05%
    }
  } else {
    if (amountInUSD <= 100_000) {
      return 0.0035; // 0.35%
    } else if (amountInUSD <= 1_000_000) {
      return 0.002; // 0.20%
    } else {
      return 0.001; // 0.10%
    }
  }
}

export const getStablecoinTokenAddresses = (
  chainId: number | string
): { address: string }[] => {
  // Common stablecoin addresses for different chains
  const stablecoins: Record<string, string[]> = {
    // Ethereum
    '1': [
      '0xa0b86a33e6776d0ad2dedf600fe53e1d70e0cccb', // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    ],
    // Polygon
    '137': [
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
      '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
    ],
    // BSC
    '56': [
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
      '0x55d398326f99059ff775485246999027b3197955', // USDT
      '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', // DAI
    ],
    // Arbitrum
    '42161': [
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
      '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
    ],
    // Optimism
    '10': [
      '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
      '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
      '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
    ],
  };

  const addresses = stablecoins[chainId.toString()] || [];
  return addresses.map(address => ({ address }));
};