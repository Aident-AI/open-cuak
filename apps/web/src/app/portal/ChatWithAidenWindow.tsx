'use client';

import { ChatBubbleLeftRightIcon, ChevronDownIcon, PencilSquareIcon } from '@heroicons/react/24/solid';
import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER } from '~shared/http/headers';
import { AiAgentSOP } from '~shared/sop/AiAgentSOP';
import { AiAidenApiMessageAnnotation, AiAidenStreamDataSchema } from '~src/app/api/ai/aiden/AiAidenApi';
import { AiMessageChatBoxInput } from '~src/components/chat-box/AiMessageChatBoxInput';
import AiMessagesForChatBox from '~src/components/chat-box/AiMessagesForChatBox';
import { ScrollToBottomButton } from '~src/components/chat-box/ScrollToBottomButton';

interface Props {
  className?: string;
  remoteBrowserSessionId?: string;
  sop?: AiAgentSOP;
  startSop?: boolean;
}

export default function ChatWithAidenWindow(props: Props) {
  const [isChatWithGraphOpen, setIsChatWithGraphOpen] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
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
    body: {
      sopId: props.sop ? props.sop.id : undefined,
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

  useEffect(() => {
    onScroll();
    if (isScrolledToBottom) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (!props.startSop || !props.sop || messages.length > 0) return;
    append({ role: 'user', content: 'Start SOP execution' });
  }, [props.startSop, props.sop]);

  // scroll
  const getScrollableProps = () => {
    const scrollable = scrollableRef.current;
    if (!scrollable) return {};

    const { scrollTop, scrollHeight, clientHeight } = scrollable;
    const scrollableHeight = scrollHeight - clientHeight;
    const isScrollable = scrollableHeight > 0;
    const scrolledToBottom = scrollTop >= scrollableHeight;
    return { scrollable, scrollTop, scrollHeight, clientHeight, scrollableHeight, isScrollable, scrolledToBottom };
  };
  const onScroll = () => {
    const { isScrollable, scrolledToBottom } = getScrollableProps();
    setIsScrolledToBottom(!isScrollable || scrolledToBottom);
  };
  const scrollToBottom = () => {
    const { scrollable, scrollableHeight } = getScrollableProps();
    if (!scrollable) return;
    scrollable.scrollTo({ top: scrollableHeight, behavior: 'smooth' });
  };
  const resetState = () => {
    setMessages([]);
    setData([]);
  };

  if (!isChatWithGraphOpen)
    return (
      <button
        className="absolute bottom-12 right-12 flex h-10 w-10 items-center justify-center overflow-visible rounded-full shadow-centered shadow-blue-600/60 backdrop-blur-md transition-all duration-300 ease-in-out"
        onClick={() => setIsChatWithGraphOpen(true)}
      >
        <ChatBubbleLeftRightIcon className="z-10 h-6 w-6 text-white" />
      </button>
    );

  return (
    <div className={props.className}>
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl shadow-blue-600 backdrop-blur-md">
        <div className="fixed left-0 top-0 z-50 flex h-12 w-full items-center justify-center bg-sky-800/95 shadow-xl shadow-fuchsia-600/50 backdrop-blur-sm">
          <h1 className="text-white">Chat with Aiden</h1>
          <button
            className="absolute left-5 top-4 flex h-5 w-5 items-center justify-center"
            onClick={() => setIsChatWithGraphOpen(false)}
          >
            <ChevronDownIcon className="h-full w-full text-white" />
          </button>
          <button className="absolute right-5 top-4 flex h-5 w-5 items-center justify-center" onClick={resetState}>
            <PencilSquareIcon className="h-full w-full text-white" />
          </button>
        </div>

        <>
          <AiMessagesForChatBox
            annotationMap={annotationMap}
            error={lastError}
            logoSubtitle="Chat with Aiden"
            messages={messages}
            onScroll={onScroll}
            scrollableRef={scrollableRef}
          />
          <ScrollToBottomButton isScrolledToBottom={isScrolledToBottom} scrollToBottom={scrollToBottom} />
          <AiMessageChatBoxInput
            stop={stop}
            formRef={formRef}
            loading={isLoading}
            messages={messages}
            append={append}
          />
        </>
      </div>
    </div>
  );
}
