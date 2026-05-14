"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import PairTrade from '@/components/PairTrade';
import MobileNav from '@/components/mobile/MobileNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobilePairTrade from '@/components/mobile/MobilePairTrade';
import { AppView } from '@/types';
import { useUserRegistration } from '@/hooks/useUserRegistration';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import DepositModal from '@/components/DepositModal';
import AccessGate from '@/components/AccessGate';
import { useIsMobile } from '@/hooks/useMediaQuery';

function PairTradingContent() {
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { primaryWallet } = useDynamicContext();
    const isMobile = useIsMobile();

    // Keep registration hook to ensure user is registered
    useUserRegistration();

    return (
        <div className="h-screen bg-bg flex flex-col font-sans selection:bg-white/90 selection:text-black overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:block">
                <Header
                    currentView={AppView.PAIR_TRADING}
                    onViewChange={() => { }}
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
                    <PairTrade />
                </div>

                {/* Mobile View */}
                <div className="flex md:hidden flex-1 flex-col overflow-hidden pb-16">
                    <MobilePairTrade />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav
                currentView={AppView.PAIR_TRADING}
                onViewChange={() => { }}
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

export default function PairTradingPage() {
    return (
        <AccessGate>
            <PairTradingContent />
        </AccessGate>
    );
}
