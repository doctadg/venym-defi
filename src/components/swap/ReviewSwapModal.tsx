import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Clock, DollarSign, Wallet, Settings } from "lucide-react";
import { StandardizedAsset } from "@/types/asset";
import { QuoteResult } from "@/lib/hooks/useImprovedAutoQuote";
import { useState, useEffect } from "react";
import { walletAdapter, WALLET_DEFINITIONS, type WalletInfo } from "@/lib/wallets";
import { WalletSelector } from "@/components/swap/WalletSelector";

interface ConnectedWallet {
  address: string;
  chainId: number | string;
  walletId: string;
}

interface ReviewSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromToken: StandardizedAsset | undefined;
  toToken: StandardizedAsset | undefined;
  fromAmount: string;
  walletAddress: string;
  quote: QuoteResult | null;
  isLoading?: boolean;
  connectedWallet?: ConnectedWallet | null;
  onRefreshQuotes?: () => void;
  onWalletConnect?: (address: string, chainId: string | number, walletId: string) => void;
}

const ReviewSwapModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fromToken, 
  toToken, 
  fromAmount, 
  walletAddress,
  quote,
  isLoading = false,
  connectedWallet,
  onRefreshQuotes,
  onWalletConnect
}: ReviewSwapModalProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  
  // Check if wallet connection is required for this provider
  const requiresWalletConnection = quote?.provider === 'lifi'

  // Refresh quotes when modal opens
  useEffect(() => {
    if (isOpen && onRefreshQuotes) {
      onRefreshQuotes()
    }
  }, [isOpen, onRefreshQuotes])

  // Handle continue button click - simplified since wallet is managed by parent
  const handleContinue = () => {
    console.log('handleContinue called', { requiresWalletConnection, connectedWallet })
    console.log('Calling onConfirm from ReviewSwapModal')
    onConfirm()
  }

  const handleWalletChange = () => {
    setShowWalletSelector(true);
  }

  const handleWalletConnect = (address: string, chainId: string | number, walletId: string) => {
    onWalletConnect?.(address, chainId, walletId);
    setShowWalletSelector(false);
  }

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletInfo = (walletId: string): WalletInfo | undefined => {
    return WALLET_DEFINITIONS.find(w => w.id === walletId);
  };
  
  const TokenAvatar = ({ token, size = "w-10 h-10" }: { token: StandardizedAsset; size?: string }) => {
    if (!token.logoUrl) {
      return (
        <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-[#0ff378] flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
          {token.symbol.slice(0, 2)}
        </div>
      );
    }

    return (
      <img 
        src={token.logoUrl} 
        alt={token.symbol}
        className={`${size} rounded-full object-cover shadow-sm`}
      />
    );
  };

  const ChainAvatar = ({ chain, size = "w-6 h-6" }: { chain: any; size?: string }) => {
    if (!chain.logoUrl) {
      return (
        <div className={`${size} rounded-full bg-gradient-to-br from-white/10 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}>
          {chain.name.slice(0, 1)}
        </div>
      );
    }

    return (
      <img 
        src={chain.logoUrl} 
        alt={chain.name}
        className={`${size} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    );
  };

  const getRouteTime = () => {
    if (quote?.estimatedTime) {
      const timeInMinutes = Math.round(quote.estimatedTime / 60);
      return timeInMinutes < 1 ? '< 1m' : `${timeInMinutes}m`;
    }
    return '2-5m';
  };

  const getRouteFee = () => {
    if (quote?.fees) {
      const feeInUsd = parseFloat(quote.fees.total);
      return `$${feeInUsd.toFixed(2)}`;
    }
    return '$0.00';
  };

  const getActualProvider = () => {
    if (quote?.actualProvider) {
      return quote.actualProvider;
    }
    return quote?.provider || 'Unknown';
  };

  const getToAmount = () => {
    if (quote?.toAmount && toToken) {
      return quote.toAmount;
    }
    return '0';
  };

  if (!fromToken || !toToken || !quote) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-900 w-full max-w-sm md:max-w-md rounded-2xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center text-black">Review Swap</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2">
          {/* Token Flow Display */}
          <div className="space-y-4">
            {/* From Token */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <TokenAvatar token={fromToken} />
                  <div className="absolute -bottom-1 -right-1">
                    <ChainAvatar chain={{ logoUrl: fromToken.chainLogoUrl, name: fromToken.chainName }} />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">{fromToken.symbol}</div>
                  <div className="text-sm text-gray-500">{fromToken.chainName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{fromAmount}</div>
                {fromToken.priceUsd && (
                  <div className="text-sm text-gray-500">
                    ${(parseFloat(fromAmount) * parseFloat(fromToken.priceUsd.toString())).toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-[#0ff378] rounded-full shadow-sm">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* To Token */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/5 rounded-2xl border border-white/10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <TokenAvatar token={toToken} />
                  <div className="absolute -bottom-1 -right-1">
                    <ChainAvatar chain={{ logoUrl: toToken.chainLogoUrl, name: toToken.chainName }} />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">{toToken.symbol}</div>
                  <div className="text-sm text-gray-500">{toToken.chainName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {getToAmount()}
                </div>
                <div className="text-sm text-gray-500">
                  Est. amount
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route Details */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Route Details</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{getRouteTime()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-white" />
                <span className="text-gray-600">Fees:</span>
                <span className="font-medium">{getRouteFee()}</span>
              </div>
            </div>

            {/* Provider Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Via:</span>
              <Badge className="bg-gradient-to-r from-blue-500 to-[#0ff378] text-white border-0">
                {getActualProvider()}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Connected Wallet Display for LiFi */}
          {requiresWalletConnection && connectedWallet && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Connected Wallet
              </h4>
              <div className="flex items-center justify-between bg-[#272B2E] rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const walletInfo = getWalletInfo(connectedWallet.walletId);
                    return walletInfo?.icon ? (
                      <img 
                        src={walletInfo.icon} 
                        alt={walletInfo.name}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-2xl">🔗</div>
                    );
                  })()}
                  <div>
                    <div className="text-white font-medium">{getWalletInfo(connectedWallet.walletId)?.name || 'Connected Wallet'}</div>
                    <div className="text-gray-400 text-sm">{formatAddress(connectedWallet.address)}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWalletChange}
                  className="text-white border-gray-600 hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {requiresWalletConnection && connectedWallet && <Separator />}

          {/* Destination */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">Destination</h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Send to:</div>
              <div className="font-mono text-sm font-medium break-all">
                {walletAddress}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            className="flex-1 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/10 hover:to-white/5 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Confirming...
              </div>
            ) : requiresWalletConnection && !connectedWallet ? (
              'Continue'
            ) : (
              'Confirm Swap'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Wallet Selector Modal */}
    {showWalletSelector && (
      <WalletSelector
        fromToken={fromToken}
        onWalletConnect={handleWalletConnect}
        onClose={() => setShowWalletSelector(false)}
        onError={(error) => console.error('Wallet connection error:', error)}
      />
    )}
  </>
  );
};

export default ReviewSwapModal;
