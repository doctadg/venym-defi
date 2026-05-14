import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { walletAdapter, WALLET_DEFINITIONS, type WalletInfo } from "@/lib/wallets";
import { motion } from "framer-motion";
import { Wallet, X, ExternalLink, Download } from "lucide-react";
// Theme is always dark in venym-defi

interface ConnectedWallet {
  address: string;
  chainId: number | string;
  walletId: string;
}

interface WalletButtonProps {
  onConnect: (walletId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  connectedWallet: ConnectedWallet | null;
}

const WalletButton = ({ onConnect, onDisconnect, connectedWallet }: WalletButtonProps) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  // theme is always 'dark'

  const handleWalletSelect = async (walletId: string) => {
    try {
      setIsConnecting(true);
      await onConnect(walletId);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnect();
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletInfo = (walletId: string): WalletInfo | undefined => {
    return WALLET_DEFINITIONS.find(w => w.id === walletId);
  };

  if (connectedWallet) {
    const walletInfo = getWalletInfo(connectedWallet.walletId);
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl p-4 bg-gray-50 border border-gray-200"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {walletInfo?.icon ? (
              <img 
                src={walletInfo.icon} 
                alt={walletInfo.name}
                className="w-10 h-10 rounded-full ring-2 ring-[#0ff378]/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0ff378] to-white/5 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0ff378] rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {walletInfo?.name || 'Connected Wallet'}
            </div>
            <div className="text-sm text-gray-600">
              {formatAddress(connectedWallet.address)}
            </div>
          </div>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="transition-all hover:scale-105 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300"
        >
          Disconnect
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowWalletModal(true)}
        className="w-full py-6 rounded-2xl font-semibold transition-all hover:scale-[1.02] bg-[#0ff378] hover:bg-[#0ff378]/90 text-black"
      >
        <Wallet className="w-5 h-5 mr-2" />
        Connect Wallet
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="max-w-md border-0 p-0 bg-white">
          <div className="rounded-3xl bg-white border border-gray-200">
            <DialogHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Connect Wallet
                </DialogTitle>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-2 rounded-xl transition-colors hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mt-1 text-gray-600">
                Choose your preferred wallet
              </p>
            </DialogHeader>
            
            <div className="px-5 pb-5">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {WALLET_DEFINITIONS.map((wallet, index) => (
                  <motion.div
                    key={wallet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => handleWalletSelect(wallet.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                    >
                      <div className="relative">
                        {wallet.icon ? (
                          <img 
                            src={wallet.icon} 
                            alt={wallet.name}
                            className="w-10 h-10 rounded-xl"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {wallet.isInstalled && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0ff378] rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          {wallet.name}
                        </div>
                        <div className="text-sm truncate text-gray-600">
                          {wallet.description}
                        </div>
                        {wallet.isInstalled === false && wallet.isInjected && (
                          <div className="flex items-center gap-1 mt-1">
                            <Download className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-yellow-500">Not installed</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        {wallet.isInstalled ? (
                          <div className="flex items-center gap-1 text-[#0ff378]">
                            <div className="w-2 h-2 bg-[#0ff378] rounded-full"></div>
                            <span className="text-xs font-medium">Ready</span>
                          </div>
                        ) : wallet.downloadUrl ? (
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        ) : null}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
              
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletButton;
