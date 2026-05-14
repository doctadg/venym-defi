'use client';

import React, { useState, useEffect, useCallback } from 'react';

import TVChart from './TVChart';
import OrderPanel from './OrderPanel';
import PositionsTable from './PositionsTable';
import OrderBook from './OrderBook';
import DepositModal from './DepositModal';
import { useBalances } from '../hooks/useBalances';
import TickerSelectionModal from './TickerSelectionModal';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useTour } from '../contexts/TourContext';

const Trade = () => {
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC/USD');
  const [chartInterval, setChartInterval] = useState<string>('1m');
  const [chartTimeframe, setChartTimeframe] = useState<string>('1D');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isTickerModalOpen, setIsTickerModalOpen] = useState(false);

  const { primaryWallet } = useDynamicContext();
  const walletAddress = primaryWallet?.address || '';

  // Lift balance state up so it can be refreshed from DepositModal
  const { balanceData, loading: balanceLoading, refresh: refreshBalances } = useBalances(walletAddress);

  // Tour context for onboarding
  const { startTour, shouldShowReminder } = useTour();

  // Auto-start tour for new users
  useEffect(() => {
    if (shouldShowReminder && walletAddress) {
      // Small delay to let UI render and elements mount
      const timer = setTimeout(() => {
        startTour('onboarding');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowReminder, walletAddress, startTour]);

  const handleDepositSuccess = () => {
    // Refresh balances after successful deposit
    refreshBalances();
    setIsDepositModalOpen(false);
  };

  // Keyboard shortcut: Cmd/Ctrl + K to open ticker modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsTickerModalOpen(true);
      }
      if (e.key === 'Escape' && isTickerModalOpen) {
        setIsTickerModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTickerModalOpen]);

  const setSymbolAndResetChart = (symbol: string) => {
    setActiveSymbol(symbol);
    setChartInterval('1m');
    setChartTimeframe('1D');
  };

  const handleSymbolSelect = (symbol: string, _platform?: string) => {
    setSymbolAndResetChart(symbol);
    setIsTickerModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full overflow-y-auto lg:overflow-hidden gap-3 p-3 lg:p-4 h-full">
      {/* Left Main Area */}
      <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">

        {/* Top Section */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Normal chart + orderbook */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-[450px] lg:min-h-0">
            {/* Chart */}
            <div className="flex-1 h-full">
              <TVChart
                activeSymbol={activeSymbol}
                onSymbolChange={setSymbolAndResetChart}
                interval={chartInterval}
                timeframe={chartTimeframe}
                onSymbolClick={() => setIsTickerModalOpen(true)}
                tickerModalOpen={isTickerModalOpen}
                tickerModal={
                  <TickerSelectionModal
                    isOpen={isTickerModalOpen}
                    onClose={() => setIsTickerModalOpen(false)}
                    onSelect={handleSymbolSelect}
                    currentSymbol={activeSymbol}
                  />
                }
              />
            </div>

            {/* Order Book & Recent Trades Column */}
            <div className="hidden lg:flex flex-col gap-3 w-[260px] h-full">
              <div className="flex-1 min-h-0">
                <OrderBook activeSymbol={activeSymbol} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Positions */}
        <div className="flex-none h-[250px] lg:h-[280px]">
          <PositionsTable />
        </div>
      </div>

      {/* Right Column: Order Panel */}
      <div className="flex-none w-full lg:w-[320px] h-full">
        <OrderPanel
          activeSymbol={activeSymbol}
          onDepositClick={() => setIsDepositModalOpen(true)}
          balanceData={balanceData}
          balanceLoading={balanceLoading}
        />
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDepositSuccess={handleDepositSuccess}
        exchange="hyperliquid"
        walletAddress={walletAddress}
      />
    </div>
  );
};

export default Trade;