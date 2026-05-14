'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StandardizedAsset } from '@/types/swap';
import { ChainMappingService } from '@/lib/swap/chainMapping';
import { Search, X } from 'lucide-react';

interface SwapTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: StandardizedAsset[];
  onSelect: (token: StandardizedAsset) => void;
  selectedToken?: StandardizedAsset | null;
  title?: string;
}

const SwapTokenModal: React.FC<SwapTokenModalProps> = ({
  isOpen,
  onClose,
  tokens,
  onSelect,
  selectedToken,
  title = 'Select Token',
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const chains = useMemo(() => ChainMappingService.getUniqueChains(), []);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = tokens;

    if (selectedChain) {
      result = result.filter(t => {
        const chainInfo = ChainMappingService.getChainInfo(t.chainId);
        return chainInfo?.name === selectedChain;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      );
    }

    // Sort: priority tokens first, then alphabetically
    return result.sort((a, b) => {
      const aP = a.priorityOrder ?? Infinity;
      const bP = b.priorityOrder ?? Infinity;
      if (aP !== bP) return aP - bP;
      return a.symbol.localeCompare(b.symbol);
    }).slice(0, 100);
  }, [tokens, search, selectedChain]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-[#e4e4e7]">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full bg-[#050505] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        {/* Chain filter */}
        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedChain(null)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                !selectedChain ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {chains.slice(0, 10).map(chain => (
              <button
                key={chain.name}
                onClick={() => setSelectedChain(selectedChain === chain.name ? null : chain.name)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedChain === chain.name ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                <span>{chain.icon}</span>
                <span>{chain.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Token list */}
        <div className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No tokens found
            </div>
          ) : (
            filtered.map(token => {
              const isSelected = selectedToken &&
                String(token.chainId) === String(selectedToken.chainId) &&
                token.address.toLowerCase() === selectedToken.address.toLowerCase();

              const chainInfo = ChainMappingService.getChainInfo(token.chainId);

              return (
                <button
                  key={`${token.chainId}-${token.address}`}
                  onClick={() => { onSelect(token); onClose(); }}
                  disabled={isSelected}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {/* Token icon */}
                  <div className="relative flex-shrink-0">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="w-9 h-9 rounded-full"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}
                    {/* Chain badge */}
                    {chainInfo && (
                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">{chainInfo.icon}</span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#e4e4e7]">{token.symbol}</span>
                      <span className="text-xs text-white/30">{chainInfo?.name}</span>
                    </div>
                    <p className="text-xs text-white/40 truncate">{token.name}</p>
                  </div>

                  {/* Price */}
                  {token.priceUsd && (
                    <div className="text-right">
                      <span className="text-xs text-white/50">${token.priceUsd < 0.01 ? '<0.01' : token.priceUsd.toFixed(2)}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapTokenModal;
