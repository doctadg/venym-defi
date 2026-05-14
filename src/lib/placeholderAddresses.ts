import { ChainMappingService } from '@/services/swap/chainMapping';

// Placeholder addresses for different chain types
// These are used to generate preview quotes before wallet connection
export const PLACEHOLDER_ADDRESSES = {
  // EVM chains - using a real address that works with routing providers
  EVM: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
  
  // Solana - using a real address that works with routing providers
  SVM: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
  
  // Bitcoin - using a real address that works with routing providers (P2PKH format)
  UTXO: 'bc1ql49ydapnjafl5t2cp9zqpjwe6pdgmxy98859v2',
  
  // Sui - using a real address that works with routing providers
  MVM: '0x935029ca5219502a47ac9b69f556ccf6e2198b5e7815cf50f68846f723739cbd'
};

export class PlaceholderAddressService {
  /**
   * Get placeholder address for a specific chain
   */
  static getPlaceholderAddress(chainId: string | number): string {
    const chainMapping = ChainMappingService.getByLiFiChainId(chainId);
    
    if (!chainMapping) {
      // Default to EVM if chain not found
      return PLACEHOLDER_ADDRESSES.EVM;
    }
    
    switch (chainMapping.chainType) {
      case 'EVM':
        return PLACEHOLDER_ADDRESSES.EVM;
      case 'SVM':
        return PLACEHOLDER_ADDRESSES.SVM;
      case 'UTXO':
        return PLACEHOLDER_ADDRESSES.UTXO;
      case 'MVM':
        return PLACEHOLDER_ADDRESSES.MVM;
      default:
        return PLACEHOLDER_ADDRESSES.EVM;
    }
  }
  
  /**
   * Get placeholder addresses for both from and to chains
   */
  static getPlaceholderAddresses(fromChainId: string | number, toChainId: string | number): {
    fromAddress: string;
    toAddress: string;
  } {
    return {
      fromAddress: this.getPlaceholderAddress(fromChainId),
      toAddress: this.getPlaceholderAddress(toChainId)
    };
  }
  
  /**
   * Check if an address is a placeholder address
   */
  static isPlaceholderAddress(address: string): boolean {
    return Object.values(PLACEHOLDER_ADDRESSES).includes(address);
  }
  
  /**
   * Get the appropriate address for quote generation
   * Uses connected wallet address if available, otherwise uses placeholder
   */
  static getQuoteAddress(
    chainId: string | number,
    connectedAddress?: string,
    isConnectedToCorrectChain: boolean = false
  ): string {
    // If wallet is connected and on the correct chain, use the connected address
    if (connectedAddress && isConnectedToCorrectChain) {
      return connectedAddress;
    }
    
    // Otherwise, use placeholder address
    return this.getPlaceholderAddress(chainId);
  }
  
  /**
   * Determine if we should show a preview quote or final quote
   */
  static shouldShowPreviewQuote(
    fromAddress?: string,
    toAddress?: string
  ): { isPreview: boolean; reason?: string } {
    const fromIsPlaceholder = fromAddress ? this.isPlaceholderAddress(fromAddress) : true;
    const toIsPlaceholder = toAddress ? this.isPlaceholderAddress(toAddress) : true;
    
    if (fromIsPlaceholder && toIsPlaceholder) {
      return { isPreview: true, reason: 'Connect wallet and enter destination address for final quote' };
    }
    
    if (fromIsPlaceholder) {
      return { isPreview: true, reason: 'Connect wallet for final quote' };
    }
    
    if (toIsPlaceholder) {
      return { isPreview: true, reason: 'Enter destination address for final quote' };
    }
    
    return { isPreview: false };
  }
}
