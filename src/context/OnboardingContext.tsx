'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface OnboardingState {
  completedPages: Set<string>;
  dismissedPages: Set<string>;
  currentStep: string | null;
}

interface OnboardingContextType {
  hasSeenPage: (pageId: string) => boolean;
  markPageAsSeen: (pageId: string) => void;
  dismissPage: (pageId: string) => void;
  resetOnboarding: () => void;
  showOnboarding: (pageId: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'transovo_onboarding';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    completedPages: new Set(),
    dismissedPages: new Set(),
    currentStep: null
  });

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({
          completedPages: new Set(parsed.completedPages || []),
          dismissedPages: new Set(parsed.dismissedPages || []),
          currentStep: null
        });
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completedPages: Array.from(state.completedPages),
        dismissedPages: Array.from(state.dismissedPages)
      }));
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, [state.completedPages, state.dismissedPages]);

  const hasSeenPage = (pageId: string): boolean => {
    return state.completedPages.has(pageId) || state.dismissedPages.has(pageId);
  };

  const markPageAsSeen = (pageId: string) => {
    setState(prev => ({
      ...prev,
      completedPages: new Set([...prev.completedPages, pageId])
    }));
  };

  const dismissPage = (pageId: string) => {
    setState(prev => ({
      ...prev,
      dismissedPages: new Set([...prev.dismissedPages, pageId])
    }));
  };

  const showOnboarding = (pageId: string): boolean => {
    const result = !hasSeenPage(pageId);
    console.log('🔍 [OnboardingContext] showOnboarding called for:', pageId, 'result:', result, 'completedPages:', Array.from(state.completedPages), 'dismissedPages:', Array.from(state.dismissedPages));
    return result;
  };

  const resetOnboarding = () => {
    setState({
      completedPages: new Set(),
      dismissedPages: new Set(),
      currentStep: null
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasSeenPage,
        markPageAsSeen,
        dismissPage,
        resetOnboarding,
        showOnboarding
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

