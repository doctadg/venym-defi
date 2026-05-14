import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ArrowDown } from 'lucide-react';
import { QuoteResult } from '@/lib/hooks/useImprovedAutoQuote';

interface LifiPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteResult | null;
  onConfirm: () => void;
  fromAmount: string; // Add fromAmount as a prop
}

const LifiPreviewModal: React.FC<LifiPreviewModalProps> = ({ isOpen, onClose, quote, onConfirm, fromAmount }) => {
  if (!quote || !quote.fromToken || !quote.toToken) return null;

  const { fromToken, toToken, toAmount, fees, estimatedTime } = quote;

  // Calculate USD values (placeholder - you may want to fetch real prices)
  const fromUsdValue = (parseFloat(fromAmount) * 2499.57).toFixed(2); // Example ETH price
  const toUsdValue = (parseFloat(toAmount) * 1.00).toFixed(2); // Example USDC price

  // Calculate price impact (placeholder calculation)
  const priceImpact = "+0.66%";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black text-white border-0 rounded-2xl shadow-2xl max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold text-white">Review Swap</h2>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* From Token */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {fromToken.symbol.slice(0, 2)}
                </div>
                {/* Chain badge - you can customize this based on chain */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-900"></div>
              </div>
              <div>
                <p className="font-semibold text-white">{fromToken.symbol}</p>
                <p className="text-sm text-gray-400">{fromToken.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">{fromAmount}</p>
              <p className="text-sm text-gray-400">${fromUsdValue}</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-[#0ff378] rounded-full flex items-center justify-center">
              <ArrowDown size={20} className="text-white" />
            </div>
          </div>

          {/* To Token */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-white text-sm font-bold">
                  {toToken.symbol.slice(0, 2)}
                </div>
                {/* Chain badge - you can customize this based on chain */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
              </div>
              <div>
                <p className="font-semibold text-white">{toToken.symbol}</p>
                <p className="text-sm text-gray-400">{toToken.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white/80">{parseFloat(toAmount).toLocaleString('en-US', { maximumFractionDigits: 4 })}</p>
              <p className="text-sm text-gray-400">${toUsdValue}</p>
            </div>
          </div>

          {/* Route Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Route Details</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-400">Time:</span>
              </div>
              <span className="text-sm font-medium text-white">{estimatedTime}s</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm">$</span>
                <span className="text-sm text-gray-400">Gas:</span>
              </div>
              <span className="text-sm font-medium text-white">${fees?.total || '0.00'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-orange-500 text-sm">📈</span>
                <span className="text-sm text-gray-400">Impact:</span>
              </div>
              <span className="text-sm font-medium text-white/80">{priceImpact}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Via:</span>
              <span className="px-3 py-1 bg-[#0ff378]/30 text-[#0ff378] text-xs font-medium rounded-full">
                {quote.actualProvider || quote.provider}
              </span>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <h3 className="font-semibold text-white">Destination</h3>
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Send to:</p>
              <p className="text-sm font-mono text-gray-300 break-all">
                0xA5BD439c4d4Fc7cA8B14A9FE77fd5C4FFd7e4996
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1 bg-white/80 hover:bg-white/10 text-white"
            >
              Confirm Swap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LifiPreviewModal;
