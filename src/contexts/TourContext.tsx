'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUserContext } from './UserContext';

// LocalStorage keys
const TOUR_COMPLETED_KEY = 'tide_tour_completed';
const TOUR_SKIP_COUNT_KEY = 'tide_tour_skip_count';
const TOUR_SESSION_COUNT_KEY = 'tide_tour_session_count';
const EXCHANGE_TOURS_COMPLETED_KEY = 'tide_exchange_tours_completed';

// Tour types: onboarding is general, others are exchange-specific
export type TourType = 'onboarding' | 'hyperliquid' | 'aster' | 'lighter' | 'pacifica';

// Track which exchange tours have been completed
interface ExchangeToursCompleted {
  hyperliquid: boolean;
  aster: boolean;
  lighter: boolean;
  pacifica: boolean;
}

interface TourContextType {
  isRunning: boolean;
  currentStep: number;
  currentTourType: TourType;
  hasCompletedOnboarding: boolean;
  exchangeToursCompleted: ExchangeToursCompleted;
  skipCount: number;
  sessionCount: number;
  startTour: (type?: TourType) => void;
  stopTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  shouldShowReminder: boolean;
  hasCompletedExchangeTour: (exchange: 'hyperliquid' | 'aster' | 'lighter' | 'pacifica') => boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const defaultExchangeTours: ExchangeToursCompleted = {
  hyperliquid: false,
  aster: false,
  lighter: false,
  pacifica: false,
};

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTourType, setCurrentTourType] = useState<TourType>('onboarding');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // Default to true to prevent flash
  const [exchangeToursCompleted, setExchangeToursCompleted] = useState<ExchangeToursCompleted>(defaultExchangeTours);
  const [skipCount, setSkipCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    const skips = localStorage.getItem(TOUR_SKIP_COUNT_KEY);
    const sessions = localStorage.getItem(TOUR_SESSION_COUNT_KEY);
    const exchangeTours = localStorage.getItem(EXCHANGE_TOURS_COMPLETED_KEY);

    setHasCompletedOnboarding(completed === 'true');
    setSkipCount(skips ? parseInt(skips, 10) : 0);

    // Load exchange-specific tour completion status
    if (exchangeTours) {
      try {
        setExchangeToursCompleted(JSON.parse(exchangeTours));
      } catch {
        setExchangeToursCompleted(defaultExchangeTours);
      }
    }

    // Increment session count
    const newSessionCount = sessions ? parseInt(sessions, 10) + 1 : 1;
    setSessionCount(newSessionCount);
    localStorage.setItem(TOUR_SESSION_COUNT_KEY, newSessionCount.toString());

    setIsInitialized(true);
  }, []);

  // Calculate if we should show reminder (after 3 skips, stop asking)
  // Also require user to have set a username before showing tour
  const { user } = useUserContext();
  const hasUsername = !!user?.username;
  const shouldShowReminder = !hasCompletedOnboarding && skipCount < 3 && isInitialized && hasUsername;

  const startTour = useCallback((type: TourType = 'onboarding') => {
    // Guard: don't start a tour that's already been completed/dismissed
    if (type === 'onboarding' && hasCompletedOnboarding) return;
    if (type !== 'onboarding' && exchangeToursCompleted[type]) return;
    // Don't start if another tour is already running
    if (isRunning) return;

    setCurrentTourType(type);
    setCurrentStep(0);
    setIsRunning(true);
  }, [hasCompletedOnboarding, exchangeToursCompleted, isRunning]);

  const stopTour = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);
  }, []);

  const completeTour = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);

    // Mark the appropriate tour as completed
    if (currentTourType === 'onboarding') {
      setHasCompletedOnboarding(true);
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } else if (currentTourType === 'hyperliquid' || currentTourType === 'aster' || currentTourType === 'lighter' || currentTourType === 'pacifica') {
      setExchangeToursCompleted((prev) => {
        const updated = { ...prev, [currentTourType]: true };
        localStorage.setItem(EXCHANGE_TOURS_COMPLETED_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentTourType]);

  const skipTour = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);

    // Increment skip count using functional update to avoid stale closure
    setSkipCount((prev) => {
      const newSkipCount = prev + 1;
      localStorage.setItem(TOUR_SKIP_COUNT_KEY, newSkipCount.toString());
      return newSkipCount;
    });

    // IMPORTANT: Also mark the current tour as completed so it doesn't come back.
    // Skipping/closing a tour should be treated as dismissal.
    if (currentTourType === 'onboarding') {
      setHasCompletedOnboarding(true);
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } else if (
      currentTourType === 'hyperliquid' ||
      currentTourType === 'aster' ||
      currentTourType === 'lighter' ||
      currentTourType === 'pacifica'
    ) {
      setExchangeToursCompleted((prev) => {
        const updated = { ...prev, [currentTourType]: true };
        localStorage.setItem(EXCHANGE_TOURS_COMPLETED_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentTourType]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const hasCompletedExchangeTour = useCallback(
    (exchange: 'hyperliquid' | 'aster' | 'lighter' | 'pacifica') => {
      return exchangeToursCompleted[exchange];
    },
    [exchangeToursCompleted]
  );

  return (
    <TourContext.Provider
      value={{
        isRunning,
        currentStep,
        currentTourType,
        hasCompletedOnboarding,
        exchangeToursCompleted,
        skipCount,
        sessionCount,
        startTour,
        stopTour,
        completeTour,
        skipTour,
        setCurrentStep,
        nextStep,
        prevStep,
        shouldShowReminder,
        hasCompletedExchangeTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
