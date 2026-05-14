'use client';

import React from 'react';
import { useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import ConnectButton from '../Auth/ConnectButton';
import UserDropdown from '../Auth/UserDropdown';

interface MobileHeaderProps {
    onMenuClick?: () => void;
}

// Hamburger Menu Icon
const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 6H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 18H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const MobileHeader: React.FC<MobileHeaderProps> = ({
    onMenuClick
}) => {
    const isLoggedIn = useIsLoggedIn();

    return (
        <header className="sticky top-0 z-50 w-full bg-[#0A0E17] border-b border-white/10 px-4 py-3 md:hidden safe-area-top">
            <div className="flex items-center justify-between">
                {/* Left: Menu + Logo */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <MenuIcon />
                    </button>
                    <img
                        src="/tideblue.svg"
                        alt="Tide"
                        className="h-6 w-auto"
                    />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {isLoggedIn ? (
                        <UserDropdown />
                    ) : (
                        <ConnectButton />
                    )}
                </div>
            </div>
        </header>
    );
};

export default MobileHeader;
