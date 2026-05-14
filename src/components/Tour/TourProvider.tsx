'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
import { useTour, TourType } from '../../contexts/TourContext';
import {
  onboardingSteps,
  hyperliquidSteps,
  asterSteps,
  lighterSteps,
  pacificaSteps,
} from './steps/onboardingSteps';
import TourTooltip from './TourTooltip';

interface TourProviderProps {
  children: React.ReactNode;
}

// Map tour types to their step arrays
const tourStepsMap: Record<TourType, Step[]> = {
  onboarding: onboardingSteps,
  hyperliquid: hyperliquidSteps,
  aster: asterSteps,
  lighter: lighterSteps,
  pacifica: pacificaSteps,
};

const TourProviderComponent: React.FC<TourProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  const {
    isRunning,
    currentStep,
    currentTourType,
    setCurrentStep,
    completeTour,
    skipTour,
  } = useTour();

  // Get the appropriate steps based on current tour type
  const currentSteps = useMemo(() => {
    return tourStepsMap[currentTourType] || onboardingSteps;
  }, [currentTourType]);

  // Only render Joyride on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      // Handle step changes
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          setCurrentStep(index + 1);
        } else if (action === ACTIONS.PREV) {
          setCurrentStep(index - 1);
        }
      }

      // Handle tour completion
      if (status === STATUS.FINISHED) {
        completeTour();
      }

      // Handle skip/close
      if (status === STATUS.SKIPPED) {
        skipTour();
      }

      // Handle close button
      if (action === ACTIONS.CLOSE) {
        skipTour();
      }
    },
    [setCurrentStep, completeTour, skipTour]
  );

  return (
    <>
      {children}
      {mounted && (
        <Joyride
          steps={currentSteps}
          run={isRunning}
          stepIndex={currentStep}
          continuous
          showProgress
          showSkipButton
          hideCloseButton={false}
          disableOverlayClose
          disableScrolling={false}
          spotlightClicks
          callback={handleJoyrideCallback}
          tooltipComponent={TourTooltip}
          floaterProps={{
            styles: {
              floater: {
                filter: 'none',
              },
            },
          }}
          styles={{
            options: {
              zIndex: 10000,
              arrowColor: '#14192F',
              backgroundColor: '#14192F',
              overlayColor: 'rgba(0, 0, 0, 0.7)',
              primaryColor: '#1e40c6',
              textColor: '#BBBBBB',
            },
            spotlight: {
              borderRadius: 12,
            },
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            },
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip tour',
          }}
        />
      )}
    </>
  );
};

export default TourProviderComponent;
