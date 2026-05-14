"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import Trade from '@/components/Trade';

import Portfolio from '@/components/Portfolio';
import Points from '@/components/Points';
import Leaderboard from '@/components/Leaderboard';
import Referral from '@/components/Referral';
import Settings from '@/components/Settings';
import MobileNav from '@/components/mobile/MobileNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileTrade from '@/components/mobile/MobileTrade';

import MobilePortfolio from '@/components/mobile/MobilePortfolio';
import { AppView } from '@/types';
import { useUserRegistration } from '@/hooks/useUserRegistration';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import DepositModal from '@/components/DepositModal';
import AccessGate from '@/components/AccessGate';
import { useIsMobile } from '@/hooks/useMediaQuery';

function HomeContent() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.TRADE);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState('BTC/USD');
  const { primaryWallet } = useDynamicContext();
  const isMobile = useIsMobile();

  // Keep registration hook to ensure user is registered
  useUserRegistration();

  // Desktop view renderer
  const renderDesktopView = () => {
    switch (currentView) {
      case AppView.TRADE:
        return <Trade />;

      case AppView.PORTFOLIO:
        return <Portfolio />;
      case AppView.POINTS:
        return <Points />;
      case AppView.LEADERBOARD:
        return <Leaderboard />;
      case AppView.REFERRAL:
        return <Referral />;
      case AppView.SETTINGS:
        return <Settings />;
      default:
        return <Trade />;
    }
  };

  // Mobile view renderer
  const renderMobileView = () => {
    switch (currentView) {
      case AppView.TRADE:
        return (
          <MobileTrade
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
          />
        );

      case AppView.PORTFOLIO:
        return <MobilePortfolio />;
      case AppView.POINTS:
      case AppView.LEADERBOARD:
        // Markets view - show Points for now
        return <Points />;
      case AppView.REFERRAL:
        return <Referral />;
      case AppView.SETTINGS:
        return <Settings />;
      default:
        return (
          <MobileTrade
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-bg flex flex-col font-sans selection:bg-white/90 selection:text-black overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          onDepositClick={() => setIsDepositModalOpen(true)}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full overflow-hidden bg-bg relative">
        {/* Desktop View */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden">
          {renderDesktopView()}
        </div>

        {/* Mobile View */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden pb-16">
          {renderMobileView()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        exchange="Hyperliquid"
        walletAddress={primaryWallet?.address || ''}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AccessGate>
      <HomeContent />
    </AccessGate>
  );
}
