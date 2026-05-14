import React from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const ConnectButton = () => {
    const { setShowAuthFlow } = useDynamicContext();

    return (
        <button
            onClick={() => setShowAuthFlow(true)}
            className="hidden md:flex items-center justify-center px-6 py-2 bg-[#0052FF] rounded-lg text-white font-geist text-sm hover:bg-[#0040cc] transition-colors shadow-[0_0_15px_rgba(0,82,255,0.3)]"
        >
            Connect Wallet
        </button>
    );
};

export default ConnectButton;
