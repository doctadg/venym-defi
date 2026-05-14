import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
    id: number;
    wallet_address: string;
    email?: string;
    username?: string;
    is_active?: boolean;
    is_verified?: boolean;
    created_at?: string;
    last_login_at?: string;
    telegram_id?: string;
    referred_by?: string;
    is_waitlisted?: boolean;
    waitlisted_at?: string;
    [key: string]: any;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    return (
        <UserContext.Provider value={{ user, setUser, isLoading, setIsLoading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
