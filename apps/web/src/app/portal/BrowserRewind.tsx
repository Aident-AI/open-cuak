import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import { Slider } from '@mui/material';
import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { AiAidenApiMessageAnnotation } from '~src/app/api/ai/aiden/AiAidenApi';
import { useBrowserRewindHistory } from '~src/contexts/BrowserRewindHistoryContext';

export interface BrowserRewindStep {
  timestamp: number;
  screenshot: string;
  action?: string;
  annotation: AiAidenApiMessageAnnotation;
}

interface BrowserRewindProps {
  className?: string;
}

export function BrowserRewind(props: BrowserRewindProps) {
  const { className } = props;
  const { rewindSteps, currentStepIndex, isRewindMode, rewindToStep, resumeLiveMode } = useBrowserRewindHistory();

  const [sliderValue, setSliderValue] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update slider value when currentStepIndex changes
  useEffect(() => {
    if (rewindSteps.length === 0) return;

    // Ensure the slider value aligns with current step index
    setSliderValue(currentStepIndex);
  }, [currentStepIndex, rewindSteps.length]);

  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setSliderValue(value);
  };

  // Handle slider change commit
  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    if (value !== currentStepIndex) {
      rewindToStep(value);
    }
  };

  // Prepare custom marks for the slider
  const marks =
    rewindSteps.length > 0
      ? Array.from({ length: rewindSteps.length }).map((_, index) => ({
          value: index,
          // We'll handle step labels through styling, not through the label property
          label: '',
        }))
      : [];

  // Create a custom style for the last index mark, since we can't use template literals in selectors
  const firstLastMarkStyle = {
    opacity: 0,
  };

  const customMarkStyles: Record<string, React.CSSProperties> = {};
  if (rewindSteps.length > 0) {
    customMarkStyles[`&[data-index="0"]`] = firstLastMarkStyle;
    customMarkStyles[`&[data-index="${rewindSteps.length - 1}"]`] = firstLastMarkStyle;
  }

  // If there are no steps, show a placeholder message
  if (rewindSteps.length === 0) {
    return (
      <div className={cx('relative mt-4 w-full text-center text-sm text-gray-500', className)}>
        No browser steps recorded yet. Steps will appear here as they occur.
      </div>
    );
  }

  // Determine if we're at the last step (live mode)
  const isLastStep = currentStepIndex === rewindSteps.length - 1;

  return (
    <div className={cx('relative mt-4 w-full', className)}>
      {/* Timeline bar */}
      <div ref={timelineRef} className="relative w-full px-6">
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChangeCommitted}
          step={1}
          marks={marks}
          min={0}
          max={rewindSteps.length - 1}
          valueLabelDisplay="off"
          className="text-blue-600"
          sx={{
            '& .MuiSlider-rail': {
              backgroundColor: 'rgb(209, 213, 219)', // gray-300
              height: 8,
              borderRadius: 4,
              opacity: 1,
            },
            '& .MuiSlider-track': {
              backgroundColor: 'rgb(37, 99, 235)', // bg-blue-600
              height: 8,
              borderRadius: 4,
            },
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              backgroundColor: '#fff',
              border: '2px solid',
              borderColor: 'rgb(37, 99, 235)', // bg-blue-600
              '&:focus, &:hover, &.Mui-active': {
                boxShadow: `0 0 0 8px ${isLastStep ? 'rgba(96, 165, 250, 0.16)' : 'rgba(37, 99, 235, 0.16)'}`,
              },
            },
            '& .MuiSlider-markActive': {
              backgroundColor: '#fff',
              width: 4,
              height: 4,
            },
            '& .MuiSlider-mark': {
              backgroundColor: 'rgb(156, 163, 175)', // gray-400
              width: 4,
              height: 4,
              borderRadius: '50%',
              // Hide first and last markers
              '&:first-of-type, &:last-child, &:last-of-type': {
                opacity: 0,
              },
              // Add custom mark styles for specific indices
              ...customMarkStyles,
              // Ensure marks are properly positioned for when we have many steps
              '&:first-of-type': {
                marginLeft: 0,
              },
              '&:last-of-type': {
                marginRight: 0,
              },
            },
            // Add padding to the container to accommodate the markers
            padding: '10px 0',
            width: '100%',
            '& .MuiSlider-valueLabel': {
              backgroundColor: 'rgb(37, 99, 235)', // blue-600
            },
          }}
        />

        {/* Controls */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => rewindToStep(0)}
            className={cx(
              'rounded p-1 text-blue-100',
              currentStepIndex === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
            )}
            disabled={currentStepIndex === 0}
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => currentStepIndex > 0 && rewindToStep(currentStepIndex - 1)}
              className={cx(
                'rounded p-1 text-blue-100',
                currentStepIndex === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
              )}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeftIcon className="h-3 w-3" />
            </button>

            <div className="w-32 text-center text-xs text-blue-100">
              {isRewindMode ? 'Viewing History' : 'Live Mode'}
              {isRewindMode && rewindSteps.length > 0 && ` (${currentStepIndex + 1}/${rewindSteps.length - 1})`}
            </div>

            <button
              onClick={() => currentStepIndex < rewindSteps.length - 1 && rewindToStep(currentStepIndex + 1)}
              className={cx(
                'rounded p-1 text-blue-100',
                currentStepIndex === rewindSteps.length - 1 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
              )}
              disabled={currentStepIndex === rewindSteps.length - 1}
            >
              <ChevronRightIcon className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={resumeLiveMode}
            className={cx('rounded p-1 text-blue-100', isLastStep ? 'cursor-not-allowed' : 'hover:bg-blue-300')}
            disabled={isLastStep}
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
