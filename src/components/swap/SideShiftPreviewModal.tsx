import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TokenAvatar } from '@/components/ui/TokenAvatar';
import ChainAvatar from '@/components/ui/ChainAvatar';
import { StandardizedAsset } from '@/types/asset';

interface SideShiftPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAddress: string;
  settleAddress: string;
  depositAmount: string;
  settleAmount: string;
  fromToken: StandardizedAsset; // Changed to StandardizedAsset
  toToken: StandardizedAsset;   // Changed to StandardizedAsset
  estimatedTime?: number;
  fees?: {
    total: string;
  };
  onConfirm: () => void;
}

const SideShiftPreviewModal: React.FC<SideShiftPreviewModalProps> = ({
  isOpen,
  onClose,
  depositAddress,
  settleAddress,
  depositAmount,
  settleAmount,
  fromToken,
  toToken,
  estimatedTime = 300, // Default 5 minutes
  fees,
  onConfirm,
}) => {
  if (!fromToken || !toToken) return null; // Add null check

  // Remove USD calculations as requested - only show token values
  
  // Calculate price impact (placeholder)
  const priceImpact = "+0.12%";

  const getRouteTime = () => {
    if (estimatedTime) {
      const timeInMinutes = Math.round(estimatedTime / 60);
      return timeInMinutes < 1 ? '< 1m' : `${timeInMinutes}m`;
    }
    return '2-5m';
  };

  const getRouteFee = () => {
    if (fees) {
      const feeInUsd = parseFloat(fees.total);
      return `$${feeInUsd.toFixed(2)}`;
    }
    return '$0.00';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-900 max-w-md rounded-2xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-hidden">
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
                    <ChainAvatar chain={{ logoUrl: fromToken.chainLogoUrl || '', name: fromToken.chainName || '' }} />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">{fromToken.symbol}</div>
                  <div className="text-sm text-gray-500">{fromToken.chainName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{depositAmount}</div>
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
                    <ChainAvatar chain={{ logoUrl: toToken.chainLogoUrl || '', name: toToken.chainName || '' }} />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">{toToken.symbol}</div>
                  <div className="text-sm text-gray-500">{toToken.chainName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {parseFloat(settleAmount).toLocaleString('en-US', { maximumFractionDigits: 8 })}
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
                SideShift
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Deposit Instructions */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">Send Your {fromToken.symbol.toUpperCase()}</h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Send {depositAmount} {fromToken.symbol.toUpperCase()} to:</div>
              <div className="font-mono text-sm font-medium break-all">
                {depositAddress || 'Deposit address will be generated after confirmation'}
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">You'll Receive {toToken.symbol.toUpperCase()}</h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Your {toToken.symbol.toUpperCase()} will be sent to:</div>
              <div className="font-mono text-sm font-medium break-all">
                {settleAddress}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/10 hover:to-white/5 text-white"
          >
            Confirm Swap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SideShiftPreviewModal;
