"use client";

import { useEffect } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { DYNAMIC_ENV_ID } from "@/lib/dynamic";
import { UserProvider } from "@/contexts/UserContext";
import { DexModeProvider } from "@/contexts/DexModeContext";
import { TourProvider } from "@/contexts/TourContext";
import TourProviderComponent from "./Tour/TourProvider";
import { prefetchAllTickers } from "@/services/api";
import { MiniAppInit } from "./MiniAppInit";

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        void prefetchAllTickers();
    }, []);

    return (
        <DynamicContextProvider
            settings={{
                environmentId: DYNAMIC_ENV_ID,
                walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
            }}
        >
            <DexModeProvider>
                <UserProvider>
                    <TourProvider>
                        <TourProviderComponent>
                            <MiniAppInit />
                            {children}
                        </TourProviderComponent>
                    </TourProvider>
                </UserProvider>
            </DexModeProvider>
        </DynamicContextProvider>
    );
}
