'use client';

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  NoSymbolIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { createElement } from 'react';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ChatBoxHeaderAction } from '~src/components/chat-box/ChatBoxHeaderAction';
import { useChatgptPage } from '~src/hooks/interactable/useChatgptPage';
import { useExtensionService } from '~src/hooks/useExtensionService';

interface Props {
  closeRedirectUrl?: string;
  leftHeaderAction?: ChatBoxHeaderAction;
  leftHeaderActionCallback?: () => Promise<void> | void;
  rightHeaderAction?: ChatBoxHeaderAction;
  rightHeaderActionCallback?: () => Promise<void> | void;
  title?: string;
}

export function ChatBoxHeader(props: Props) {
  const { sendRuntimeMessage } = useExtensionService();
  const { tabId: chatgptTabId } = useChatgptPage();
  const router = useRouter();

  const onClose = async () => router.replace(props.closeRedirectUrl ?? '/extension/home');
  const onPopup = async () => {
    if (!chatgptTabId) throw new Error('ChatGPT tab is not open');
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.OPEN_POPUP,
      payload: { tabId: chatgptTabId, type: 'popup', height: 1600, width: 300 } as chrome.windows.CreateData,
    });
  };
  const onInterpreterReload = async () => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.INTERPRETER_RELOAD,
    });
    if (!rsp.success) throw new Error(rsp.error);
  };
  const onStopShadowing = async () => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.STOP_SHADOW_MODE,
    });
    if (!rsp.success) throw new Error(rsp.error);
  };

  const getHeaderActionConfig = (action: string) => {
    switch (action) {
      case ChatBoxHeaderAction.POPUP:
        return {
          onClick: onPopup,
          buttonClassName: 'absolute top-3 cursor-pointer',
          icon: ArrowTopRightOnSquareIcon,
          iconClassName: 'h-5 w-5 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.POPUP_AND_REDIRECT:
        return {
          onClick: () => {
            onPopup();
            onClose();
          },
          buttonClassName: 'absolute top-3 cursor-pointer',
          icon: ArrowTopRightOnSquareIcon,
          iconClassName: 'h-5 w-5 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.CLOSE:
        return {
          onClick: onClose,
          buttonClassName: 'absolute top-3 cursor-pointer',
          icon: XMarkIcon,
          iconClassName: 'h-5 w-5 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.RELOAD_INTERPRETER:
        return {
          onClick: onInterpreterReload,
          buttonClassName: 'absolute top-4 cursor-pointer',
          icon: ArrowPathIcon,
          iconClassName: 'h-4 w-4 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.RELOAD_PAGE:
        return {
          onClick: () => window.location.reload(),
          buttonClassName: 'absolute top-4 cursor-pointer',
          icon: ArrowPathIcon,
          iconClassName: 'h-4 w-4 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.STOP_SHADOWING:
        return {
          onClick: onStopShadowing,
          buttonClassName: 'absolute top-4 cursor-pointer',
          icon: NoSymbolIcon,
          iconClassName: 'h-4 w-4 text-blue-300 hover:text-gray-100',
        };
      case ChatBoxHeaderAction.WAIT_FOR_CHAT_COMPLETION:
        return {
          onClick: () => {},
          buttonClassName: 'absolute top-4 cursor-pointer',
          icon: ChatBubbleOvalLeftEllipsisIcon,
          iconClassName: 'h-4 w-4 text-blue-300 animate-pulse',
        };
      default:
        ALogger.error({ context: 'unknown header action', action });
        return null;
    }
  };
  const getHeaderActionButton = (action: string, extraStyles: string, callback?: () => Promise<void> | void) => {
    const config = getHeaderActionConfig(action);
    if (!config) return null;

    const onClick = async () => {
      config.onClick();
      if (callback) callback();
    };
    return (
      <button onClick={onClick} className={cx(config.buttonClassName, extraStyles)}>
        {createElement(config.icon, { className: config.iconClassName })}
      </button>
    );
  };

  const renderLeftHeaderAction = () => {
    if (!props.leftHeaderAction) return null;
    return getHeaderActionButton(props.leftHeaderAction, 'left-3', props.leftHeaderActionCallback);
  };
  const renderRightHeaderAction = () => {
    if (!props.rightHeaderAction) return null;
    return getHeaderActionButton(props.rightHeaderAction, 'right-3', props.rightHeaderActionCallback);
  };

  return (
    <div className="fixed left-0 top-0 z-50 flex h-12 w-full items-center justify-center bg-sky-800/95 shadow-xl shadow-fuchsia-600/50 backdrop-blur-sm">
      {renderLeftHeaderAction()}
      <h1 className="text-white">{props.title ?? 'Aident AI'}</h1>
      {renderRightHeaderAction()}
    </div>
  );
}
