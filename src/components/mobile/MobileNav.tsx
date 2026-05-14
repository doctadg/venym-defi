'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { AppView } from '@/types';

interface MobileNavProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

// SVG Icons
const MarketIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3 17L9 11L13 15L21 7"
            stroke={active ? '#1e40c6' : '#8E8E8E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M17 7H21V11"
            stroke={active ? '#1e40c6' : '#8E8E8E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const TradeIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke={active ? '#1e40c6' : '#8E8E8E'} strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke={active ? '#1e40c6' : '#8E8E8E'} strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke={active ? '#1e40c6' : '#8E8E8E'} strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke={active ? '#1e40c6' : '#8E8E8E'} strokeWidth="2" />
    </svg>
);

const PortfolioIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
            stroke={active ? '#1e40c6' : '#8E8E8E'}
            strokeWidth="2"
        />
        <path
            d="M12 6V12L16 14"
            stroke={active ? '#1e40c6' : '#8E8E8E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const NavItem = ({
    label,
    icon,
    active,
    onClick
}: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${active ? 'text-[#1e40c6]' : 'text-[#8E8E8E]'
            }`}
    >
        {icon}
        <span className={`text-[10px] font-medium ${active ? 'text-[#1e40c6]' : 'text-[#8E8E8E]'}`}>
            {label}
        </span>
    </button>
);

const LinkNavItem = ({
    label,
    icon,
    active,
    href
}: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    href: string;
}) => (
    <Link
        href={href}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${active ? 'text-[#1e40c6]' : 'text-[#8E8E8E]'
            }`}
    >
        {icon}
        <span className={`text-[10px] font-medium ${active ? 'text-[#1e40c6]' : 'text-[#8E8E8E]'}`}>
            {label}
        </span>
    </Link>
);

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onViewChange }) => {
    const pathname = usePathname();

    const isPairTradingActive = pathname === '/pair-trading';
    const isTradeActive = pathname === '/' && currentView === AppView.TRADE && !isPairTradingActive;
    const isPortfolioActive = currentView === AppView.PORTFOLIO;
    const isMarketActive = currentView === AppView.POINTS || currentView === AppView.LEADERBOARD;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#14192F] border-t border-white/10 flex items-center justify-around px-4 z-50 md:hidden safe-area-bottom">
            <NavItem
                label="Market"
                icon={<MarketIcon active={isMarketActive} />}
                active={isMarketActive}
                onClick={() => onViewChange(AppView.POINTS)}
            />
            <LinkNavItem
                label="Trade"
                icon={<TradeIcon active={isTradeActive} />}
                active={isTradeActive}
                href="/"
            />
            <LinkNavItem
                label="Pair Trade"
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M3 16L7 12L11 14L15 8L21 12"
                            stroke={isPairTradingActive ? '#1e40c6' : '#8E8E8E'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M3 10L7 14L11 10L15 16L21 10"
                            stroke={isPairTradingActive ? '#1e40c6' : '#8E8E8E'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.5"
                        />
                    </svg>
                }
                active={isPairTradingActive}
                href="/pair-trading"
            />
            <NavItem
                label="Portfolio"
                icon={<PortfolioIcon active={isPortfolioActive} />}
                active={isPortfolioActive}
                onClick={() => onViewChange(AppView.PORTFOLIO)}
            />
        </nav>
    );
};

export default MobileNav;

