import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DexMode = 'auto' | 'hyperliquid' | 'aster' | 'lighter' | 'pacifica' | 'avantis';

interface DexModeContextType {
    mode: DexMode;
    setMode: (mode: DexMode) => void;
}

const DexModeContext = createContext<DexModeContextType | undefined>(undefined);

const STORAGE_KEY = 'tide_dex_mode';

export const DexModeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setModeState] = useState<DexMode>('auto');

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ['auto', 'hyperliquid', 'aster', 'lighter', 'pacifica', 'avantis'].includes(stored)) {
            setModeState(stored as DexMode);
        }
    }, []);

    const setMode = (newMode: DexMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    };

    return (
        <DexModeContext.Provider value={{ mode, setMode }}>
            {children}
        </DexModeContext.Provider>
    );
};

export const useDexMode = () => {
    const context = useContext(DexModeContext);
    if (context === undefined) {
        throw new Error('useDexMode must be used within a DexModeProvider');
    }
    return context;
};
