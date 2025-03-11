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

  const isLiveMode = !isRewindMode;

  // Update slider value when currentStepIndex changes
  useEffect(() => {
    if (rewindSteps.length === 0) return;
    if (isLiveMode) setSliderValue(rewindSteps.length);
    else setSliderValue(currentStepIndex);
  }, [currentStepIndex, rewindSteps.length, isLiveMode]);

  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;

    // For empty steps, make sure the slider can't go to position 0
    if (rewindSteps.length === 0 && value === 0) {
      setSliderValue(1);
      return;
    }

    setSliderValue(value);
  };

  // Handle slider change commit
  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;

    if (rewindSteps.length === 0) {
      // For empty steps, position 1 is live mode, position 0 is no mode (but shouldn't be selectable)
      if (value === 1) resumeLiveMode();
      return;
    }

    // Normal case with steps
    if (value === rewindSteps.length) resumeLiveMode();
    else if (value !== currentStepIndex || isLiveMode) rewindToStep(value);
  };

  const marks =
    rewindSteps.length > 0
      ? Array.from({ length: rewindSteps.length + 1 }).map((_, index) => ({ value: index, label: '' }))
      : [
          { value: 0, label: '' },
          { value: 1, label: '' },
        ];
  const firstMarkStyle = { opacity: 0 };
  const customMarkStyles: Record<string, React.CSSProperties> = {};
  if (rewindSteps.length > 0) customMarkStyles[`&[data-index="0"]`] = firstMarkStyle;

  return (
    <div className={cx('relative mt-4 w-full', className)}>
      {/* Timeline bar */}
      <div ref={timelineRef} className="relative w-full px-6">
        <Slider
          value={isLiveMode ? (rewindSteps.length > 0 ? rewindSteps.length : 1) : sliderValue}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChangeCommitted}
          step={1}
          marks={marks}
          min={0}
          max={rewindSteps.length > 0 ? rewindSteps.length : 1}
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
                boxShadow: `0 0 0 8px ${isLiveMode ? 'rgba(96, 165, 250, 0.16)' : 'rgba(37, 99, 235, 0.16)'}`,
              },
            },
            '& .MuiSlider-markActive': {
              backgroundColor: '#fff',
              width: 4,
              height: 4,
            },
            '& .MuiSlider-mark': {
              backgroundColor: rewindSteps.length === 0 ? 'transparent' : 'rgb(156, 163, 175)', // gray-400
              width: 4,
              height: 4,
              borderRadius: '50%',
              // Custom mark styles for specific indices
              ...customMarkStyles,
              // Ensure marks are properly positioned
              '&:first-of-type': {
                opacity: 0,
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
              currentStepIndex === 0 || rewindSteps.length === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
            )}
            disabled={currentStepIndex === 0 || rewindSteps.length === 0}
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isLiveMode) rewindToStep(rewindSteps.length - 1);
                else if (currentStepIndex > 0) rewindToStep(currentStepIndex - 1);
              }}
              className={cx(
                'rounded p-1 text-blue-100',
                (currentStepIndex === 0 && !isLiveMode) || rewindSteps.length === 0
                  ? 'cursor-not-allowed'
                  : 'hover:bg-blue-300',
              )}
              disabled={(currentStepIndex === 0 && !isLiveMode) || rewindSteps.length === 0}
            >
              <ChevronLeftIcon className="h-3 w-3" />
            </button>

            <div className="w-32 text-center text-xs text-blue-100">
              {isRewindMode && rewindSteps.length > 0 ? 'Step' : 'Live Mode'}
              {isRewindMode && rewindSteps.length > 0 && ` ${currentStepIndex + 1}/${rewindSteps.length}`}
            </div>

            <button
              onClick={() => {
                if (isLiveMode) return;
                else if (currentStepIndex === rewindSteps.length - 1) resumeLiveMode();
                else rewindToStep(currentStepIndex + 1);
              }}
              className={cx(
                'rounded p-1 text-blue-100',
                isLiveMode || rewindSteps.length === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
              )}
              disabled={isLiveMode || rewindSteps.length === 0}
            >
              <ChevronRightIcon className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={resumeLiveMode}
            className={cx(
              'rounded p-1 text-blue-100',
              isLiveMode || rewindSteps.length === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
            )}
            disabled={isLiveMode || rewindSteps.length === 0}
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
