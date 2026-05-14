import { parseTransactionError } from '@/lib/errors/transactionErrors'
import { ChainMappingService } from '@/services/swap/chainMapping'

// Dynamically import Buffer only when needed on client-side
const getBuffer = () => {
  if (typeof window !== 'undefined') {
    return require('buffer').Buffer
  }
  return null
}

export interface WalletInfo {
  id: string
  name: string
  icon: string
  description: string
  downloadUrl?: string
  deepLink?: string
  supportedChains: (string | number)[]
  isInstalled?: boolean
  isInjected?: boolean
}

export interface QuoteData {
  integrator: string
  transactionRequest: {
    value?: string
    to?: string
    data: string
    from?: string
    chainId: string | number
    gasPrice?: string
    gasLimit?: string
    type?: 'evm' | 'solana' | 'bitcoin' | 'sui'
  }
}

// Comprehensive wallet definitions with chain support
export const WALLET_DEFINITIONS: WalletInfo[] = [
  // Browser Extension Wallets
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/icons/wallets/metamask.svg',
    description: 'Most popular Ethereum wallet',
    downloadUrl: 'https://metamask.io/download/',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 1285, 1284, 42220, 1666600000, 8453, 324, 59144, 1101],
    isInjected: true
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '/icons/wallets/coinbase.svg',
    description: 'Self-custody wallet by Coinbase',
    downloadUrl: 'https://wallet.coinbase.com/',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 8453, 324],
    isInjected: true
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '/icons/wallets/walletconnect.svg',
    description: 'Connect to 300+ wallets',
    downloadUrl: 'https://walletconnect.com/',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 1285, 1284, 42220, 1666600000, 8453, 324, 59144],
    isInjected: false
  },
  {
    id: 'backpack',
    name: 'Backpack',
    icon: '/icons/wallets/backpack.svg',
    description: 'Multi-chain wallet for Solana & Ethereum',
    downloadUrl: 'https://backpack.app/',
    supportedChains: [1, 137, 56, 42161, 10, 8453, '1151111081099710', 'SOL'],
    isInjected: true
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '/icons/wallets/phantom.svg',
    description: 'Multi-chain wallet for Solana, Ethereum, Bitcoin & Sui',
    downloadUrl: 'https://phantom.app/',
    supportedChains: [1, 137, 56, 42161, 10, 8453, 1101, '1151111081099710', 'SOL', '20000000000001', 'BTC', '9270000000000000', 'SUI'],
    isInjected: true
  },
  {
    id: 'abstract',
    name: 'Abstract',
    icon: '/icons/wallets/abstract.png',
    description: 'Abstract wallet for various chains',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 1285, 1284, 42220, 1666600000, 8453, 324, 59144, '1151111081099710', 'SOL', '20000000000001', 'BTC', '9270000000000000', 'SUI'],
    isInjected: false // Assuming it's not an injected wallet for now
  },
  {
    id: 'rabby',
    name: 'Rabby',
    icon: '/icons/wallets/Rabby.svg',
    description: 'Multi-chain DeFi wallet',
    downloadUrl: 'https://rabby.io/',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 1285, 1284, 42220, 8453, 324, 59144, 1101],
    isInjected: true
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '/icons/wallets/rainbow.png',
    description: 'Ethereum wallet built for everyone',
    downloadUrl: 'https://rainbow.me/',
    supportedChains: [1, 137, 42161, 10, 8453, 324],
    isInjected: true
  },
  {
    id: 'brave',
    name: 'Brave Wallet',
    icon: '/icons/wallets/brave.svg',
    description: 'Built-in Brave browser wallet',
    downloadUrl: 'https://brave.com/wallet/',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 8453],
    isInjected: true
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '/icons/wallets/okx.svg',
    description: 'Multi-chain wallet by OKX',
    downloadUrl: 'https://www.okx.com/web3',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 8453, 324],
    isInjected: true
  },
  {
    id: 'binance',
    name: 'Binance Wallet',
    icon: '/icons/wallets/binance.svg',
    description: 'Official Binance Chain wallet',
    downloadUrl: 'https://www.binance.org/en',
    supportedChains: [56, 1, 137, 204],
    isInjected: true
  },
  {
    id: 'talisman',
    name: 'Talisman',
    icon: '/icons/wallets/talisman.png',
    description: 'Polkadot & Ethereum wallet',
    downloadUrl: 'https://talisman.xyz/',
    supportedChains: [1, 137, 42161, 10, 8453],
    isInjected: true
  },
  {
    id: 'subwallet',
    name: 'SubWallet',
    icon: '/icons/wallets/subwallet.svg',
    description: 'Polkadot & Ethereum wallet',
    downloadUrl: 'https://subwallet.app/',
    supportedChains: [1, 137, 42161, 10, 8453],
    isInjected: true
  },
  
  // Bitcoin Wallets
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '/icons/wallets/xverse.svg',
    description: 'Bitcoin & Stacks wallet',
    downloadUrl: 'https://xverse.app/',
    supportedChains: ['20000000000001', 'BTC'],
    isInjected: true
  },
  {
    id: 'ordinals',
    name: 'Ordinals Wallet',
    icon: '/icons/wallets/ordinals.png',
    description: 'Bitcoin Ordinals wallet',
    downloadUrl: 'https://ordinalswallet.com/',
    supportedChains: ['20000000000001', 'BTC'],
    isInjected: true
  },
  
  // Mobile Wallets
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '/icons/wallets/trust.png',
    description: 'Mobile-first multi-chain wallet',
    downloadUrl: 'https://trustwallet.com/',
    deepLink: 'trust://',
    supportedChains: [1, 56, 137, 43114, 250, 25, 100, 1285, 1284, 42220, 1666600000, 42161, 10, 8453, 324],
    isInjected: false
  },
  {
    id: 'safepal',
    name: 'SafePal',
    icon: '/icons/wallets/safepal.png',
    description: 'Hardware & software wallet',
    downloadUrl: 'https://safepal.io/',
    deepLink: 'safepal-wc://',
    supportedChains: [1, 56, 137, 43114, 250, 25, 8453],
    isInjected: false
  },
  {
    id: 'tokenpocket',
    name: 'TokenPocket',
    icon: '/icons/wallets/tokenpocket.svg',
    description: 'Multi-chain wallet',
    downloadUrl: 'https://tokenpocket.pro/',
    deepLink: 'tpoutside://',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 1285, 1284, 42220, 8453],
    isInjected: false
  },
  {
    id: 'mathwallet',
    name: 'MathWallet',
    icon: '/icons/wallets/mathwallet.png',
    description: 'Multi-platform crypto wallet',
    downloadUrl: 'https://mathwallet.org/',
    deepLink: 'mathwallet://',
    supportedChains: [1, 56, 137, 43114, 250, 25, 100, 1285, 1284, 8453],
    isInjected: false
  }
]

// Chain information for EVM chains
export const CHAIN_INFO: Record<number, { name: string; symbol: string; icon: string }> = {
  1: { name: 'Ethereum', symbol: 'ETH', icon: '⟠' },
  56: { name: 'BNB Smart Chain', symbol: 'BNB', icon: '🟡' },
  137: { name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  42161: { name: 'Arbitrum', symbol: 'ETH', icon: '🔵' },
  10: { name: 'Optimism', symbol: 'ETH', icon: '🔴' },
  43114: { name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
  250: { name: 'Fantom', symbol: 'FTM', icon: '👻' },
  25: { name: 'Cronos', symbol: 'CRO', icon: '🦁' },
  100: { name: 'Gnosis', symbol: 'xDAI', icon: '🟢' },
  1285: { name: 'Moonriver', symbol: 'MOVR', icon: '🌙' },
  1284: { name: 'Moonbeam', symbol: 'GLMR', icon: '🌕' },
  42220: { name: 'Celo', symbol: 'CELO', icon: '💚' },
  1666600000: { name: 'Harmony', symbol: 'ONE', icon: '🎵' },
  8453: { name: 'Base', symbol: 'ETH', icon: '🔷' },
  324: { name: 'zkSync Era', symbol: 'ETH', icon: '⚡' },
  59144: { name: 'Linea', symbol: 'ETH', icon: '🟦' },
  204: { name: 'opBNB', symbol: 'BNB', icon: '🟨' }
}

// Extended chain information for string-based chain IDs (Solana, Bitcoin, Sui)
export const EXTENDED_CHAIN_INFO: Record<string, { name: string; symbol: string; icon: string }> = {
  // Solana chain IDs
  '1151111081099710': { name: 'Solana', symbol: 'SOL', icon: '🌞' },
  'SOL': { name: 'Solana', symbol: 'SOL', icon: '🌞' },
  'sol': { name: 'Solana', symbol: 'SOL', icon: '🌞' },
  'solana': { name: 'Solana', symbol: 'SOL', icon: '🌞' },
  'solana-mainnet': { name: 'Solana', symbol: 'SOL', icon: '🌞' },
  
  // Bitcoin chain IDs
  '20000000000001': { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  'BTC': { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  'btc': { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  'bitcoin': { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  'bitcoin-mainnet': { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  
  // Sui chain IDs
  '9270000000000000': { name: 'Sui', symbol: 'SUI', icon: '🌊' },
  'SUI': { name: 'Sui', symbol: 'SUI', icon: '🌊' },
  'sui': { name: 'Sui', symbol: 'SUI', icon: '🌊' },
  'sui-mainnet': { name: 'Sui', symbol: 'SUI', icon: '🌊' }
}

// Chain ID normalization mapping
export const CHAIN_ID_MAPPING: Record<string | number, string | number> = {
  // Solana mappings
  'solana': '1151111081099710',
  'solana-mainnet': '1151111081099710',
  'SOL': '1151111081099710',
  'sol': '1151111081099710',
  
  // Bitcoin mappings
  'bitcoin': '20000000000001',
  'bitcoin-mainnet': '20000000000001',
  'BTC': '20000000000001',
  'btc': '20000000000001',
  
  // Sui mappings
  'sui': '9270000000000000',
  'sui-mainnet': '9270000000000000',
  'SUI': '9270000000000000'
}

export class WalletAdapter {
  private quote: QuoteData | null = null
  private chainId: string | number | null = null
  private connectedWalletId: string | null = null
  private connectedProvider: any = null

  constructor() {
    this.detectInstalledWallets()
    this.setupChainChangeListeners()
    this.loadWalletState()
  }

  // Load wallet state from localStorage
  private loadWalletState() {
    if (typeof window !== 'undefined') {
      try {
        const savedWalletId = localStorage.getItem('walletAdapter-connectedWalletId')
        if (savedWalletId) {
          this.connectedWalletId = savedWalletId
          console.log('🔄 Restored wallet selection from localStorage:', savedWalletId)
        }
      } catch (error) {
        console.warn('Failed to load wallet state:', error)
      }
    }
  }

  // Save wallet state to localStorage
  private saveWalletState() {
    if (typeof window !== 'undefined') {
      try {
        if (this.connectedWalletId) {
          localStorage.setItem('walletAdapter-connectedWalletId', this.connectedWalletId)
          console.log('💾 Saved wallet selection to localStorage:', this.connectedWalletId)
        } else {
          localStorage.removeItem('walletAdapter-connectedWalletId')
        }
      } catch (error) {
        console.warn('Failed to save wallet state:', error)
      }
    }
  }

  // Disconnect wallet and clear connection
  async disconnectWallet(): Promise<void> {
    try {
      // Clear any stored connection state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('walletconnect')
        localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE')
        
        // Try to disconnect from various wallet providers
        if ((window as any).ethereum) {
          // For MetaMask and other injected wallets, we can't force disconnect
          // but we can clear our local state
          console.log('Clearing wallet connection state')
        }
        
        // Clear Phantom connections
        if ((window as any).phantom?.solana?.disconnect) {
          await (window as any).phantom.solana.disconnect()
        }
        if ((window as any).phantom?.ethereum?.disconnect) {
          await (window as any).phantom.ethereum.disconnect()
        }
        
        // Clear Backpack connections
        if ((window as any).backpack?.solana?.disconnect) {
          await (window as any).backpack.solana.disconnect()
        }
        if ((window as any).backpack?.ethereum?.disconnect) {
          await (window as any).backpack.ethereum.disconnect()
        }
        
        // Clear other wallet connections as needed
        if ((window as any).suiWallet?.disconnect) {
          await (window as any).suiWallet.disconnect()
        }
        if ((window as any).suiet?.disconnect) {
          await (window as any).suiet.disconnect()
        }
        if ((window as any).ethos?.disconnect) {
          await (window as any).ethos.disconnect()
        }
      }
      
      // Clear the stored wallet state
      this.connectedWalletId = null
      this.connectedProvider = null
      this.saveWalletState()  // Clear from localStorage
      
      console.log('Wallet disconnected successfully')
    } catch (error) {
      console.warn('Error during wallet disconnection:', error)
      // Don't throw error as disconnection should always succeed from our side
    }
  }

  // Check if connected wallet is on the correct chain
  isWalletOnCorrectChain(walletChainId: string | number): boolean {
    if (!this.chainId) return true // If no required chain, any chain is fine
    
    // Direct comparison first
    if (this.chainId === walletChainId) return true
    
    // String comparison
    if (String(this.chainId) === String(walletChainId)) return true
    
    // Use ChainMappingService to get the proper mapping for both chain IDs
    const requiredMapping = ChainMappingService.getByLiFiChainId(this.chainId)
    const connectedMapping = ChainMappingService.getByLiFiChainId(walletChainId)
    
    // If we found mappings, compare the wallet chain IDs
    if (requiredMapping && connectedMapping) {
      return requiredMapping.walletChainId === connectedMapping.walletChainId
    }
    
    // Also check if the wallet chain ID matches the required LiFi chain ID
    if (requiredMapping) {
      return requiredMapping.walletChainId === walletChainId || 
             requiredMapping.lifiChainId === walletChainId
    }
    
    // Also check if the connected chain ID matches the required wallet chain ID
    if (connectedMapping) {
      return connectedMapping.lifiChainId === this.chainId ||
             connectedMapping.walletChainId === this.chainId
    }
    
    // Fallback to normalize both chain IDs for comparison
    const requiredChainId = this.normalizeChainId(this.chainId)
    const connectedChainId = this.normalizeChainId(walletChainId)
    
    return requiredChainId === connectedChainId
  }

  // Set the quote data and extract chainId
  setQuote(quote: QuoteData) {
    this.quote = quote
    
    // Use explicit chainId from transactionRequest if available
    if (quote.transactionRequest.chainId) {
      this.chainId = quote.transactionRequest.chainId
    } 
    // Fallback to chainId from quote object if available
    else if ((quote as any).chainId) {
      this.chainId = (quote as any).chainId
    }
    
    console.log(`WalletAdapter: Set quote for chain ${this.chainId}`)
  }

  // Get the current chainId from the quote
  getChainId(): string | number | null {
    return this.chainId
  }

  // Get the connected wallet ID
  getConnectedWalletId(): string | null {
    return this.connectedWalletId
  }

  // Get the connected provider
  getConnectedProvider(): any {
    return this.connectedProvider
  }

  // Set the connected provider (for reconnection scenarios)
  setConnectedProvider(provider: any): void {
    this.connectedProvider = provider
  }

  // Get chain information
  getChainInfo(chainId?: string | number): { name: string; symbol: string; icon: string } | null {
    const id = chainId || this.chainId
    if (!id) return null
    
    // Handle both string and number chain IDs
    if (typeof id === 'string') {
      return EXTENDED_CHAIN_INFO[id] || null
    }
    
    return CHAIN_INFO[id] || null
  }

  // Get compatible wallets for the current chain
  getCompatibleWallets(): WalletInfo[] {
    if (!this.chainId) {
      console.warn('WalletAdapter: No chainId set, returning all wallets')
      return WALLET_DEFINITIONS
    }

    console.log('WalletAdapter: Looking for wallets compatible with chainId:', this.chainId)
    console.log('WalletAdapter: Available wallet definitions:', WALLET_DEFINITIONS.length)
    
    const compatibleWallets = WALLET_DEFINITIONS.filter(wallet => {
      // Check both the original chainId and its string/number equivalent
      const chainIdAsString = String(this.chainId!)
      const chainIdAsNumber = typeof this.chainId === 'string' ? parseInt(this.chainId, 10) : this.chainId
      
      const isCompatible = wallet.supportedChains.includes(this.chainId!) || 
                          wallet.supportedChains.includes(chainIdAsString) ||
                          (typeof chainIdAsNumber === 'number' && !isNaN(chainIdAsNumber) && wallet.supportedChains.includes(chainIdAsNumber))
      
      console.log(`WalletAdapter: Wallet ${wallet.name} supports chains:`, wallet.supportedChains, 'Compatible:', isCompatible)
      return isCompatible
    })

    console.log(`WalletAdapter: Found ${compatibleWallets.length} compatible wallets for chain ${this.chainId}`)
    return compatibleWallets
  }

  // Get all wallets (for fallback)
  getAllWallets(): WalletInfo[] {
    return WALLET_DEFINITIONS
  }

  // Setup chain change listeners to monitor when users switch chains
  private setupChainChangeListeners() {
    if (typeof window === 'undefined') return

    // Listen for chain changes on various providers
    if ((window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        console.log('Chain changed to:', chainId)
        // If we have a required chain and the user switched to a different chain,
        // we could potentially warn them or attempt to switch back
        if (this.chainId) {
          const newChainId = parseInt(chainId, 16)
          if (!this.isWalletOnCorrectChain(newChainId)) {
            console.warn(`User switched to wrong chain ${newChainId}, required chain is ${this.chainId}`)
            // Could emit an event here for the UI to handle
          }
        }
      })
    }

    // Listen for account changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Accounts changed:', accounts)
        if (accounts.length === 0) {
          console.log('User disconnected wallet')
          // Could emit an event here for the UI to handle disconnection
        }
      })
    }
  }

  // Detect installed wallets
  private detectInstalledWallets() {
    if (typeof window === 'undefined') return

    WALLET_DEFINITIONS.forEach(wallet => {
      if (wallet.isInjected) {
        switch (wallet.id) {
          case 'metamask':
            wallet.isInstalled = !!(window as any).ethereum?.isMetaMask
            break
          case 'binance':
            wallet.isInstalled = !!(window as any).BinanceChain
            break
          case 'coinbase':
            wallet.isInstalled = !!(window as any).ethereum?.isCoinbaseWallet
            break
          case 'phantom':
            wallet.isInstalled = !!(window as any).phantom?.ethereum || 
                                !!(window as any).phantom?.solana || 
                                !!(window as any).phantom?.sui
            break
          case 'backpack':
            wallet.isInstalled = !!(window as any).backpack?.ethereum || !!(window as any).backpack?.solana
            break
          case 'rabby':
            wallet.isInstalled = !!(window as any).ethereum?.isRabby
            break
          case 'rainbow':
            wallet.isInstalled = !!(window as any).ethereum?.isRainbow
            break
          case 'brave':
            wallet.isInstalled = !!(window as any).ethereum?.isBraveWallet
            break
          case 'okx':
            wallet.isInstalled = !!(window as any).okxwallet || !!(window as any).ethereum?.isOkxWallet
            break
          case 'frame':
            wallet.isInstalled = !!(window as any).ethereum?.isFrame
            break
          case 'talisman':
            wallet.isInstalled = !!(window as any).talismanEth
            break
          case 'subwallet':
            wallet.isInstalled = !!(window as any).SubWallet
            break
          case 'xverse':
            wallet.isInstalled = !!(window as any).XverseProviders?.BitcoinProvider
            break
          case 'ordinals':
            wallet.isInstalled = !!(window as any).ordinalsWallet
            break
        }
      }
    })
  }

  // Normalize chain ID to standard format
  private normalizeChainId(chainId: string | number): string | number {
    if (typeof chainId === 'string' && CHAIN_ID_MAPPING[chainId]) {
      return CHAIN_ID_MAPPING[chainId]
    }
    return chainId
  }

  // Check if chain ID is Solana
  private isSolanaChain(chainId: string | number): boolean {
    const normalizedId = this.normalizeChainId(chainId)
    return normalizedId === '1151111081099710' || 
           chainId === 'SOL' || 
           chainId === 'sol' || 
           chainId === 'solana' || 
           chainId === 'solana-mainnet'
  }

  // Check if chain ID is Bitcoin
  private isBitcoinChain(chainId: string | number): boolean {
    const normalizedId = this.normalizeChainId(chainId)
    return normalizedId === '20000000000001' || 
           chainId === 'BTC' || 
           chainId === 'btc' || 
           chainId === 'bitcoin' || 
           chainId === 'bitcoin-mainnet'
  }

  // Check if chain ID is Sui
  private isSuiChain(chainId: string | number): boolean {
    const normalizedId = this.normalizeChainId(chainId)
    return normalizedId === '9270000000000000' || 
           chainId === 'SUI' || 
           chainId === 'sui' || 
           chainId === 'sui-mainnet'
  }

  // Connect to a specific wallet and ensure it's on the correct chain
  async connectWallet(walletId: string): Promise<{ address: string; chainId: number | string } | null> {
    const wallet = WALLET_DEFINITIONS.find(w => w.id === walletId)
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`)
    }

    if (!wallet.isInstalled && wallet.isInjected) {
      // Redirect to download page
      if (wallet.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank')
      }
      throw new Error(`${wallet.name} is not installed`)
    }

    try {
      let connectionResult: { address: string; chainId: number | string } | null = null

      switch (walletId) {
        case 'metamask':
          connectionResult = await this.connectMetaMask()
          this.connectedProvider = (window as any).ethereum?.isMetaMask ? (window as any).ethereum : null
          break
        case 'phantom':
          connectionResult = await this.connectPhantom()
          // Set provider based on chain type
          if (this.isSolanaChain(this.chainId!)) {
            this.connectedProvider = (window as any).phantom?.solana
          } else if (this.isBitcoinChain(this.chainId!)) {
            this.connectedProvider = (window as any).phantom?.bitcoin
          } else if (this.isSuiChain(this.chainId!)) {
            this.connectedProvider = (window as any).phantom?.sui
          } else {
            this.connectedProvider = (window as any).phantom?.ethereum
          }
          break
        case 'backpack':
          connectionResult = await this.connectBackpack()
          // Set provider based on chain type
          if (this.isSolanaChain(this.chainId!)) {
            this.connectedProvider = (window as any).backpack?.solana
          } else {
            this.connectedProvider = (window as any).backpack?.ethereum
          }
          break
        case 'binance':
          connectionResult = await this.connectBinanceWallet()
          this.connectedProvider = (window as any).BinanceChain
          break
        case 'coinbase':
          connectionResult = await this.connectCoinbaseWallet()
          this.connectedProvider = (window as any).ethereum?.isCoinbaseWallet ? (window as any).ethereum : null
          break
        case 'rabby':
          connectionResult = await this.connectRabby()
          this.connectedProvider = (window as any).ethereum?.isRabby ? (window as any).ethereum : null
          break
        case 'rainbow':
          connectionResult = await this.connectRainbow()
          this.connectedProvider = (window as any).ethereum?.isRainbow ? (window as any).ethereum : null
          break
        case 'brave':
          connectionResult = await this.connectBrave()
          this.connectedProvider = (window as any).ethereum?.isBraveWallet ? (window as any).ethereum : null
          break
        case 'okx':
          connectionResult = await this.connectOKX()
          this.connectedProvider = (window as any).okxwallet || ((window as any).ethereum?.isOkxWallet ? (window as any).ethereum : null)
          break
        case 'talisman':
          connectionResult = await this.connectTalisman()
          this.connectedProvider = (window as any).talismanEth
          break
        case 'subwallet':
          connectionResult = await this.connectSubWallet()
          this.connectedProvider = (window as any).SubWallet
          break
        case 'xverse':
          connectionResult = await this.connectXverse()
          this.connectedProvider = (window as any).XverseProviders?.BitcoinProvider
          break
        case 'ordinals':
          connectionResult = await this.connectOrdinalsWallet()
          this.connectedProvider = (window as any).ordinalsWallet
          break
        case 'walletconnect':
          connectionResult = await this.connectWalletConnect()
          break
        default:
          throw new Error(`Connection not implemented for ${wallet.name}`)
      }

      // Store the connected wallet ID
      if (connectionResult) {
        this.connectedWalletId = walletId
        this.saveWalletState()  // Persist to localStorage
      }

      // If we have a connection result and a required chain, ensure we're on the correct chain
      if (connectionResult && this.chainId) {
        const isCorrectChain = this.isWalletOnCorrectChain(connectionResult.chainId)
        
        if (!isCorrectChain) {
          console.log(`Wallet connected to wrong chain. Attempting to switch from ${connectionResult.chainId} to ${this.chainId}`)
          
          // Attempt to switch to the correct chain
          const switchResult = await this.switchToRequiredChain(walletId, connectionResult.chainId)
          if (switchResult) {
            connectionResult.chainId = switchResult
            console.log(`Successfully switched to chain ${switchResult}`)
          } else {
            // If we can't switch, throw an error with helpful message
            const requiredChainInfo = this.getChainInfo(this.chainId)
            const connectedChainInfo = this.getChainInfo(connectionResult.chainId)
            throw new Error(
              `Please switch your wallet to ${requiredChainInfo?.name || this.chainId} network. ` +
              `Currently connected to ${connectedChainInfo?.name || connectionResult.chainId}.`
            )
          }
        }
      }

      return connectionResult
    } catch (error) {
      console.error(`Failed to connect to ${wallet.name}:`, error)
      throw error
    }
  }

  // MetaMask connection
  private async connectMetaMask(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isMetaMask) {
      throw new Error('MetaMask not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Binance Wallet connection
  private async connectBinanceWallet(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).BinanceChain) {
      throw new Error('Binance Wallet not found')
    }

    const accounts = await (window as any).BinanceChain.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).BinanceChain.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Coinbase Wallet connection
  private async connectCoinbaseWallet(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isCoinbaseWallet) {
      throw new Error('Coinbase Wallet not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Phantom connection - supports Ethereum, Solana, Bitcoin, and Sui
  private async connectPhantom(): Promise<{ address: string; chainId: number | string }> {
    if (!this.chainId) {
      throw new Error('No chain ID set for Phantom connection')
    }

    // Use chain mapping to determine the correct provider
    const providerType = ChainMappingService.getWalletProvider('phantom', this.chainId)
    
    if (!providerType) {
      throw new Error(`Phantom does not support chain ${this.chainId}`)
    }

    switch (providerType) {
      case 'solana':
        return await this.connectPhantomSolana()
      case 'bitcoin':
        return await this.connectPhantomBitcoin()
      case 'sui':
        return await this.connectPhantomSui()
      case 'ethereum':
      default:
        return await this.connectPhantomEthereum()
    }
  }

  // Phantom Solana connection
  private async connectPhantomSolana(): Promise<{ address: string; chainId: string }> {
    const getProvider = (): any | undefined => {
      if ('phantom' in window) {
        const provider = (window as any).phantom?.solana;
        if (provider?.isPhantom) {
          return provider;
        }
      }
      return undefined;
    };
  
    let provider = getProvider();
    
    // If provider not immediately available, wait a bit
    if (!provider) {
      console.log('Phantom provider not immediately available, waiting...');
      
      // Try multiple times with increasing delays
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        provider = getProvider();
        if (provider) {
          console.log('Phantom provider found after waiting');
          break;
        }
      }
      
      if (!provider) {
        throw new Error('Phantom Solana provider not found. Please ensure Phantom wallet is installed and refresh the page.');
      }
    }

    try {
      const response = await provider.connect();
      const address = response.publicKey.toString();
      console.log('Phantom connected successfully:', address);
      
      return {
        address,
        chainId: '1151111081099710' // Use LiFi's Solana chain ID
      };
    } catch (error: any) {
      console.error('Phantom connection error:', error);
      if (error.message?.includes('User rejected')) {
        throw new Error('Connection rejected by user');
      }
      throw error;
    }
  }

  // Phantom Bitcoin connection
  private async connectPhantomBitcoin(): Promise<{ address: string; chainId: string }> {
    const provider = (window as any).phantom?.bitcoin
    if (!provider?.isPhantom) {
      throw new Error('Phantom Bitcoin provider not found')
    }

    const accounts = await provider.requestAccounts()
    // Use the payment address by default, or ordinals if no payment address
    const paymentAccount = accounts.find((acc: any) => acc.purpose === 'payment')
    const selectedAccount = paymentAccount || accounts[0]
    
    return {
      address: selectedAccount.address,
      chainId: '20000000000001' // Use LiFi's Bitcoin chain ID
    }
  }

  // Phantom Sui connection
  private async connectPhantomSui(): Promise<{ address: string; chainId: string }> {
    const provider = (window as any).phantom?.sui
    if (!provider?.isPhantom) {
      throw new Error('Phantom Sui provider not found')
    }

    try {
      const resp = await provider.requestAccount();
      console.log('Phantom Sui response:', resp);
      console.log('Phantom Sui response type:', typeof resp);
      console.log('Phantom Sui response keys:', Object.keys(resp || {}));
      
      let address: string;
      
      // Check different possible response structures - prioritize address field for Sui
      if (resp && resp.address) {
        console.log('Using resp.address:', resp.address);
        address = resp.address;
      } else if (resp && resp.publicKey) {
        console.log('Using resp.publicKey:', resp.publicKey);
        console.log('publicKey type:', typeof resp.publicKey);
        if (typeof resp.publicKey.toString === 'function') {
          address = resp.publicKey.toString();
        } else if (typeof resp.publicKey === 'string') {
          address = resp.publicKey;
        } else {
          console.error('publicKey is not string or has toString:', resp.publicKey);
          throw new Error('Invalid publicKey format in Phantom Sui response');
        }
      } else if (typeof resp === 'string') {
        console.log('Response is string:', resp);
        address = resp;
      } else {
        console.error('Unexpected Phantom Sui response structure:', resp);
        throw new Error('Unable to extract address from Phantom Sui response');
      }
      
      // Ensure address is definitely a string
      if (typeof address !== 'string') {
        console.error('Address is not a string:', address, 'type:', typeof address);
        throw new Error(`Address must be a string, got ${typeof address}: ${address}`);
      }
      
      console.log('Phantom Sui final address:', address);
      console.log('Address type:', typeof address);
      
      return {
        address,
        chainId: 'SUI' // Use LiFi's Sui chain ID
      };
    } catch (err: any) {
      console.error('Phantom Sui connection error:', err);
      if (err.code === 4001) {
        throw new Error('User rejected the request.');
      }
      throw new Error(err instanceof Error ? err.message : 'Failed to connect to Phantom Sui');
    }
  }

  // Phantom Ethereum connection
  private async connectPhantomEthereum(): Promise<{ address: string; chainId: number }> {
    const provider = (window as any).phantom?.ethereum
    if (!provider) {
      throw new Error('Phantom Ethereum provider not found')
    }

    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await provider.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Backpack connection - supports both Ethereum and Solana
  private async connectBackpack(): Promise<{ address: string; chainId: number | string }> {
    if (!this.chainId) {
      throw new Error('No chain ID set for Backpack connection')
    }

    // Use chain mapping to determine the correct provider
    const providerType = ChainMappingService.getWalletProvider('backpack', this.chainId)
    
    if (!providerType) {
      throw new Error(`Backpack does not support chain ${this.chainId}`)
    }

    switch (providerType) {
      case 'solana':
        return await this.connectBackpackSolana()
      case 'ethereum':
      default:
        return await this.connectBackpackEthereum()
    }
  }

  // Backpack Solana connection
  private async connectBackpackSolana(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).backpack?.solana) {
      throw new Error('Backpack Solana provider not found')
    }

    const response = await (window as any).backpack.solana.connect()
    return {
      address: response.publicKey.toString(),
      chainId: '1151111081099710' // Use LiFi's Solana chain ID
    }
  }

  // Backpack Ethereum connection
  private async connectBackpackEthereum(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).backpack?.ethereum) {
      throw new Error('Backpack Ethereum provider not found')
    }

    const accounts = await (window as any).backpack.ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).backpack.ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // UniSat Bitcoin wallet connection
  private async connectUniSat(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).unisat) {
      throw new Error('UniSat wallet not found')
    }

    const accounts = await (window as any).unisat.requestAccounts()
    return {
      address: accounts[0],
      chainId: '20000000000001' // Use LiFi's Bitcoin chain ID
    }
  }

  // Xverse Bitcoin wallet connection
  private async connectXverse(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).XverseProviders?.BitcoinProvider) {
      throw new Error('Xverse wallet not found')
    }

    const response = await (window as any).XverseProviders.BitcoinProvider.request('getAccounts', null)
    return {
      address: response.result[0].address,
      chainId: '20000000000001' // Use LiFi's Bitcoin chain ID
    }
  }

  // Leather Bitcoin wallet connection
  private async connectLeather(): Promise<{ address: string; chainId: string }> {
    const provider = (window as any).LeatherProvider || (window as any).HiroWalletProvider
    if (!provider) {
      throw new Error('Leather wallet not found')
    }

    const response = await provider.request('getAddresses')
    return {
      address: response.result.addresses[0].address,
      chainId: '20000000000001' // Use LiFi's Bitcoin chain ID
    }
  }

  // Ordinals Wallet connection
  private async connectOrdinalsWallet(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).ordinalsWallet) {
      throw new Error('Ordinals Wallet not found')
    }

    const accounts = await (window as any).ordinalsWallet.requestAccounts()
    return {
      address: accounts[0],
      chainId: '20000000000001' // Use LiFi's Bitcoin chain ID
    }
  }

  // Rabby connection
  private async connectRabby(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isRabby) {
      throw new Error('Rabby not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Rainbow connection
  private async connectRainbow(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isRainbow) {
      throw new Error('Rainbow not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Brave Wallet connection
  private async connectBrave(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isBraveWallet) {
      throw new Error('Brave Wallet not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // OKX Wallet connection
  private async connectOKX(): Promise<{ address: string; chainId: number }> {
    const okxProvider = (window as any).okxwallet || (window as any).ethereum
    if (!okxProvider || !(window as any).ethereum?.isOkxWallet) {
      throw new Error('OKX Wallet not found')
    }

    const accounts = await okxProvider.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await okxProvider.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Frame connection
  private async connectFrame(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).ethereum?.isFrame) {
      throw new Error('Frame not found')
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).ethereum.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Talisman connection
  private async connectTalisman(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).talismanEth) {
      throw new Error('Talisman not found')
    }

    const accounts = await (window as any).talismanEth.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).talismanEth.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // SubWallet connection
  private async connectSubWallet(): Promise<{ address: string; chainId: number }> {
    if (!(window as any).SubWallet) {
      throw new Error('SubWallet not found')
    }

    const accounts = await (window as any).SubWallet.request({
      method: 'eth_requestAccounts'
    })

    const chainId = await (window as any).SubWallet.request({
      method: 'eth_chainId'
    })

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    }
  }

  // Sui Wallet connection
  private async connectSuiWallet(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).suiWallet) {
      throw new Error('Sui Wallet not found')
    }

    const response = await (window as any).suiWallet.connect()
    return {
      address: response.accounts[0],
      chainId: 'SUI' // Use LiFi's Sui chain ID
    }
  }

  // Suiet connection
  private async connectSuiet(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).suiet) {
      throw new Error('Suiet wallet not found')
    }

    const response = await (window as any).suiet.connect()
    return {
      address: response.address,
      chainId: 'SUI' // Use LiFi's Sui chain ID
    }
  }

  // Ethos Wallet connection
  private async connectEthos(): Promise<{ address: string; chainId: string }> {
    if (!(window as any).ethos) {
      throw new Error('Ethos wallet not found')
    }

    const response = await (window as any).ethos.connect()
    return {
      address: response.address,
      chainId: 'SUI' // Use LiFi's Sui chain ID
    }
  }

  // WalletConnect connection (placeholder)
  private async connectWalletConnect(): Promise<{ address: string; chainId: number }> {
    throw new Error('WalletConnect integration not implemented yet')
  }

  // Switch wallet to the required chain
  async switchToRequiredChain(walletId: string, currentChainId: string | number): Promise<string | number | null> {
    if (!this.chainId) return null

    const requiredChainId = this.chainId
    
    // For non-EVM chains, we can't switch programmatically
    if (this.isSolanaChain(requiredChainId) || this.isBitcoinChain(requiredChainId) || this.isSuiChain(requiredChainId)) {
      return null
    }

    // For EVM chains, attempt to switch
    if (typeof requiredChainId === 'number') {
      try {
        const chainIdHex = `0x${requiredChainId.toString(16)}`
        
        // Get the appropriate provider based on wallet
        let provider = null
        switch (walletId) {
          case 'metamask':
            provider = (window as any).ethereum?.isMetaMask ? (window as any).ethereum : null
            break
          case 'binance':
            provider = (window as any).BinanceChain
            break
          case 'coinbase':
            provider = (window as any).ethereum?.isCoinbaseWallet ? (window as any).ethereum : null
            break
          case 'phantom':
            provider = (window as any).phantom?.ethereum
            break
          case 'backpack':
            provider = (window as any).backpack?.ethereum
            break
          case 'rabby':
            provider = (window as any).ethereum?.isRabby ? (window as any).ethereum : null
            break
          case 'rainbow':
            provider = (window as any).ethereum?.isRainbow ? (window as any).ethereum : null
            break
          case 'brave':
            provider = (window as any).ethereum?.isBraveWallet ? (window as any).ethereum : null
            break
          case 'okx':
            provider = (window as any).okxwallet || ((window as any).ethereum?.isOkxWallet ? (window as any).ethereum : null)
            break
          case 'frame':
            provider = (window as any).ethereum?.isFrame ? (window as any).ethereum : null
            break
          case 'talisman':
            provider = (window as any).talismanEth
            break
          case 'subwallet':
            provider = (window as any).SubWallet
            break
          default:
            provider = (window as any).ethereum
        }

        if (!provider) {
          console.warn(`No provider found for wallet ${walletId}`)
          return null
        }

        // First try to switch to the existing network
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          })
          
          console.log(`Successfully switched to chain ${requiredChainId}`)
          return requiredChainId
        } catch (switchError: any) {
          // If the chain doesn't exist, try to add it
          if (switchError.code === 4902) {
            const chainInfo = this.getChainInfo(requiredChainId)
            if (chainInfo) {
              try {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: chainIdHex,
                    chainName: chainInfo.name,
                    nativeCurrency: {
                      name: chainInfo.symbol,
                      symbol: chainInfo.symbol,
                      decimals: 18,
                    },
                    rpcUrls: this.getRpcUrls(requiredChainId),
                    blockExplorerUrls: this.getBlockExplorerUrls(requiredChainId),
                  }],
                })
                
                console.log(`Successfully added and switched to chain ${requiredChainId}`)
                return requiredChainId
              } catch (addError) {
                console.error('Failed to add chain:', addError)
                return null
              }
            }
          } else {
            console.error('Failed to switch chain:', switchError)
            return null
          }
        }
      } catch (error) {
        console.error('Error switching chain:', error)
        return null
      }
    }

    return null
  }

  // Get RPC URLs for a chain (basic implementation)
  private getRpcUrls(chainId: number): string[] {
    const rpcMap: Record<number, string[]> = {
      1: ['https://mainnet.infura.io/v3/'],
      56: ['https://bsc-dataseed.binance.org/'],
      137: ['https://polygon-rpc.com/'],
      42161: ['https://arb1.arbitrum.io/rpc'],
      10: ['https://mainnet.optimism.io/'],
      43114: ['https://api.avax.network/ext/bc/C/rpc'],
      250: ['https://rpc.ftm.tools/'],
      25: ['https://evm.cronos.org/'],
      100: ['https://rpc.gnosischain.com/'],
      8453: ['https://mainnet.base.org/'],
      324: ['https://mainnet.era.zksync.io/'],
      59144: ['https://rpc.linea.build/'],
    }
    
    return rpcMap[chainId] || [`https://chainid.network/chains/${chainId}`]
  }

  // Get block explorer URLs for a chain (basic implementation)
  private getBlockExplorerUrls(chainId: number): string[] {
    const explorerMap: Record<number, string[]> = {
      1: ['https://etherscan.io/'],
      56: ['https://bscscan.com/'],
      137: ['https://polygonscan.com/'],
      42161: ['https://arbiscan.io/'],
      10: ['https://optimistic.etherscan.io/'],
      43114: ['https://snowtrace.io/'],
      250: ['https://ftmscan.com/'],
      25: ['https://cronoscan.com/'],
      100: ['https://gnosisscan.io/'],
      8453: ['https://basescan.org/'],
      324: ['https://explorer.zksync.io/'],
      59144: ['https://lineascan.build/'],
    }
    
    return explorerMap[chainId] || []
  }

  // Execute transaction based on chain type
  async executeTransaction(): Promise<string> {
    if (!this.quote) {
      throw new Error('No quote set. Call setQuote() first.')
    }

    const { transactionRequest } = this.quote
    const chainId = this.chainId

    if (!chainId && !transactionRequest.type) {
      throw new Error('No chain ID or transaction type available for transaction execution')
    }

    try {
      // First check if transaction has explicit type
      if (transactionRequest.type) {
        switch (transactionRequest.type) {
          case 'solana':
            return await this.executeSolanaTransaction(transactionRequest)
          case 'bitcoin':
            return await this.executeBitcoinTransaction(transactionRequest)
          case 'sui':
            return await this.executeSuiTransaction(transactionRequest)
          case 'evm':
          default:
            return await this.executeEVMTransaction(transactionRequest)
        }
      }
      
      // Fallback to chain ID detection
      if (this.isSolanaChain(chainId!)) {
        return await this.executeSolanaTransaction(transactionRequest)
      } else if (this.isBitcoinChain(chainId!)) {
        return await this.executeBitcoinTransaction(transactionRequest)
      } else if (this.isSuiChain(chainId!)) {
        return await this.executeSuiTransaction(transactionRequest)
      } else {
        return await this.executeEVMTransaction(transactionRequest)
      }
    } catch (error) {
      console.error('Transaction execution failed:', error)
      throw parseTransactionError(error)
    }
  }

  // Execute EVM transaction
  private async executeEVMTransaction(transactionRequest: any): Promise<string> {
    // Use the connected provider if available, otherwise fall back to generic ethereum
    const provider = this.connectedProvider || (window as any).ethereum
    
    if (!provider) {
      throw new Error('No Ethereum provider found')
    }

    console.log('Executing EVM transaction with provider:', this.connectedWalletId)
    console.log('Transaction request:', transactionRequest)

    // Validate required fields
    if (!transactionRequest.to) {
      throw new Error('Transaction request missing "to" address')
    }

    if (!transactionRequest.data) {
      throw new Error('Transaction request missing "data" field')
    }

    // Ensure proper formatting for wallet
    const formattedTx = {
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: transactionRequest.value || '0x0',
      ...(transactionRequest.from && { from: transactionRequest.from }),
      ...(transactionRequest.gasPrice && { gasPrice: transactionRequest.gasPrice }),
      ...(transactionRequest.gasLimit && { gas: transactionRequest.gasLimit })
    }

    console.log('Formatted transaction for wallet:', formattedTx)

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [formattedTx]
    })

    console.log('Transaction hash received:', txHash)
    return txHash
  }

  // Execute Solana transaction
  private async executeSolanaTransaction(transactionRequest: any): Promise<string> {
    console.log('Executing Solana transaction with provider:', this.connectedWalletId)
    console.log('Transaction request:', transactionRequest)

    if (!transactionRequest.data) {
      throw new Error('Solana transaction request missing "data" field')
    }

    const Buffer = getBuffer()
    if (!Buffer) {
      throw new Error('Buffer not available for Solana transaction')
    }

    // Get the actual wallet provider directly from window object
    let provider: any = null
    
    if (this.connectedWalletId === 'phantom') {
      provider = (window as any).phantom?.solana
      if (!provider?.isPhantom) {
        throw new Error('Phantom Solana provider not found')
      }
    } else if (this.connectedWalletId === 'backpack') {
      provider = (window as any).backpack?.solana
      if (!provider) {
        throw new Error('Backpack Solana provider not found')
      }
    } else {
      // Fallback to stored provider
      provider = this.connectedProvider
      if (!provider) {
        throw new Error('No Solana wallet provider found')
      }
    }

    // Early check for required methods
    if (
      typeof provider.signTransaction !== 'function' &&
      typeof provider.signAndSendTransaction !== 'function'
    ) {
      console.error('Available provider methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(provider)))
      console.error('Available provider properties:', Object.keys(provider))
      throw new Error('Wallet provider does not support required transaction methods')
    }

    try {
      // Import Solana web3.js dynamically
      const { VersionedTransaction, Connection, Transaction } = await import('@solana/web3.js')
      
      // Decode the transaction data
      const transactionData = transactionRequest.data
      let transaction: any
      
      // Check if it's base64 encoded
      if (typeof transactionData === 'string') {
        const serializedTx = Buffer.from(transactionData, 'base64')
        
        // Try to deserialize as VersionedTransaction first
        try {
          transaction = VersionedTransaction.deserialize(serializedTx)
          console.log('Deserialized as VersionedTransaction')
        } catch (e) {
          // If that fails, try as legacy Transaction
          try {
            transaction = Transaction.from(serializedTx)
            console.log('Deserialized as legacy Transaction')
          } catch (e2) {
            console.error('Failed to deserialize transaction:', e, e2)
            throw new Error('Failed to deserialize Solana transaction')
          }
        }
      } else {
        // If it's already a transaction object
        transaction = transactionData
      }
      
      // Create a connection for sending
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
      
      // Use feature detection instead of wallet-specific logic
      if (typeof provider.signAndSendTransaction === 'function') {
        console.log('Using signAndSendTransaction method')
        
        try {
          const result = await provider.signAndSendTransaction(transaction)
          
          // Handle different response formats
          if (typeof result === 'string') {
            return result
          } else if (result?.signature) {
            return result.signature
          } else {
            console.error('Unexpected response from signAndSendTransaction:', result)
            throw new Error('Failed to get transaction signature')
          }
        } catch (error: any) {
          console.error('signAndSendTransaction error:', error)
          
          // If signAndSendTransaction fails, try the standard flow
          if (typeof provider.signTransaction === 'function') {
            console.log('Falling back to signTransaction + send')
            const signedTransaction = await provider.signTransaction(transaction)
            const signature = await connection.sendRawTransaction(signedTransaction.serialize())
            return signature
          } else {
            throw error
          }
        }
      } else if (typeof provider.signTransaction === 'function') {
        // Standard sign and send flow
        console.log('Using signTransaction + manual send flow')
        const signedTransaction = await provider.signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signedTransaction.serialize())
        return signature
      } else {
        throw new Error('Wallet provider does not support required transaction methods')
      }
    } catch (error: any) {
      console.error('Solana transaction execution error:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction rejected by user')
      } else if (error.message?.includes('signTransaction is not a function')) {
        throw new Error('Wallet does not support transaction signing. Please ensure your wallet is properly connected and supports Solana transactions.')
      } else if (error.message?.includes('wallet-adapter')) {
        throw new Error('Wallet adapter error. Please reconnect your wallet and try again.')
      } else {
        throw error
      }
    }
  }

  // Execute Bitcoin transaction
  private async executeBitcoinTransaction(transactionRequest: any): Promise<string> {
    const { to, value, data } = transactionRequest
    
    // Use the connected provider if available
    const provider = this.connectedProvider
    
    if (!provider) {
      throw new Error('No Bitcoin wallet provider found')
    }

    console.log('Executing Bitcoin transaction with provider:', this.connectedWalletId)
    console.log('Transaction request:', transactionRequest)

    // Handle different Bitcoin wallet providers
    switch (this.connectedWalletId) {
      case 'xverse':
        const xverseResponse = await provider.request('sendTransfer', {
          recipients: [{ address: to, amount: parseInt(value) }]
        })
        return xverseResponse.result.txid
        
      case 'ordinals':
        const ordinalsHash = await provider.sendBitcoin(to, parseInt(value))
        return ordinalsHash
        
      default:
        throw new Error(`Bitcoin transaction not implemented for wallet: ${this.connectedWalletId}`)
    }
  }

  // Sign Sui message (utility method)
  async signSuiMessage(message: string, address: string): Promise<any> {
    const provider = (window as any).phantom?.sui
    if (!provider?.isPhantom) {
      throw new Error('Phantom Sui provider not found')
    }

    try {
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await provider.signMessage(encodedMessage, address)
      return signature
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign message')
    }
  }

  // Execute Sui transaction
  private async executeSuiTransaction(transactionRequest: any): Promise<string> {
    const provider = this.connectedProvider
    
    if (!provider) {
      throw new Error('No Sui wallet provider found')
    }

    console.log('Executing Sui transaction with provider:', this.connectedWalletId)
    console.log('Transaction request:', transactionRequest)

    if (!transactionRequest.data) {
      throw new Error('Sui transaction request missing "data" field')
    }

    // Handle Phantom Sui transactions
    if (this.connectedWalletId === 'phantom') {
      try {
        // The transaction data should be the raw transaction from LiFi
        const transactionData = transactionRequest.data
        
        // Sign and execute the transaction
        const result = await provider.signAndExecuteTransactionBlock({
          transactionBlock: transactionData,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        })
        
        return result.digest // Return transaction hash/digest
      } catch (error: any) {
        console.error('Phantom Sui transaction error:', error)
        if (error.message?.includes('User rejected')) {
          throw new Error('Transaction rejected by user')
        }
        throw error
      }
    }
    
    throw new Error(`Sui transaction not implemented for wallet: ${this.connectedWalletId}`)
  }
}

// Export a singleton instance
export const walletAdapter = new WalletAdapter()
