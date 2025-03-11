'use client';

import { ReactNode, createContext, useContext, useState } from 'react';
import { BrowserRewindStep } from '~src/app/portal/BrowserRewind';

interface BrowserRewindHistoryContextType {
  rewindSteps: BrowserRewindStep[];
  currentStepIndex: number;
  isRewindMode: boolean;
  addRewindStep: (step: BrowserRewindStep) => void;
  rewindToStep: (index: number) => void;
  resumeLiveMode: () => void;
  clearHistory: () => void;
}

const defaultContext: BrowserRewindHistoryContextType = {
  rewindSteps: [],
  currentStepIndex: -1,
  isRewindMode: false,
  addRewindStep: () => {},
  rewindToStep: () => {},
  resumeLiveMode: () => {},
  clearHistory: () => {},
};

export const BrowserRewindHistoryContext = createContext<BrowserRewindHistoryContextType>(defaultContext);

export function useBrowserRewindHistory() {
  const context = useContext(BrowserRewindHistoryContext);
  const currentStep = context.currentStepIndex >= 0 ? context.rewindSteps[context.currentStepIndex] : undefined;
  return { ...context, currentStep };
}

interface BrowserRewindHistoryProviderProps {
  children: ReactNode;
}

export function BrowserRewindHistoryProvider({ children }: BrowserRewindHistoryProviderProps) {
  const [rewindSteps, setRewindSteps] = useState<BrowserRewindStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isRewindMode, setIsRewindMode] = useState<boolean>(false);

  // Limit rewind history to 10 items
  const MAX_HISTORY_ITEMS = 10;

  const addRewindStep = (step: BrowserRewindStep) => {
    setRewindSteps((prev) => {
      const newHistory = [...prev, step].slice(-MAX_HISTORY_ITEMS);
      if (!isRewindMode) setCurrentStepIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const rewindToStep = (index: number) => {
    if (index < 0 || index >= rewindSteps.length) return;
    setCurrentStepIndex(index);
    setIsRewindMode(true);
  };

  const resumeLiveMode = () => {
    setCurrentStepIndex(rewindSteps.length - 1);
    setIsRewindMode(false);
  };

  const clearHistory = () => {
    setRewindSteps([]);
    setCurrentStepIndex(-1);
    setIsRewindMode(false);
  };

  return (
    <BrowserRewindHistoryContext.Provider
      value={{
        rewindSteps,
        currentStepIndex,
        isRewindMode,
        addRewindStep,
        rewindToStep,
        resumeLiveMode,
        clearHistory,
      }}
    >
      {children}
    </BrowserRewindHistoryContext.Provider>
  );
}
