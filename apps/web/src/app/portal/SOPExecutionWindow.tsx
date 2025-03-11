'use client';

import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid';
import { Alert, Snackbar } from '@mui/material';
import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';
import { AiAgentSOP } from '~shared/sop/AiAgentSOP';
import { AiAidenApiMessageAnnotation, AiAidenStreamDataSchema } from '~src/app/api/ai/aiden/AiAidenApi';
import { AiMessageChatBoxInput } from '~src/components/chat-box/AiMessageChatBoxInput';
import AiMessagesForChatBox from '~src/components/chat-box/AiMessagesForChatBox';
import { ScrollToBottomButton } from '~src/components/chat-box/ScrollToBottomButton';

interface Props {
  className?: string;
  remoteBrowserSessionId?: string;
  sop: AiAgentSOP;
  shouldStartSop?: boolean;
}

export default function SOPExecutionWindow(props: Props) {
  const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: '' });
  const [isChatWithAidenOpen, setChatWithAidenOpen] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const aiSdkApi = '/api/ai/aiden';
  const {
    messages,
    setMessages,
    isLoading,
    append,
    stop,
    data: rawData,
    setData,
  } = useChat({
    api: aiSdkApi,
    headers: props.remoteBrowserSessionId
      ? { [X_REMOTE_BROWSER_SESSION_ID_HEADER]: props.remoteBrowserSessionId }
      : undefined,
    body: { sopId: props.sop.id },
    onError: (err) => {
      let errorMessage = err.message;
      ALogger.warn({ context: 'Chat error received', error: errorMessage });
      if (errorMessage) setErrorSnackbar({ open: true, message: errorMessage });
    },
  });
  const data = rawData?.map((d) => AiAidenStreamDataSchema.parse(d)) ?? [];
  const stateInfos = data.filter((d) => d.type === 'state-info');
  const annotationMap = stateInfos.reduce(
    (acc, stateInfo, i) => {
      const messageId = messages.filter((m) => m.role === 'assistant')[i]?.id;
      if (messageId) acc[messageId] = stateInfo.annotation;
      return acc;
    },
    {} as Record<string, AiAidenApiMessageAnnotation>,
  );
  const errors = data.filter((d) => d.type === 'error');
  const lastErrorElement = errors.length > 0 ? errors[errors.length - 1] : undefined;
  const lastError = lastErrorElement ? new Error(lastErrorElement?.error) : undefined;

  // Extract progress information from the data stream
  const progressUpdates = data.filter((d) => d.type === 'sop-progress');
  const latestProgress = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1] : null;

  useEffect(() => {
    if (messages.length && !userHasScrolled) {
      scrollToBottom();
    }
  }, [messages, userHasScrolled]);

  useEffect(() => {
    if (!props.shouldStartSop || messages.length > 0) return;
    append({ role: 'user', content: 'Start SOP execution' });
  }, [props.shouldStartSop, props.sop]);

  useEffect(() => {
    if (latestProgress && scrollableRef.current) {
      scrollToBottom();
    }
  }, [latestProgress]);

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current || {};
    if (!scrollTop || !scrollHeight || !clientHeight) return;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    if (!isAtBottom) {
      setUserHasScrolled(true);
    } else {
      setUserHasScrolled(false);
    }
  };

  const scrollToBottom = () => {
    if (!scrollableRef.current) return;
    scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
  };

  const resetState = () => {
    setMessages([]);
    setData([]);
  };

  const handleCloseErrorSnackbar = () => {
    setErrorSnackbar({ ...errorSnackbar, open: false });
  };

  if (!isChatWithAidenOpen)
    return (
      <button
        className="absolute bottom-12 right-12 flex h-10 w-10 items-center justify-center overflow-visible rounded-full shadow-centered shadow-blue-600/60 backdrop-blur-md transition-all duration-300 ease-in-out"
        onClick={() => setChatWithAidenOpen(true)}
      >
        <ChatBubbleLeftRightIcon className="z-10 h-6 w-6 text-white" />
      </button>
    );

  return (
    <div className={props.className}>
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl shadow-blue-600 backdrop-blur-md">
        <div className="fixed left-0 top-0 z-50 flex h-12 w-full items-center justify-center bg-sky-800/95 shadow-xl shadow-fuchsia-600/50 backdrop-blur-sm">
          <h1 className="text-white">Aiden SOP executor</h1>
          <button
            className="absolute left-5 top-4 flex h-5 w-5 items-center justify-center"
            onClick={() => setChatWithAidenOpen(false)}
          >
            <ChevronDownIcon className="h-full w-full text-white" />
          </button>
          <button className="absolute right-5 top-4 flex h-5 w-5 items-center justify-center" onClick={resetState}>
            <PencilSquareIcon className="h-full w-full text-white" />
          </button>
        </div>

        {props.sop && latestProgress !== null && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold">{props.sop.name || 'SOP Execution'}</h3>
            {latestProgress && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Step {Math.min(latestProgress.currentStepIndex + 1, props.sop.steps.length)} of{' '}
                    {props.sop.steps.length}
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    {Math.min(Math.round((latestProgress.currentStepIndex / props.sop.steps.length) * 100), 100)}%
                  </span>
                </div>

                <div className="mb-4 h-2.5 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2.5 rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min((latestProgress.currentStepIndex / props.sop.steps.length) * 100, 100)}%`,
                    }}
                  ></div>
                </div>

                <div className="mt-4 max-h-32 overflow-y-auto">
                  <ul className="space-y-2">
                    {props.sop.steps.map((step, index) => (
                      <li key={step.id} className="flex items-center">
                        {index < latestProgress.currentStepIndex ? (
                          <CheckCircleIcon className="mr-2 h-5 w-5 text-green-500" />
                        ) : index === latestProgress.currentStepIndex ? (
                          <ClockIcon className="mr-2 h-5 w-5 animate-pulse text-blue-500" />
                        ) : (
                          <div className="mr-2 h-5 w-5 rounded-full border border-gray-300"></div>
                        )}
                        <span
                          className={`block truncate text-sm ${index === latestProgress.currentStepIndex ? 'font-medium text-blue-600' : 'text-gray-700'}`}
                          title={step.action}
                        >
                          {step.action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        <>
          <AiMessagesForChatBox
            annotationMap={annotationMap}
            error={lastError}
            logoSubtitle="SOP execution"
            messages={messages}
            onScroll={handleScroll}
            scrollableRef={scrollableRef}
          />
          {userHasScrolled && (
            <ScrollToBottomButton
              scrollToBottom={() => {
                scrollToBottom();
                setUserHasScrolled(false);
              }}
            />
          )}
          <AiMessageChatBoxInput
            stop={stop}
            formRef={formRef}
            loading={isLoading}
            messages={messages}
            append={append}
          />
        </>
      </div>

      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={5_000}
        onClose={handleCloseErrorSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseErrorSnackbar} severity="warning" variant="filled" sx={{ width: '100%' }}>
          {errorSnackbar.message.length > 200 ? `${errorSnackbar.message.substring(0, 200)}...` : errorSnackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
