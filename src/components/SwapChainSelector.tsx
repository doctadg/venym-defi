'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChainMapping } from '@/types/swap';
import { CHAIN_MAPPINGS, ChainMappingService } from '@/services/swap/chainMapping';
import { ChevronDown } from 'lucide-react';

interface SwapChainSelectorProps {
  chainId: string | number | null;
  onSelect: (chainId: string | number) => void;
  label?: string;
  excludeChainId?: string | number | null;
}

const POPULAR_CHAINS = [1, 42161, 8453, 137, 56, 10, 43114];

const SwapChainSelector: React.FC<SwapChainSelectorProps> = ({
  chainId,
  onSelect,
  label,
  excludeChainId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const uniqueChains = ChainMappingService.getUniqueChains();
  const selected = chainId ? ChainMappingService.getByLiFiChainId(chainId) : null;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filteredChains = uniqueChains.filter(c => {
    if (excludeChainId != null) {
      const exMapping = ChainMappingService.getByLiFiChainId(excludeChainId);
      if (exMapping && c.name === exMapping.name) return false;
    }
    return true;
  });

  // Sort: popular first
  const sorted = [...filteredChains].sort((a, b) => {
    const aIdx = POPULAR_CHAINS.indexOf(Number(a.lifiChainId));
    const bIdx = POPULAR_CHAINS.indexOf(Number(b.lifiChainId));
    const aScore = aIdx >= 0 ? aIdx : 999;
    const bScore = bIdx >= 0 ? bIdx : 999;
    return aScore - bScore;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <span className="text-base">{selected?.icon || '⛓️'}</span>
        <span className="text-sm text-[#e4e4e7] font-medium">
          {selected?.name || 'Select Chain'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-white/40" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto py-1">
            {sorted.map(chain => {
              const isSelected = chain.lifiChainId === chainId ||
                String(chain.lifiChainId) === String(chainId);
              return (
                <button
                  key={String(chain.lifiChainId)}
                  onClick={() => {
                    onSelect(chain.lifiChainId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors ${
                    isSelected ? 'bg-white/5' : ''
                  }`}
                >
                  <span className="text-base">{chain.icon}</span>
                  <div className="flex-1 text-left">
                    <span className="text-sm text-[#e4e4e7]">{chain.name}</span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapChainSelector;
