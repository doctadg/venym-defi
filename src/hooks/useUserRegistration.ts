import { useEffect, useRef, useCallback } from 'react';
import { useDynamicContext, useIsLoggedIn, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { registerUser } from '../services/api';
import { useUserContext } from '../contexts/UserContext';

export const useUserRegistration = () => {
    const isLoggedIn = useIsLoggedIn();
    const { primaryWallet } = useDynamicContext();
    const { setUser, setIsLoading } = useUserContext();
    const hasRegistered = useRef(false);

    const register = useCallback(async (force: boolean = false) => {
        if (!isLoggedIn || !primaryWallet?.address) return;

        // Prevent double registration in strict mode, but allow forced refetch
        if (!force && hasRegistered.current) return;

        hasRegistered.current = true;
        setIsLoading(true);

        console.log('User logged in, attempting registration for:', primaryWallet.address);
        try {
            // Get auth token from Dynamic SDK (stored in localStorage)
            const token = getAuthToken();
            if (!token) {
                console.warn('No auth token available for registration');
            }

            const result = await registerUser(primaryWallet.address, token ?? undefined);
            console.log('Registration result:', result);

            if (result.success && result.data) {
                setUser(result.data);
            }
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, primaryWallet?.address, setUser, setIsLoading]);

    useEffect(() => {
        const initialRegister = async () => {
            if (isLoggedIn && primaryWallet?.address && !hasRegistered.current) {
                await register();
            } else if (!isLoggedIn) {
                hasRegistered.current = false;
                setUser(null);
            }
        };
        initialRegister();
    }, [isLoggedIn, primaryWallet?.address, register, setUser]);

    return { refetch: register };
};
