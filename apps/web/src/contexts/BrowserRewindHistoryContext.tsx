'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { BrowserRewindStep } from '~src/app/portal/BrowserRewind';

interface BrowserRewindHistoryContextType {
  rewindSteps: BrowserRewindStep[];
  currentStepIndex: number;
  isRewindMode: boolean;
  addRewindStep: (step: BrowserRewindStep) => void;
  rewindToStep: (index: number) => void;
  resumeLiveMode: () => void;
  generateMockSteps: () => void;
}

const defaultContext: BrowserRewindHistoryContextType = {
  rewindSteps: [],
  currentStepIndex: -1,
  isRewindMode: false,
  addRewindStep: () => {},
  rewindToStep: () => {},
  resumeLiveMode: () => {},
  generateMockSteps: () => {},
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
  const [mockStepsGenerated, setMockStepsGenerated] = useState<boolean>(false);

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

  // Generate mock rewind steps for demonstration
  const generateMockSteps = () => {
    if (mockStepsGenerated) return; // Only generate once

    // Create exactly 10 mock steps
    const mockSteps: BrowserRewindStep[] = [];
    const baseTimestamp = Date.now() - 10000; // 10 seconds ago

    // A 1x1 pixel transparent PNG for testing
    const transparentPixel =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // A more visible test image (blue square)
    const blueSquare =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAnElEQVR42u3RAQ0AAAjDMO5fNCCDkC5z0HTVrisFCBABASIgQAQEiIAAAQJEQIAICBABASIgQIAAERAgAgJEQIAICBAgQAQEiIAAERAgAgIECBABASIgQAQEiIAAeZHdvqp9Va9qX9W+qn1V+6r2Ve2r2le1r2pf1b6qfVX7qvZV7avaV7Wval/Vvqp9Vfuq9lXtq9pXta9qX9W+qn1VD08qHAP/1bZtAAAAAElFTkSuQmCC';

    // A simple browser-like mock image (white with blue header)
    const browserMock =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJDSURBVHgB7dexDcAwDARBw4X778ymABswJWxOmv5GALfMzAIg7TgHAMGgAwQYdIAAgw4QYNABAgw6QIBBBwgw6AABBh0gwKADBBh0gACDDhBg0AECDDpAgEEHCDDoAAEGHSDAoAMEGHSAAIMOEGDQAQIMOkCAQQcIMOgAAQYdIMCgAwQYdIAAgw4QYNABAgw6QIBBBwgw6AABBh0gwKADBBh0gACDDhBg0AECDDpAgEEHCDDoAAEGHSDAoAMEGHSAAIMOEGDQAQIMOkCAQQcIMOgAAQYdIMCgAwQYdIAAgw4QYNABAgw6QIBBBwgw6AABBh0gwKADBBh0gACDDhBg0AECDDpAgEEHCDDoAAEGHSDAoAMEGHSAAIMOEGDQAQIMOkCAQQcIMOgAAQYdIOADDtMDATpTrPsAAAAASUVORK5CYII=';

    for (let i = 0; i < 10; i++) {
      const stepTimestamp = baseTimestamp + i * 1000; // Spread over 10 seconds

      // Use different mock images for different steps to make it more realistic
      let screenshot;
      if (i < 3) {
        screenshot = browserMock; // First few steps show browser loading
      } else if (i < 7) {
        screenshot = blueSquare; // Middle steps show content loading
      } else {
        screenshot = transparentPixel; // Last steps show completed page
      }

      mockSteps.push({
        timestamp: stepTimestamp,
        screenshot: screenshot,
        action: `Browser action ${i + 1}`,
        annotation: {
          ts: stepTimestamp,
          cursorType: 'default',
          cursorPosition: {
            x: 100 + i * 10,
            y: 100 + i * 5,
          },
          beforeStateBase64: screenshot.split(',')[1], // Remove the data:image/png;base64, prefix
          stateDescription: `Browser navigation step ${i + 1}`,
        },
      });
    }

    setRewindSteps(mockSteps);
    setCurrentStepIndex(mockSteps.length - 1); // Start at the latest step (live mode)
    setIsRewindMode(false); // Start in live mode
    setMockStepsGenerated(true);
  };

  // Generate mock steps automatically when the component mounts
  useEffect(() => {
    // Add a small delay to simulate loading
    const timer = setTimeout(() => {
      generateMockSteps();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRewindHistoryContext.Provider
      value={{
        rewindSteps,
        currentStepIndex,
        isRewindMode,
        addRewindStep,
        rewindToStep,
        resumeLiveMode,
        generateMockSteps,
      }}
    >
      {children}
    </BrowserRewindHistoryContext.Provider>
  );
}
