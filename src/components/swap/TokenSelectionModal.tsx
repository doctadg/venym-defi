import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { StandardizedAsset } from "@/types/asset";
import { useTokens } from "@/lib/hooks/useTokens";
import { TokenAvatar, ChainAvatar } from "@/components/ui/TokenAvatar";

// Popular chains configuration - ordered by priority (from v1)
const POPULAR_CHAIN_IDS = [
  '20000000000001',    // Bitcoin
  1,                   // Ethereum  
  '1151111081099710',  // Solana
  56,                  // BSC
  42161,               // Arbitrum
  8453,                // Base
  43114,               // Avalanche
  137,                 // Polygon
];

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: StandardizedAsset) => void;
  tokens: StandardizedAsset[];
  isLoading: boolean;
  error: Error | null;
}

const TokenSelectionModal = ({ isOpen, onClose, onSelect, tokens, isLoading, error }: TokenSelectionModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllChains, setShowAllChains] = useState(false);
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [selectedChainForTokens, setSelectedChainForTokens] = useState<any | null>(null);
  const [failedImages, setFailedImages] = useState(new Set<string>());
  

  // Get current tokens based on selected chain or all tokens
  const currentTokens = useMemo(() => {
    if (selectedChainForTokens) {
      return tokens.filter(token => token.chainId === selectedChainForTokens.id);
    }
    return tokens;
  }, [selectedChainForTokens, tokens]);

  // Filter and sort tokens based on search query and chain priority
  const filteredTokens = useMemo(() => {
    let tokensToFilter = currentTokens;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tokensToFilter = currentTokens.filter(token =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }
    
    // Sort tokens with popular chain priority (similar to v1)
    return [...tokensToFilter].sort((a, b) => {
      // Prioritize tokens with priorityOrder first
      if (a.priorityOrder !== undefined && b.priorityOrder !== undefined) {
        if (a.priorityOrder !== b.priorityOrder) {
          return a.priorityOrder - b.priorityOrder;
        }
      } else if (a.priorityOrder !== undefined) {
        return -1;
      } else if (b.priorityOrder !== undefined) {
        return 1;
      }

      // Then sort by chain priority using POPULAR_CHAIN_IDS
      const getChainPriority = (chainId: string | number) => {
        const index = POPULAR_CHAIN_IDS.findIndex(id => String(id) === String(chainId));
        return index === -1 ? 999 : index; // Popular chains get low numbers, others get 999
      };

      const chainPriorityA = getChainPriority(a.chainId);
      const chainPriorityB = getChainPriority(b.chainId);

      if (chainPriorityA !== chainPriorityB) {
        return chainPriorityA - chainPriorityB;
      }

      // Finally, sort by symbol alphabetically
      return a.symbol.localeCompare(b.symbol);
    });
  }, [currentTokens, searchQuery]);

  // Filter chains based on search query and prioritize popular chains
  const chains = useMemo(() => {
    const chainMap = new Map<string, any>();
    tokens.forEach(token => {
      if (!chainMap.has(token.chainId.toString())) {
        chainMap.set(token.chainId.toString(), {
          id: token.chainId,
          name: token.chainName || '',
          logoUrl: token.chainLogoUrl,
          key: (token.chainName || '').toLowerCase()
        });
      }
    });
    
    const allChains = Array.from(chainMap.values());
    
    // Separate popular chains from others
    const popularChains: any[] = [];
    const otherChains: any[] = [];

    allChains.forEach(chain => {
      const isPopular = POPULAR_CHAIN_IDS.some(popularId => 
        String(chain.id) === String(popularId)
      );
      
      if (isPopular) {
        popularChains.push(chain);
      } else {
        otherChains.push(chain);
      }
    });

    // Sort popular chains by their order in POPULAR_CHAIN_IDS
    popularChains.sort((a, b) => {
      const indexA = POPULAR_CHAIN_IDS.findIndex(id => String(id) === String(a.id));
      const indexB = POPULAR_CHAIN_IDS.findIndex(id => String(id) === String(b.id));
      return indexA - indexB;
    });

    // Sort other chains alphabetically
    otherChains.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    
    return [...popularChains, ...otherChains];
  }, [tokens]);

  const filteredChains = useMemo(() => {
    if (!chainSearchQuery.trim()) {
      return chains;
    }
    
    const query = chainSearchQuery.toLowerCase();
    const filtered = chains.filter(chain =>
      chain.name.toLowerCase().includes(query) ||
      chain.key.toLowerCase().includes(query)
    );
    
    // Maintain popular chain priority even when filtering
    const popularFiltered: any[] = [];
    const otherFiltered: any[] = [];

    filtered.forEach(chain => {
      const isPopular = POPULAR_CHAIN_IDS.some(popularId => 
        String(chain.id) === String(popularId)
      );
      
      if (isPopular) {
        popularFiltered.push(chain);
      } else {
        otherFiltered.push(chain);
      }
    });

    // Sort popular chains by their order in POPULAR_CHAIN_IDS
    popularFiltered.sort((a, b) => {
      const indexA = POPULAR_CHAIN_IDS.findIndex(id => String(id) === String(a.id));
      const indexB = POPULAR_CHAIN_IDS.findIndex(id => String(id) === String(b.id));
      return indexA - indexB;
    });

    // Sort other chains alphabetically
    otherFiltered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    
    return [...popularFiltered, ...otherFiltered];
  }, [chains, chainSearchQuery]);

  const handleTokenSelect = useCallback((token: StandardizedAsset) => {
    onSelect(token);
    handleClose();
  }, [onSelect]);

  const handleChainSelect = useCallback((chain: any) => {
    setSelectedChainForTokens(chain);
    setShowAllChains(false);
    setChainSearchQuery("");
    setSearchQuery(""); // Clear token search when selecting new chain
  }, []);

  const handleBack = useCallback(() => {
    if (selectedChainForTokens) {
      setSelectedChainForTokens(null);
      setSearchQuery(""); // Clear search when going back
    } else {
      setShowAllChains(false);
      setChainSearchQuery("");
    }
  }, [selectedChainForTokens]);

  const handleClose = useCallback(() => {
    onClose();
    // Reset all state when closing
    setSearchQuery("");
    setShowAllChains(false);
    setChainSearchQuery("");
    setSelectedChainForTokens(null);
  }, [onClose]);

  // Reset state when modal opens
  const handleModalOpen = useCallback(() => {
    if (isOpen) {
      setSearchQuery("");
      setShowAllChains(false);
      setChainSearchQuery("");
      setSelectedChainForTokens(null);
    }
  }, [isOpen]);

  // Effect to handle modal open state
  useMemo(() => {
    handleModalOpen();
  }, [handleModalOpen]);

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg w-full mx-4 rounded-3xl">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Failed to load data</div>
            <div className="text-sm text-gray-500">{error.message}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg rounded-2xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold text-black">
            {(showAllChains || selectedChainForTokens) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-black truncate">
              {selectedChainForTokens 
                ? `Select Token on ${selectedChainForTokens.name}`
                : showAllChains 
                ? "Select Chain" 
                : "Select Token"
              }
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedChainForTokens ? (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by token name or symbol"
                    className="bg-gray-50 border-gray-200 pl-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-300 rounded-2xl"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredTokens.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      {searchQuery ? 'No tokens found matching your search' : 'No tokens available on this chain'}
                    </div>
                  ) : (
                    filteredTokens.slice(0, 50).map((token, index) => (
                      <motion.button
                        key={`${token.chainId}-${token.address}`}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 1) }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <TokenAvatar token={token} size="w-10 h-10" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{token.symbol}</span>
                          </div>
                          <div className="text-sm text-gray-500 truncate">{token.name}</div>
                        </div>
                        {token.priceUsd && (
                          <div className="text-right text-sm text-gray-600 flex-shrink-0">
                            ${parseFloat(token.priceUsd.toString()).toFixed(2)}
                          </div>
                        )}
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            ) : !showAllChains ? (
              <motion.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3 p-2 sm:p-4">
                    {chains.slice(0, 7).map((chain, index) => (
                      <motion.button
                        key={chain.id}
                        onClick={() => handleChainSelect(chain)}
                        className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ChainAvatar chain={chain} />
                      </motion.button>
                    ))}
                  </div>
                  {chains.length > 7 && (
                    <motion.button
                      onClick={() => setShowAllChains(true)}
                      className="w-full mx-2 sm:mx-4 flex items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm transition-colors border border-gray-200 font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      Show all chains
                    </motion.button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by token name or symbol"
                    className="bg-gray-50 border-gray-200 pl-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-300 rounded-2xl"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredTokens.slice(0, 20).map((token, index) => {
                    // Find the chain for this token
                    const tokenChain = chains.find(c => c.id === token.chainId);
                    if (!tokenChain) return null;

                    return (
                      <motion.button
                        key={`${token.chainId}-${token.address}`}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="relative">
                          <TokenAvatar token={token} size="w-10 h-10" />
                          <div className="absolute -bottom-1 -right-1">
                            <ChainAvatar chain={tokenChain} size="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{token.symbol}</span>
                            <span className="text-xs text-gray-500">{tokenChain.name}</span>
                          </div>
                          <div className="text-sm text-gray-500 truncate">{token.name}</div>
                        </div>
                        {token.priceUsd && (
                          <div className="text-right text-sm text-gray-600 flex-shrink-0">
                            ${parseFloat(token.priceUsd.toString()).toFixed(2)}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="all-chains"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by chain name"
                    className="bg-gray-50 border-gray-200 pl-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-300 rounded-2xl"
                    value={chainSearchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChainSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredChains.map((chain, index) => (
                    <motion.button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <ChainAvatar chain={chain} size="w-12 h-12" />
                      <div className="text-lg font-medium text-gray-900">{chain.name}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TokenSelectionModal;
