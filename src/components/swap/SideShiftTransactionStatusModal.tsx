import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SideShiftShiftStatus } from '@/services/swap/providers/sideshift/types';

interface TransactionStep {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  fromChain: string;
  toChain: string;
  tool: string;
  actualProvider?: string;
  progress: number;
  message: string;
}

interface SideShiftTransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromCoin: string;
  toCoin: string;
  steps: TransactionStep[];
  isCompleted: boolean;
  overallProgress: number;
  onNewSwap?: () => void;
  depositAddress?: string;
  depositAmount?: string;
  shiftId?: string; // Add shiftId for polling
}

const SideShiftTransactionStatusModal: React.FC<SideShiftTransactionStatusModalProps> = ({
  isOpen,
  onClose,
  fromCoin,
  toCoin,
  steps: initialSteps,
  isCompleted: initialIsCompleted,
  overallProgress: initialOverallProgress,
  onNewSwap,
  depositAddress,
  depositAmount,
  shiftId
}) => {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [sideshiftStatus, setSideshiftStatus] = useState<SideShiftShiftStatus | null>(null);
  const [currentProgress, setCurrentProgress] = useState(initialOverallProgress);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [steps, setSteps] = useState(initialSteps);

  // Polling logic for SideShift status
  const fetchSideShiftStatus = useCallback(async () => {
    if (!shiftId) return;

    try {
      const response = await fetch(`/api/v1/sideshift/shifts/${shiftId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SideShiftShiftStatus = await response.json();
      setSideshiftStatus(data);
      console.log('SideShift status received:', data);

      // Update progress based on status
      let newProgress = 0;
      let completed = false;

      switch (data.status) {
        case 'awaiting_deposit':
          newProgress = 25;
          break;
        case 'processing':
          newProgress = 75;
          break;
        case 'settled':
          newProgress = 100;
          completed = true;
          break;
        case 'refunded':
        case 'expired':
        case 'failed':
          newProgress = 0;
          completed = true;
          break;
        default:
          newProgress = 50;
      }

      setCurrentProgress(newProgress);
      setIsCompleted(completed);

      // Update steps based on status
      const newSteps: TransactionStep[] = [];
      
      if (data.status === 'awaiting_deposit') {
        newSteps.push({
          id: 'deposit',
          title: 'Awaiting Deposit',
          status: 'pending',
          fromChain: 'Unknown',
          toChain: 'Unknown',
          tool: 'SideShift',
          actualProvider: 'SideShift',
          progress: 25,
          message: 'Waiting for your deposit...'
        });
      } else if (data.status === 'processing') {
        newSteps.push({
          id: 'deposit',
          title: 'Deposit Received',
          status: 'completed',
          fromChain: 'Unknown',
          toChain: 'Unknown',
          tool: 'SideShift',
          actualProvider: 'SideShift',
          progress: 100,
          message: 'Deposit received and confirmed.'
        });
        newSteps.push({
          id: 'processing',
          title: 'Processing Swap',
          status: 'pending',
          fromChain: 'Unknown',
          toChain: 'Unknown',
          tool: 'SideShift',
          actualProvider: 'SideShift',
          progress: 75,
          message: 'SideShift is processing your swap...'
        });
      } else if (data.status === 'settled') {
        newSteps.push({
          id: 'completed',
          title: 'Transaction Completed',
          status: 'completed',
          fromChain: 'Unknown',
          toChain: 'Unknown',
          tool: 'SideShift',
          actualProvider: 'SideShift',
          progress: 100,
          message: 'Funds have been sent to your destination address!',
          txHash: data.settleHash
        });
      } else if (['failed', 'expired', 'refunded'].includes(data.status)) {
        newSteps.push({
          id: 'failed',
          title: 'Swap Failed',
          status: 'failed',
          fromChain: 'Unknown',
          toChain: 'Unknown',
          tool: 'SideShift',
          actualProvider: 'SideShift',
          progress: 0,
          message: `Swap ${data.status}: ${data.status === 'expired' ? 'The swap expired' : data.status === 'refunded' ? 'Funds have been refunded' : 'The swap failed'}`
        });
      }

      setSteps(newSteps);

    } catch (error) {
      console.error('Failed to fetch SideShift status:', error);
    }
  }, [shiftId]);

  // Set up polling when modal opens and we have a shiftId
  useEffect(() => {
    if (!isOpen || !shiftId) return;

    fetchSideShiftStatus(); // Fetch immediately
    const interval = setInterval(fetchSideShiftStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isOpen, shiftId, fetchSideShiftStatus]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTx(text);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedTx(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const getOverallStatus = () => {
    if (steps.some(step => step.status === 'failed')) return 'failed';
    if (isCompleted) return 'completed';
    return 'pending';
  };

  const overallStatus = getOverallStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-white/80" />;
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-white/80';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getDynamicTitle = () => {
    if (sideshiftStatus) {
      switch (sideshiftStatus.status) {
        case 'awaiting_deposit':
          return 'Waiting for Deposit';
        case 'processing':
          return 'Pending Confirmation';
        case 'settled':
          return 'Swap Completed!';
        case 'failed':
        case 'expired':
        case 'refunded':
          return 'Swap Failed';
        default:
          return 'Swap in Progress';
      }
    }
    
    // Fallback to original logic if no sideshiftStatus
    return overallStatus === 'completed' ? 'Swap Completed!' : 
           overallStatus === 'failed' ? 'Swap Failed' : 'Swap in Progress';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-900 max-w-md rounded-2xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-center text-black flex items-center justify-center gap-2">
            {getStatusIcon(overallStatus)}
            {getDynamicTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className={`font-medium ${getStatusColor(overallStatus)}`}>
                {currentProgress}%
              </span>
            </div>
            <Progress 
              value={currentProgress} 
              className="h-2"
            />
          </div>

          {/* Swap Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Swapping</div>
              <div className="font-bold text-lg">
                {fromCoin.toUpperCase()} → {toCoin.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Deposit Address Section - Show when we have deposit address and status is awaiting deposit */}
          {depositAddress && overallStatus === 'pending' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Send Your {fromCoin.toUpperCase()}</h4>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  Send {depositAmount || 'your'} {fromCoin.toUpperCase()} to this address:
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm font-medium break-all flex-1 bg-white p-2 rounded border">
                    {depositAddress}
                  </div>
                  <button
                    onClick={() => copyToClipboard(depositAddress, 'Deposit address')}
                    className="p-2 hover:bg-blue-100 rounded"
                  >
                    {copiedTx === depositAddress ? (
                      <CheckCircle className="w-4 h-4 text-white/80" />
                    ) : (
                      <Copy className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  ⚠️ Only send {fromCoin.toUpperCase()} to this address. Sending other tokens will result in permanent loss.
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Transaction Steps</h4>
            
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-white/80" />
                  ) : step.status === 'failed' ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-gray-900 text-sm">{step.title}</h5>
                    <span className="text-xs text-gray-500">
                      {step.progress}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{step.message}</p>
                  
                  {step.progress > 0 && (
                    <Progress value={step.progress} className="h-1 mb-2" />
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{step.fromChain} → {step.toChain}</span>
                    <span>via {step.actualProvider || step.tool}</span>
                  </div>
                  
                  {step.txHash && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">TX:</span>
                      <button
                        onClick={() => copyToClipboard(step.txHash!, 'Transaction hash')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1"
                      >
                        {step.txHash.slice(0, 8)}...{step.txHash.slice(-6)}
                        {copiedTx === step.txHash ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          {isCompleted ? (
            <>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Close
              </Button>
              {onNewSwap && (
                <Button 
                  onClick={() => {
                    onNewSwap();
                    onClose();
                  }}
                  className="flex-1 bg-white/80 hover:bg-white/10 text-white"
                >
                  New Swap
                </Button>
              )}
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SideShiftTransactionStatusModal;
