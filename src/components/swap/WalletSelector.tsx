"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { X, RefreshCw } from 'lucide-react'
import Image from 'next/image'

// Dynamic import types
type WalletInfo = {
  id: string
  name: string
  icon: string // Path to SVG icon
  description: string
  downloadUrl?: string
  deepLink?: string
  supportedChains: (string | number)[]
  isInstalled?: boolean
  isInjected?: boolean
}

type QuoteData = {
  integrator: string
  transactionRequest: {
    value?: string
    to?: string
    data: string
    from?: string
    chainId: string | number
    gasPrice?: string
    gasLimit?: string
  }
}

interface WalletSelectorProps {
  quote?: any;
  fromToken?: any;
  onWalletConnect?: (address: string, chainId: string | number, walletId: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
  onClose?: () => void;
}

export function WalletSelector({ 
  quote, 
  fromToken, 
  onWalletConnect, 
  onError,
  buttonText = "Connect Wallet",
  disabled = false,
  onClose
}: WalletSelectorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [compatibleWallets, setCompatibleWallets] = useState<WalletInfo[]>([])
  const [connectedWallet, setConnectedWallet] = useState<{ id: string; address: string; chainId: string | number } | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [chainInfo, setChainInfo] = useState<{ name: string; symbol: string; icon: string } | null>(null)
  const [walletAdapter, setWalletAdapter] = useState<any>(null)

  // Dynamic import of wallet adapter on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/wallets').then((module) => {
        setWalletAdapter(module.walletAdapter)
      })
    }
  }, [])

  // Set chain context based on fromToken when it changes
  useEffect(() => {
    if (!walletAdapter) return // Wait for wallet adapter to load
    
    console.log('WalletSelector: fromToken changed:', fromToken)
    console.log('WalletSelector: fromToken chainId:', fromToken?.chainId)
    
    if (fromToken?.chainId) {
      // Create a mock quote data to set the chain context
      const mockQuoteData: QuoteData = {
        integrator: "hyperswap-ai",
        transactionRequest: {
          value: "0x0",
          to: "",
          data: "0x",
          from: "",
          chainId: fromToken.chainId, // Use fromToken's chainId
          gasPrice: "0x0",
          gasLimit: "0x0"
        }
      }
      
      console.log('WalletSelector: Setting wallet adapter quote with chainId:', fromToken.chainId)
      walletAdapter.setQuote(mockQuoteData)
      const compatibleWallets = walletAdapter.getCompatibleWallets()
      const chainInfo = walletAdapter.getChainInfo()
      
      console.log('WalletSelector: Compatible wallets found:', compatibleWallets.length)
      console.log('WalletSelector: Chain info:', chainInfo)
      
      setCompatibleWallets(compatibleWallets)
      setChainInfo(chainInfo)
    } else if (quote?.quoteId) {
      // Fallback to quote-based chain detection
      const quoteData: QuoteData = {
        integrator: "hyperswap-ai",
        transactionRequest: {
          value: quote.value || "0x0",
          to: quote.to || "",
          data: quote.data || "0x",
          from: quote.from || "",
          chainId: quote.chainId, // Use quote.chainId directly
          gasPrice: quote.gasPrice || "0x0",
          gasLimit: quote.gasLimit || "0x0"
        }
      }
      
      walletAdapter.setQuote(quoteData)
      setCompatibleWallets(walletAdapter.getCompatibleWallets())
      setChainInfo(walletAdapter.getChainInfo())
    } else {
      // If no fromToken or quote, show all wallets
      setCompatibleWallets(walletAdapter.getAllWallets())
      setChainInfo(null)
    }
  }, [fromToken, quote, walletAdapter])

  const handleWalletConnect = async (walletId: string) => {
    if (!walletAdapter) {
      onError?.('Wallet adapter not loaded')
      return
    }
    
    setConnecting(walletId)
    
    try {
      const result = await walletAdapter.connectWallet(walletId)
      
      if (result) {
        const { address, chainId } = result
        
        // The wallet adapter now handles chain switching automatically
        // If we get here, the wallet is on the correct chain
        setConnectedWallet({ id: walletId, address, chainId })
        onWalletConnect?.(address, chainId, walletId)
        setIsOpen(false)
        onClose?.()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet'
      onError?.(errorMessage)
    } finally {
      setConnecting(null)
    }
  }

  const handleExecuteTransaction = async () => {
    if (!connectedWallet || !walletAdapter) return
    
    try {
      const txHash = await walletAdapter.executeTransaction() // Removed argument
      console.log('Transaction executed:', txHash)
      // Handle successful transaction
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      onError?.(errorMessage)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getWalletIcon = (wallet: WalletInfo) => {
    const isValidIcon = wallet.icon && (wallet.icon.startsWith('http') || wallet.icon.startsWith('/'));
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        {isValidIcon && <Image src={wallet.icon} alt={wallet.name} width={40} height={40} />}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        onClose?.()
      }
    }}>
      <DialogContent className="sm:max-w-xl bg-white border-gray-200 text-gray-900 p-6 rounded-2xl shadow-lg">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-semibold">Connect wallet</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-1 max-h-96 overflow-y-auto">
          {compatibleWallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleWalletConnect(wallet.id)}
              disabled={connecting === wallet.id}
              className="w-full p-3 flex items-center gap-4 rounded-xl transition-colors hover:bg-gray-50 border border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getWalletIcon(wallet)}
              
              <div className="flex-1 text-left">
                <span className="font-semibold text-gray-900 text-lg">{wallet.name}</span>
              </div>
              
              {connecting === wallet.id && (
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
              )}
            </button>
          ))}
        </div>
        
        {compatibleWallets.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p>No compatible wallets found.</p>
            <p className="text-sm mt-2">Please install a supported wallet to continue.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
