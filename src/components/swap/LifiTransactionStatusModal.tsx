import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, Copy, ExternalLink, ArrowRight } from 'lucide-react';

interface TransactionStep {
  id: string;
  title: string;
  status: 'completed' | 'pending' | 'failed' | 'in_progress';
  txHash?: string;
  provider?: string;
  substatus?: string;
  substatusMessage?: string;
  toolDetails?: {
    name: string;
    logoURI?: string;
  };
}

interface LifiTransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromToken: {
    symbol: string;
    logoURI: string;
  };
  toToken: {
    symbol: string;
    logoURI: string;
  };
  steps: TransactionStep[];
  isCompleted: boolean;
  overallProgress: number;
}

const LifiTransactionStatusModal: React.FC<LifiTransactionStatusModalProps> = ({
  isOpen,
  onClose,
  fromToken,
  toToken,
  steps,
  isCompleted,
  overallProgress,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (txHash: string) => {
    // You can customize this based on the chain
    window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
  };

  const formatTxHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getSubstatusDisplay = (substatus?: string) => {
    if (!substatus) return 'Processing...';

    switch (substatus) {
      case 'WAIT_SOURCE_CONFIRMATIONS':
        return 'Waiting for source chain confirmations';
      case 'WAIT_DESTINATION_TRANSACTION':
        return 'Processing destination transaction';
      case 'BRIDGE_NOT_AVAILABLE':
        return 'Bridge temporarily unavailable';
      case 'COMPLETED':
        return 'Transaction completed, finalizing';
      default:
        return substatus.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black text-white border-0 rounded-2xl shadow-2xl max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold text-white">
            {isCompleted ? 'Swap Completed' : 'Swap in Progress'}
          </h2>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Token Swap Display */}
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {fromToken.symbol.slice(0, 2)}
              </div>
              <span className="font-semibold text-white">{fromToken.symbol}</span>
            </div>
            <ArrowRight size={20} className="text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-white text-xs font-bold">
                {toToken.symbol.slice(0, 2)}
              </div>
              <span className="font-semibold text-white">{toToken.symbol}</span>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Overall Progress</span>
              <span className="text-sm font-semibold text-white">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Transaction Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Transaction Steps</h3>
            
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`p-4 rounded-xl border ${
                  step.status === 'completed'
                    ? 'bg-white/5 border-white/10'
                    : step.status === 'in_progress'
                    ? 'bg-blue-900/20 border-blue-500/30'
                    : step.status === 'pending'
                    ? 'bg-yellow-900/20 border-yellow-500/30'
                    : 'bg-red-900/20 border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status === 'completed'
                        ? 'bg-white'
                        : step.status === 'in_progress'
                        ? 'bg-blue-500'
                        : step.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}>
                      {step.status === 'completed' && <Check size={14} className="text-white" />}
                      {step.status === 'in_progress' && <div className="w-2 h-2 bg-white rounded-full animate-spin" />}
                      {step.status === 'pending' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                      {step.status === 'failed' && <X size={14} className="text-white" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{step.title}</span>
                      {step.substatus && step.status === 'in_progress' && (
                        <span className="text-xs text-blue-400">
                          {step.substatusMessage || getSubstatusDisplay(step.substatus)}
                        </span>
                      )}
                    </div>
                  </div>
                  {step.provider && (
                    <span className="text-sm font-medium text-gray-400">
                      {step.provider === 'lifi' && step.toolDetails?.name
                        ? step.toolDetails.name
                        : step.provider}
                    </span>
                  )}
                </div>

                {step.status === 'completed' && (
                  <p className="text-sm text-white/80 mb-2">
                    {step.title} completed successfully!
                  </p>
                )}

                {step.status === 'in_progress' && (
                  <p className="text-sm text-blue-400 mb-2">
                    {step.substatusMessage || getSubstatusDisplay(step.substatus)}
                  </p>
                )}
                
                {step.txHash && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-gray-400">
                      {formatTxHash(step.txHash)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(step.txHash!)}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => openInExplorer(step.txHash!)}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Success Message */}
          {isCompleted && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white/80 mb-2">
                  Swap Completed Successfully!
                </h3>
                <p className="text-sm text-gray-400">
                  Your tokens have been sent to your destination wallet
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <Button 
            onClick={onClose}
            className="w-full bg-white/80 hover:bg-white/10 text-white py-3 rounded-xl font-medium"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LifiTransactionStatusModal;
