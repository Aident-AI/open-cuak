'use client';

import { ChevronLeftIcon, PencilSquareIcon, PlayCircleIcon, StopCircleIcon } from '@heroicons/react/24/solid';
import { Message, ToolInvocation, convertToCoreMessages } from 'ai';
import { round } from 'lodash';
import { useContext, useEffect, useRef, useState } from 'react';
import { v4 as UUID } from 'uuid';
import { getHost } from '~shared/env/environment';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER } from '~shared/http/headers';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { MouseClick_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseClick.ActionConfig';
import { MouseWheel_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseWheel.ActionConfig';
import { PortalMouseControl_ActionConfig } from '~shared/messaging/action-configs/portal-actions/PortalMouseControl.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ShadowModeWorkflowEnvironment } from '~shared/shadow-mode/ShadowModeWorkflowEnvironment';
import { WaitUtils } from '~shared/utils/WaitUtils';
import { AiAidenApiMessageAnnotation } from '~src/app/api/ai/aiden/AiAidenApi';
import { AiMessageTeachModeInput } from '~src/components/chat-box/AiMessageTeachModeInput';
import AiMessagesForChatBox from '~src/components/chat-box/AiMessagesForChatBox';
import { ScrollToBottomButton } from '~src/components/chat-box/ScrollToBottomButton';
import { InteractionEventContext } from '~src/contexts/InteractionEventContext';
import { useRemoteBrowserMessaging } from '~src/hooks/useRemoteBrowserMessaging';

interface Props {
  className?: string;
  remoteBrowserSessionId?: string;
}

type ProcessedEventBase = { type: 'move' | 'click' | 'scroll' | 'key'; ts: number };
type Position = { x: number; y: number };

type MouseMoveEvent = ProcessedEventBase & { type: 'move'; from: Position; to: Position };
type MouseClickEvent = ProcessedEventBase & { type: 'click'; position: Position };
type MouseScrollEvent = ProcessedEventBase & { type: 'scroll'; distance: { deltaX: number; deltaY: number } };
type KeyboardEvent = ProcessedEventBase & { type: 'key'; key: string };

const REFRESH_INTERVAL_IN_MS = 350;
const REVERSE_SHADOW_STEP_DELAY = 350;

enum AidenState {
  IDLE = 'idle',
  SHADOWING = 'shadowing',
  REVERSE_SHADOWING = 'reverse-shadowing',
  REVIEWED = 'reviewed',
}

export default function TeachAidenWindow(props: Props) {
  const { events: interactionEvents, clearEvents } = useContext(InteractionEventContext);
  const { sendRuntimeMessage } = useRemoteBrowserMessaging({ remoteBrowserSessionId: props.remoteBrowserSessionId });

  const formRef = useRef<HTMLFormElement>(null);
  const isProcessingEventRef = useRef(false);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const startPointEnvironmentRef = useRef<Partial<ShadowModeWorkflowEnvironment>>({});
  const messageCacheRef = useRef<Message[]>([]);

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [aidenState, setAidenState] = useState<AidenState>(AidenState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [annotationMap, setAnnotationMap] = useState<Record<string, AiAidenApiMessageAnnotation>>({});

  useEffect(() => {
    onScroll();
    if (isScrolledToBottom) scrollToBottom();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (aidenState !== AidenState.SHADOWING) return;
    if (isProcessingEventRef.current) return;
    isProcessingEventRef.current = true;

    const exec = async () => {
      // prepare tool invocations
      const mouseMoveEvents = [] as MouseMoveEvent[];
      const mouseClickEvents = [] as MouseClickEvent[];
      const mouseScrollEvents = [] as MouseScrollEvent[];
      const keyboardEvents = [] as KeyboardEvent[];
      interactionEvents.forEach((e) => {
        switch (e.type) {
          case 'mouse': {
            const mouseAction = e.data.position.event;
            const ts = e.data.position.ts;
            const position = { x: e.data.position.x, y: e.data.position.y };

            // handle mousemove events
            if (mouseMoveEvents.length < 1) mouseMoveEvents.push({ type: 'move', ts, from: position, to: position });
            else {
              const lastMouseMoveEvent = mouseMoveEvents[mouseMoveEvents.length - 1];
              lastMouseMoveEvent.to = position;
              if (ts - lastMouseMoveEvent.ts >= REFRESH_INTERVAL_IN_MS)
                // new mousemove event
                mouseMoveEvents.push({ type: 'move', ts, from: position, to: position });
            }

            if (mouseAction === 'mousemove') {
              // do nothing - already handled
            } else if (mouseAction === 'mousedown') {
              mouseClickEvents.push({ type: 'click', ts, position });
            } else if (mouseAction === 'mouseup') {
              // do nothing - ignore mouseup events for now
              // TODO: implement mouseup events
            } else throw new Error(`Unknown mouse action: ${mouseAction}`);
            break;
          }
          case 'wheel': {
            const distance = { deltaX: e.data.deltaX, deltaY: e.data.deltaY };
            mouseScrollEvents.push({ type: 'scroll', ts: e.ts, distance });
            break;
          }
          case 'keyboard':
            if (e.data.event === 'keydown') keyboardEvents.push({ type: 'key', ts: e.ts, key: e.data.key });
            else if (e.data.event === 'keyup') {
              // do nothing - ignore keyup events for now
              // TODO: implement keyup events
            } else throw new Error(`Unknown keyboard event: ${e.data.event}`);
            break;
        }
      });

      // execute tool invocations
      const processedEvents = [...mouseMoveEvents, ...mouseClickEvents, ...mouseScrollEvents, ...keyboardEvents];
      processedEvents.sort((a, b) => a.ts - b.ts);
      const toolCallMessages = processedEvents
        .map((e) => {
          const createMessage = (ti: ToolInvocation) =>
            ({
              id: UUID(),
              role: 'assistant',
              toolInvocations: [ti],
              content: '',
              createdAt: new Date(e.ts),
            }) as Message;
          switch (e.type) {
            case 'move': {
              const tool = PortalMouseControl_ActionConfig;
              const toolName = tool.action.replace(':', '-');
              const params = { deltaX: round(e.to.x - e.from.x, 1), deltaY: round(e.to.y - e.from.y, 1) };
              if (params.deltaX === 0 && params.deltaY === 0) return null;
              const args = tool.requestPayloadSchema.parse(params);
              const result = JSON.stringify(tool.responsePayloadSchema.parse({ status: 'moved' }));
              return createMessage({ state: 'result', toolCallId: UUID(), toolName, args, result } as ToolInvocation);
            }
            case 'click': {
              const tool = MouseClick_ActionConfig;
              const toolName = tool.action.replace(':', '-');
              const args = tool.requestPayloadSchema.parse({ button: 'left' });
              const result = JSON.stringify(tool.responsePayloadSchema.parse({ status: 'clicked' }));
              return createMessage({ state: 'result', toolCallId: UUID(), toolName, args, result } as ToolInvocation);
            }
            // TODO: add the support of mouse-drag actions
            case 'scroll': {
              const tool = MouseWheel_ActionConfig;
              const toolName = tool.action.replace(':', '-');
              const args = tool.requestPayloadSchema.parse(e.distance);
              const result = JSON.stringify(tool.responsePayloadSchema.parse({ status: 'scrolled' }));
              return createMessage({ state: 'result', toolCallId: UUID(), toolName, args, result } as ToolInvocation);
            }
            case 'key':
              // TODO: add tool call for keyboard events
              return null;
          }
        })
        .filter((m) => m !== null) as Message[];
      setMessages((prev) => [prev[0], ...toolCallMessages]);

      isProcessingEventRef.current = false;
    };
    exec();

    return () => {
      if (isProcessingEventRef.current) isProcessingEventRef.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aidenState, interactionEvents]);

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

  // actions
  const scrollToBottom = () => {
    const { scrollable, scrollableHeight } = getScrollableProps();
    if (!scrollable) return;
    scrollable.scrollTo({ top: scrollableHeight, behavior: 'smooth' });
  };
  const resetMessages = () => {
    setAidenState(AidenState.IDLE);
    setMessages([]);
  };
  const startReverseShadow = async () => {
    if (!props.remoteBrowserSessionId) throw new Error('No remote browser session id found');

    messageCacheRef.current = messages;
    const [firstMessage, ...executionMessages] = messages.map((m) => ({ ...m, annotations: undefined }));
    const hasActions = executionMessages.some((m) => m.role === 'assistant' && (m.toolInvocations?.length ?? 0) > 0);
    const { startPosition } = startPointEnvironmentRef.current;

    if (hasActions) {
      if (!startPosition) throw new Error('No start position found');
      // setup the start position
      await sendRuntimeMessage({
        receiver: RuntimeMessageReceiver.SERVICE_WORKER,
        action: ServiceWorkerMessageAction.MOUSE_MOVE,
        payload: { x: startPosition.x, y: startPosition.y },
      });
    }

    // execute step by step
    setAidenState(AidenState.REVERSE_SHADOWING);
    setMessages([firstMessage]); // keep the first message
    const stepMessages = [firstMessage];
    const stepAnnotations = [] as AiAidenApiMessageAnnotation[];
    for (const msg of executionMessages) {
      // wait for a second to mimic ai response
      await WaitUtils.wait(REVERSE_SHADOW_STEP_DELAY);

      if (msg.role !== 'assistant') {
        setMessages((prev) => [...prev, { ...msg, id: msg.id ?? UUID() } as Message]);
        continue;
      }

      // append the running message
      setMessages((prev) => [...prev, msg]);
      stepMessages.push(msg);
      const stepCoreMessages = convertToCoreMessages(stepMessages);
      if (msg.toolInvocations && msg.toolInvocations.length > 1)
        throw new Error('Multiple tool invocations not supported yet.');

      // execute tool invocation
      const ti = !msg.toolInvocations ? undefined : msg.toolInvocations[0];
      const url = getHost() + '/api/portal/replay-assistant-message';
      const rsp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [X_REMOTE_BROWSER_SESSION_ID_HEADER]: props.remoteBrowserSessionId!,
        },
        body: JSON.stringify({
          ts: msg.createdAt?.getTime() ?? Date.now(),
          toolInvocation: ti,
          stepMessages: stepCoreMessages,
        }),
      });
      if (!rsp.ok) throw new Error('Failed to execute tool invocation');
      const json = await rsp.json();
      if (!json.success) throw new Error('Failed to execute tool invocation');

      // append message annotations
      stepAnnotations.push(json.annotation);
      if (!msg.id) throw new Error('Message ID not found');
      setAnnotationMap((prev) => ({ ...prev, [msg.id]: json.annotation }));
    }

    // wait for a second to mimic ai response
    await WaitUtils.wait(REVERSE_SHADOW_STEP_DELAY);
    setAidenState(AidenState.REVIEWED);
  };
  const saveMessages = async () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') {
      window.alert('The last message must be a response from the assistant.');
      return;
    }
    if ((lastMessage.toolInvocations ?? []).length > 0 || lastMessage.content.trim().length < 1) {
      window.alert('You must have a response from the assistant as the last message for the workflow.');
      return;
    }

    const rsp = await fetch(getHost() + '/api/portal/save-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [X_REMOTE_BROWSER_SESSION_ID_HEADER]: props.remoteBrowserSessionId!,
      },
      body: JSON.stringify({ messages, ...startPointEnvironmentRef.current, annotationMap }),
    });
    if (!rsp.ok) throw new Error('Failed to call endpoint for saving the workflow.');
    const json = await rsp.json();
    if (!json.success) throw new Error('Failed to save the workflow.');

    resetMessages();
  };
  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setAidenState(AidenState.IDLE);
  };
  const appendMessage = (m: Message) => {
    setMessages((prev) => [...prev, { ...m, id: m.id ?? UUID() }]);
    setAidenState(AidenState.IDLE);
  };

  const shouldShowConfirmationBar =
    aidenState === AidenState.REVIEWED || (messages.length > 1 && aidenState === AidenState.IDLE);
  const title =
    aidenState === AidenState.IDLE
      ? 'Teach Aiden'
      : aidenState === AidenState.SHADOWING
        ? 'Aiden shadowing...'
        : 'Reverse shadowing...';

  const renderLeftNavButton = () => {
    const buttonOnClick = async () => {
      // fetch environment data for the workflow
      if (aidenState === AidenState.IDLE) {
        clearEvents(); // reset events

        const fetchStartPosition = async () => {
          const rsp = await fetch(getHost() + '/api/portal/fetch-start-point', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [X_REMOTE_BROWSER_SESSION_ID_HEADER]: props.remoteBrowserSessionId!,
            },
            body: JSON.stringify({}),
          });
          if (!rsp.ok) throw new Error('Failed to fetch cursor position');
          const json = await rsp.json();
          const { position, url } = json;

          startPointEnvironmentRef.current = {
            startPosition: {
              ...position,
              x: round(position.x, 2),
              y: round(position.y, 2),
            },
            startUrl: url,
          };
        };

        // non-blocking fetches
        void fetchStartPosition();
      }

      if (aidenState === AidenState.REVIEWED) {
        setMessages(messageCacheRef.current);
        messageCacheRef.current = [];
      }

      // update the state
      const switchAidenState = (prev: AidenState) => {
        switch (prev) {
          case AidenState.IDLE:
            return AidenState.SHADOWING;
          case AidenState.SHADOWING:
            return AidenState.IDLE;
          case AidenState.REVERSE_SHADOWING:
            return AidenState.IDLE;
          case AidenState.REVIEWED:
            return AidenState.IDLE;
        }
      };
      setAidenState((prev) => switchAidenState(prev));
    };
    const buttonStyle = 'h-full w-full text-white';
    const renderButton = () => {
      switch (aidenState) {
        case AidenState.IDLE:
          return <PlayCircleIcon className={buttonStyle} />;
        case AidenState.SHADOWING:
        case AidenState.REVERSE_SHADOWING:
          return <StopCircleIcon className={buttonStyle} />;
        case AidenState.REVIEWED:
          return <ChevronLeftIcon className={buttonStyle} />;
      }
    };

    return (
      <button
        className="absolute left-5 top-4 flex h-5 w-5 items-center justify-center disabled:opacity-50"
        onClick={buttonOnClick}
        disabled={messages.length < 1}
      >
        {renderButton()}
      </button>
    );
  };
  const renderConfirmationBar = () => {
    if (!shouldShowConfirmationBar) return null;
    if (aidenState !== AidenState.REVIEWED)
      return (
        <div className="absolute left-0 top-12 flex h-10 w-full items-center justify-evenly bg-sky-800/50">
          <button onClick={startReverseShadow}>Start Reverse Shadow</button>
        </div>
      );

    return (
      <div className="absolute left-0 top-12 flex h-10 w-full items-center justify-evenly bg-sky-800/50">
        <button onClick={startReverseShadow}>Replay</button>
        <button onClick={saveMessages}>Save</button>
      </div>
    );
  };

  return (
    <div className={props.className}>
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl shadow-blue-600 backdrop-blur-md">
        <div className="fixed left-0 top-0 z-50 flex h-12 w-full items-center justify-center bg-sky-800/95 shadow-xl shadow-fuchsia-600/50 backdrop-blur-sm">
          <h1 className="text-white">{title}</h1>
          {renderLeftNavButton()}
          <button className="absolute right-5 top-4 flex h-5 w-5 items-center justify-center" onClick={resetMessages}>
            <PencilSquareIcon className="h-full w-full text-white" />
          </button>
        </div>

        {renderConfirmationBar()}

        <>
          <AiMessagesForChatBox
            annotationMap={annotationMap}
            className={shouldShowConfirmationBar ? 'pt-24' : 'pt-14'}
            deleteMessage={deleteMessage}
            logoSubtitle={title}
            messages={messages}
            onScroll={onScroll}
            scrollableRef={scrollableRef}
            teachMode
          />
          <ScrollToBottomButton isScrolledToBottom={isScrolledToBottom} scrollToBottom={scrollToBottom} />
          <AiMessageTeachModeInput formRef={formRef} messages={messages} append={appendMessage} />
        </>
      </div>
    </div>
  );
}
