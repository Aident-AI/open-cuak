import {
  ArrowPathIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
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

const REPLAY_STEP_DURATION = 1_000; // ms

export function BrowserRewind(props: BrowserRewindProps) {
  const { className } = props;
  const { rewindSteps, currentStepIndex, isRewindMode, rewindToStep, resumeLiveMode } = useBrowserRewindHistory();
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasReachedEnd, setHasReachedEnd] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLiveMode = !isRewindMode;

  // Update slider value when currentStepIndex changes
  useEffect(() => {
    if (rewindSteps.length === 0) return;
    if (isLiveMode) setSliderValue(rewindSteps.length);
    else setSliderValue(currentStepIndex);
  }, [currentStepIndex, rewindSteps.length, isLiveMode]);

  // Reset hasReachedEnd when currentStepIndex changes
  useEffect(() => {
    if (currentStepIndex < rewindSteps.length - 1) {
      setHasReachedEnd(false);
    }
  }, [currentStepIndex, rewindSteps.length]);

  // Handle auto-play functionality
  useEffect(() => {
    if (isPlaying && rewindSteps.length > 0) {
      // Clear any existing interval
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }

      // Set up new interval to advance steps
      playIntervalRef.current = setInterval(() => {
        if (isLiveMode || currentStepIndex === rewindSteps.length - 1) {
          // Stop playing when we reach the end
          setIsPlaying(false);
          setHasReachedEnd(true);
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current);
            playIntervalRef.current = null;
          }
        } else {
          rewindToStep(currentStepIndex + 1);
        }
      }, REPLAY_STEP_DURATION);
    }

    // Cleanup interval on component unmount or when play state changes
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentStepIndex, rewindSteps.length, isLiveMode, rewindToStep]);

  // Stop playing if we switch to live mode
  useEffect(() => {
    if (isLiveMode && isPlaying) {
      setIsPlaying(false);
    }
    if (isLiveMode) {
      setHasReachedEnd(false);
    }
  }, [isLiveMode, isPlaying]);

  const togglePlayPause = () => {
    if (rewindSteps.length === 0) return;

    if (hasReachedEnd || currentStepIndex === rewindSteps.length - 1) {
      // If we've reached the end or are at the last step, restart from beginning
      setHasReachedEnd(false);
      rewindToStep(0);
      setIsPlaying(true);
    } else if (isLiveMode && !isPlaying) {
      // If in live mode and starting to play, first rewind to beginning
      rewindToStep(0);
      setIsPlaying(true);
    } else {
      // Regular play/pause toggle
      setIsPlaying(!isPlaying);
    }
  };

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

  // Determine which icon to show
  const getButtonIcon = () => {
    if (isPlaying) {
      return <PauseIcon className="h-4 w-4" />;
    } else if (!isLiveMode && (hasReachedEnd || currentStepIndex === rewindSteps.length - 1)) {
      return <ArrowPathIcon className="h-4 w-4" />;
    } else {
      return <PlayIcon className="h-4 w-4" />;
    }
  };

  // Determine button title
  const getButtonTitle = () => {
    if (isPlaying) {
      return 'Pause';
    } else if (!isLiveMode && (hasReachedEnd || currentStepIndex === rewindSteps.length - 1)) {
      return 'Replay';
    } else {
      return 'Play';
    }
  };

  return (
    <div className={cx('relative mt-4 w-full', className)}>
      {/* Timeline title and play/pause button */}
      <div className="mb-2 flex items-center justify-between px-6">
        <div className="flex items-center text-xs text-blue-100">
          {isLiveMode && (
            <div className="relative mr-1.5 flex items-center">
              <div className="absolute h-2 w-2 rounded-full bg-green-500 opacity-75">
                <div
                  className="absolute h-2 w-2 rounded-full bg-green-500"
                  style={{
                    animation: 'breathing 1.5s ease-in-out infinite',
                  }}
                />
              </div>
              <style jsx>{`
                @keyframes breathing {
                  0% {
                    transform: scale(0.8);
                    opacity: 0.5;
                  }
                  50% {
                    transform: scale(1.2);
                    opacity: 0.8;
                  }
                  100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                  }
                }
              `}</style>
              <div className="h-2 w-2 opacity-0">•</div>
            </div>
          )}
          {isRewindMode && rewindSteps.length > 0 ? 'Step' : 'Live Mode'}
          {isRewindMode && rewindSteps.length > 0 && ` ${currentStepIndex + 1}/${rewindSteps.length}`}
        </div>
        <button
          onClick={togglePlayPause}
          className={cx(
            'rounded p-1 text-blue-100',
            rewindSteps.length === 0 ? 'cursor-not-allowed' : 'hover:bg-blue-300',
          )}
          disabled={rewindSteps.length === 0}
          title={getButtonTitle()}
        >
          {getButtonIcon()}
        </button>
      </div>

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
                (currentStepIndex === 0 && !isRewindMode) || rewindSteps.length === 0
                  ? 'cursor-not-allowed'
                  : 'hover:bg-blue-300',
              )}
              disabled={(currentStepIndex === 0 && !isRewindMode) || rewindSteps.length === 0}
            >
              <ChevronLeftIcon className="h-3 w-3" />
            </button>

            <div className="w-32 text-center text-xs text-blue-100">
              {isPlaying ? 'Playing' : hasReachedEnd ? 'End Reached' : 'Paused'}
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
