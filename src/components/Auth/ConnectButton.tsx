import React from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const ConnectButton = () => {
    const { setShowAuthFlow } = useDynamicContext();

    return (
        <button
            onClick={() => setShowAuthFlow(true)}
            className="hidden md:flex items-center justify-center px-6 py-2 bg-white/90 rounded-lg text-black font-sans text-sm font-medium hover:bg-white transition-colors"
        >
            Connect Wallet
        </button>
    );
};

export default ConnectButton;
