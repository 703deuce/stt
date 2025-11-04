'use client';

import React, { useEffect, useState } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingTooltip from '../components/OnboardingTooltip';

export interface OnboardingStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface UsePageOnboardingOptions {
  pageId: string;
  steps: OnboardingStep[];
  autoStart?: boolean;
}

export function usePageOnboarding({ pageId, steps, autoStart = true }: UsePageOnboardingOptions) {
  const { showOnboarding, markPageAsSeen, dismissPage } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Check if onboarding should show
    const shouldShow = showOnboarding(pageId);
    console.log('🎯 [Onboarding] Checking onboarding for page:', pageId, 'shouldShow:', shouldShow, 'autoStart:', autoStart, 'steps:', steps.length);
    
    if (autoStart && shouldShow && steps.length > 0) {
      console.log('✅ [Onboarding] Starting onboarding for page:', pageId);
      // Wait a bit for page to render and ensure DOM is ready
      const timer = setTimeout(() => {
        // Check if first target element exists before starting
        const firstTarget = document.getElementById(steps[0].targetId);
        if (firstTarget) {
          console.log('✅ [Onboarding] First target found, starting onboarding');
          setCurrentStepIndex(0);
          setIsActive(true);
        } else {
          console.warn('⚠️ [Onboarding] First target element not found:', steps[0].targetId, 'Retrying...');
          // Retry after a longer delay if element not found
          setTimeout(() => {
            const retryTarget = document.getElementById(steps[0].targetId);
            if (retryTarget) {
              console.log('✅ [Onboarding] Target found on retry, starting onboarding');
              setCurrentStepIndex(0);
              setIsActive(true);
            } else {
              console.error('❌ [Onboarding] Target element still not found after retry:', steps[0].targetId);
            }
          }, 1000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      console.log('⏭️ [Onboarding] Skipping onboarding:', { shouldShow, autoStart, stepsLength: steps.length });
    }
  }, [pageId, autoStart, steps.length]);

  const handleComplete = () => {
    // Automatically mark page as seen after first interaction
    // This ensures onboarding only shows once per page
    markPageAsSeen(pageId);
    
    if (currentStepIndex === null || currentStepIndex === steps.length - 1) {
      // Last step or no step - close onboarding
      setIsActive(false);
      setCurrentStepIndex(null);
    } else {
      // Move to next step
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleDismiss = () => {
    // Automatically mark page as seen when dismissed
    // This ensures onboarding only shows once per page
    markPageAsSeen(pageId);
    
    // Just skip current step and move to next
    if (currentStepIndex !== null && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Last step, just close
      setIsActive(false);
      setCurrentStepIndex(null);
    }
  };

  const startOnboarding = () => {
    if (steps.length > 0) {
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  };

  const currentStep = currentStepIndex !== null ? steps[currentStepIndex] : null;

  const OnboardingComponent: React.FC = () => {
    console.log('🎨 [OnboardingComponent] Rendering check:', { isActive, currentStep, currentStepIndex });
    
    if (!isActive || !currentStep || currentStepIndex === null) {
      console.log('⏭️ [OnboardingComponent] Not rendering - conditions not met');
      return null;
    }

    console.log('✅ [OnboardingComponent] Rendering tooltip for step:', currentStepIndex + 1, 'targetId:', currentStep.targetId);

    return (
      <OnboardingTooltip
        targetId={currentStep.targetId}
        title={currentStep.title}
        description={currentStep.description}
        position={currentStep.position || 'bottom'}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
        step={currentStepIndex + 1}
        totalSteps={steps.length}
      />
    );
  };

  return {
    isActive,
    currentStepIndex,
    startOnboarding,
    OnboardingComponent
  };
}

