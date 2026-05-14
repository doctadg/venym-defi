import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { StandardizedAsset } from '@/types/asset';
import axios from 'axios';
import type { SideShiftShiftStatus } from '@/services/swap/providers/sideshift/types';

interface SwapStep {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  txHash?: string;
  fromChain: string;
  toChain: string;
  tool: string;
  actualProvider?: string;
  progress: number;
  message: string;
}

interface SwapStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: SwapStep[];
  onRetry?: () => void;
  swapResult: any;
  fromToken: StandardizedAsset | undefined;
  toToken: StandardizedAsset | undefined;
  fromAmount: string;
  toAmount: string;
  destinationAddress: string;
}

const SwapStatusModal = ({ 
  isOpen, 
  onClose, 
  steps: initialSteps,
  onRetry,
  swapResult,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  destinationAddress
}: SwapStatusModalProps) => {
  
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const isSideShiftSwap = swapResult?.provider === 'sideshift';
  const shiftId = swapResult?.shiftId;
  
  const [sideshiftStatus, setSideshiftStatus] = useState<SideShiftShiftStatus | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [steps, setSteps] = useState<SwapStep[]>(initialSteps); // Reverted to initialSteps

  // Update internal steps when prop changes
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTx(text);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedTx(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const fetchSideShiftStatus = useCallback(async () => {
    if (!shiftId) return;

    try {
      const response = await axios.get<SideShiftShiftStatus>(`/api/v1/sideshift/shifts/${shiftId}`);
      const statusData = response.data;
      setSideshiftStatus(statusData);
      console.log('Sideshift API Status:', statusData.status);

      let newStatus: SwapStep['status'] = 'processing';
      let newMessage = 'Waiting for deposit...';
      let newProgress = 0;

      switch (statusData.status) {
        case 'awaiting_deposit':
          newStatus = 'processing';
          newMessage = 'Waiting for transfer';
          newProgress = 25;
          break;
        case 'processing':
          newStatus = 'processing';
          newMessage = 'Processing swap...';
          newProgress = 75;
          break;
        case 'settled':
          newStatus = 'completed';
          newMessage = 'Swap successful! Funds transferred.';
          newProgress = 100;
          break;
        case 'refunded':
          newStatus = 'failed';
          newMessage = 'Swap refunded. Funds returned.';
          newProgress = 100;
          break;
        case 'expired':
          newStatus = 'failed';
          newMessage = 'Swap expired. Please try again.';
          newProgress = 100;
          break;
        case 'failed':
          newStatus = 'failed';
          newMessage = 'Swap failed. Please try again.';
          newProgress = 100;
          break;
        default:
          newStatus = 'processing';
          newMessage = `Processing: ${statusData.status}`;
          newProgress = 50;
      }

      setSteps(prevSteps => {
        const updatedSteps = [...prevSteps];
        if (updatedSteps.length > 0) {
          updatedSteps[0] = {
            ...updatedSteps[0],
            status: newStatus,
            message: newMessage,
            progress: newProgress,
            txHash: statusData.depositHash || statusData.settleHash || statusData.id,
            tool: 'sideshift',
            actualProvider: 'SideShift',
          };
        }
        return updatedSteps;
      });

      if (['settled', 'refunded', 'expired', 'failed'].includes(statusData.status)) {
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
          setPollingIntervalId(null);
        }
      }

    } catch (error) {
      console.error('Error fetching Sideshift status:', error);
    }
  }, [shiftId, pollingIntervalId]);

  useEffect(() => {
    if (isOpen && isSideShiftSwap && shiftId) {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
      fetchSideShiftStatus();
      const interval = setInterval(fetchSideShiftStatus, 10000);
      setPollingIntervalId(interval);
    } else if (!isOpen && pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [isOpen, isSideShiftSwap, shiftId, fetchSideShiftStatus, pollingIntervalId]);

  const getExplorerUrl = (txHash: string, chainName: string) => {
    // Map chain names to explorer URLs
    const explorers: { [key: string]: string } = {
      'Ethereum': 'https://etherscan.io/tx/',
      'Polygon': 'https://polygonscan.com/tx/',
      'BNB Smart Chain': 'https://bscscan.com/tx/',
      'Avalanche': 'https://snowtrace.io/tx/',
      'Fantom': 'https://ftmscan.com/tx/',
      'Arbitrum': 'https://arbiscan.io/tx/',
      'Optimism': 'https://optimistic.etherscan.io/tx/',
      'Base': 'https://basescan.org/tx/',
    };
    
    return explorers[chainName] ? `${explorers[chainName]}${txHash}` : null;
  };

  const getStatusIcon = (status: SwapStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-white/80" />;
      case 'processing':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SwapStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-white/5 border-white/10';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'cancelled':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const overallProgress = steps.length > 0 ? 
    Math.max(
      (steps.filter(step => step.status === 'completed').length / steps.length) * 100,
      steps.reduce((max, step) => Math.max(max, step.progress), 0)
    ) : 0;

  const overallStatus = steps.length === 0 ? 'processing' :
    steps.every(step => step.status === 'completed') ? 'completed' :
    steps.some(step => step.status === 'failed') ? 'failed' :
    steps.some(step => step.status === 'cancelled') ? 'cancelled' : 'processing';

  if (steps.length === 0 || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg rounded-2xl sm:rounded-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-center">
            {isSideShiftSwap && sideshiftStatus?.status === 'awaiting_deposit'
              ? 'Waiting for Transfer'
              : overallStatus === 'completed'
                ? 'Swap Completed'
                : overallStatus === 'failed'
                  ? 'Swap Failed'
                  : overallStatus === 'cancelled'
                    ? 'Swap Cancelled'
                    : 'Swap in Progress'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4">
          {/* Header */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {fromToken?.symbol.toUpperCase()} ({fromToken?.chainName}) → {toToken?.symbol.toUpperCase()} ({toToken?.chainName})
            </div>
            <div className="text-sm text-gray-600">Cross-chain swap in progress</div>
          </div>

          {isSideShiftSwap && sideshiftStatus && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">SideShift Deposit Details</h4>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-700 mb-1">Send {fromAmount} {fromToken?.symbol.toUpperCase()} to:</p>
                <p className="text-sm font-mono text-blue-900 break-all font-medium">
                  {sideshiftStatus.depositAddress}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => copyToClipboard(sideshiftStatus.depositAddress, 'Deposit address')}
                    className="p-1 hover:bg-blue-200 rounded flex items-center gap-1 text-blue-700 text-xs"
                  >
                    {copiedTx === sideshiftStatus.depositAddress ? (
                      <CheckCircle className="w-3 h-3 text-white/80" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy Address
                  </button>
                </div>
                {sideshiftStatus.expiresAt && (
                  <p className="text-xs text-blue-600 mt-2">
                    Expires: {new Date(sideshiftStatus.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Overall Progress */}
          <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          
          {sideshiftStatus?.depositHash && (
            <div className="text-sm text-gray-600 mt-2">
              <span className="font-medium">Deposit TX:</span> 
              <span className="font-mono ml-1 text-xs">
                {sideshiftStatus.depositHash.slice(0, 10)}...{sideshiftStatus.depositHash.slice(-8)}
              </span>
            </div>
          )}
          {sideshiftStatus?.settleHash && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Settlement TX:</span> 
              <span className="font-mono ml-1 text-xs">
                {sideshiftStatus.settleHash.slice(0, 10)}...{sideshiftStatus.settleHash.slice(-8)}
              </span>
            </div>
          )}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Transaction Steps</h4>
            
            <div className="space-y-3">
              <AnimatePresence>
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${getStatusColor(step.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getStatusIcon(step.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">
                            Step {index + 1}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {step.actualProvider || step.tool}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mt-1">
                          {step.message}
                        </div>
                        
                        {step.status === 'processing' && step.progress > 0 && (
                          <div className="mt-2">
                            <Progress value={step.progress} className="h-1" />
                          </div>
                        )}
                        
                        {step.txHash && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-gray-500 font-mono truncate">
                              {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                            </div>
                            
                            <button
                              onClick={() => copyToClipboard(step.txHash!, 'Transaction hash')}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {copiedTx === step.txHash ? (
                                <CheckCircle className="w-3 h-3 text-white/80" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            
                            {getExplorerUrl(step.txHash, step.fromChain) && (
                              <a
                                href={getExplorerUrl(step.txHash, step.fromChain)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <ExternalLink className="w-3 h-3 text-gray-500" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Status Messages */}
          {overallStatus === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-white/5 border border-white/10 rounded-lg text-center"
            >
              <CheckCircle className="w-8 h-8 text-white/80 mx-auto mb-2" />
              <div className="font-medium text-white">Swap Completed Successfully!</div>
              <div className="text-sm text-white/80 mt-1">
                Your tokens have been sent to your destination wallet.
              </div>
            </motion.div>
          )}

          {overallStatus === 'failed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-center"
            >
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="font-medium text-red-800">Swap Failed</div>
              <div className="text-sm text-red-600 mt-1">
                Please check the transaction details and try again.
              </div>
            </motion.div>
          )}

          {overallStatus === 'cancelled' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center"
            >
              <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="font-medium text-orange-800">Transaction Cancelled</div>
              <div className="text-sm text-orange-600 mt-1">
                The transaction was cancelled by the user. You can try again.
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {overallStatus === 'completed' || overallStatus === 'failed' || overallStatus === 'cancelled' ? (
            <Button 
              onClick={() => {
                if (overallStatus === 'failed' || overallStatus === 'cancelled') {
                  onRetry?.();
                }
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Over
            </Button>
          ) : (
            <>
              {(overallStatus === 'processing' || overallStatus === 'pending') && (
                <Button 
                  onClick={onClose}
                  className="w-full"
                >
                  Hide Progress
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwapStatusModal;
