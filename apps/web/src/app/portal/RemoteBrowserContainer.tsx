'use client';

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CursorArrowRaysIcon,
  PowerIcon,
  SignalSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { Tooltip } from '@mui/material';
import cx from 'classnames';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { LiveAudioVisualizer } from 'react-audio-visualize';
import { Socket } from 'socket.io-client';
import { WHSize } from '~shared/cursor/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { PageNavigationAction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage } from '~shared/messaging/types';
import { RemoteBrowserTab } from '~shared/portal/RemoteBrowserTypes';
import { BrowserRewind } from '~src/app/portal/BrowserRewind';
import { RemoteBrowserWindowStatus } from '~src/app/portal/WebsocketRemoteBrowserWindow';
import { useBrowserRewindHistory } from '~src/contexts/BrowserRewindHistoryContext';
import { useRemoteBrowserMessaging } from '~src/hooks/useRemoteBrowserMessaging';

interface Props {
  browserSocket: Socket | null;
  browserStatus: RemoteBrowserWindowStatus;
  children: React.ReactNode;
  mediaRecorder: MediaRecorder | null;
  remoteControlOn: boolean;

  attachToBrowser: () => void;
  detachFromBrowser: () => void;
  killBrowser: () => void;
  setRemoteControlOn: (remoteControlOn: boolean) => void;

  classNameContainer?: string;
  classNameContent?: string;
  sessionUUID?: string;

  onActiveTabChange?: (activeTabId?: number) => void;
  onContentSizeChange?: (contentSize: { width: number; height: number }) => void;
}

const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_CONTENT_PERCENTAGE = 0.8;
const PAGE_LOADING_THRESHOLD = 1000;
const RESETTING_PAGE_LOADING = 1000;

export default function RemoteBrowserContainer(props: Props) {
  const { sendRuntimeMessage } = useRemoteBrowserMessaging({ remoteBrowserSessionId: props.sessionUUID });
  const { isRewindMode, resumeLiveMode, clearHistory } = useBrowserRewindHistory();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentSizeRef = useRef<WHSize>({ width: -1, height: -1 });
  const lastKeyDownRef = useRef<number>(0);

  const [containerDimension, setContainerDimension] = useState<WHSize>({ width: -1, height: -1 });
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageUrlToLoad, setPageUrlToLoad] = useState<string | undefined>(undefined);
  const [tabs, setTabs] = useState<RemoteBrowserTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState<number | undefined>(undefined);
  const setActiveTabId = (tabId?: number) => {
    setActiveTabIdState(tabId);
    if (props.onActiveTabChange) props.onActiveTabChange(tabId);
  };

  const isTooWide = containerDimension.width / containerDimension.height > DEFAULT_ASPECT_RATIO;
  const contentDimension = {
    width: isTooWide
      ? containerDimension.height * DEFAULT_CONTENT_PERCENTAGE * DEFAULT_ASPECT_RATIO
      : containerDimension.width * DEFAULT_CONTENT_PERCENTAGE,
    height: isTooWide
      ? containerDimension.height * DEFAULT_CONTENT_PERCENTAGE
      : (containerDimension.width * DEFAULT_CONTENT_PERCENTAGE) / DEFAULT_ASPECT_RATIO,
  };

  useEffect(() => {
    if (!props.onContentSizeChange) return;
    if (
      contentSizeRef.current.width !== -1 &&
      contentSizeRef.current.height !== -1 &&
      contentSizeRef.current.width === contentDimension.width &&
      contentSizeRef.current.height === contentDimension.height
    )
      return;

    props.onContentSizeChange(contentDimension);
    contentSizeRef.current = contentDimension;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerDimension, props.onContentSizeChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect) return;
      setContainerDimension({ width: rect.width, height: rect.height });
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (!props.browserSocket) return;
    props.browserSocket.on('page-navigated', (data) => {
      setPageUrlToLoad(data.url);
      setIsPageLoading(true);
    });

    props.browserSocket.on('page-loaded', () => {
      setPageUrlToLoad(undefined);
      setIsPageLoading(false);
    });

    props.browserSocket.on('all-tabs', (data) => {
      setTabs(data.tabs);
    });

    props.browserSocket.on('active-tab-id', (data) => {
      setActiveTabId(data.tabId);
    });

    props.browserSocket.on('tab-title-updated', (data) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === data.tabId ? { ...tab, title: data.newTitle, url: data.url } : tab)),
      );
    });

    props.browserSocket.on('close-tab', (data) => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== data.tabId));
      setActiveTabId(undefined);
    });
  }, [props.browserSocket]);

  const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    // Prevent multiple Enter within 1000ms
    const now = Date.now();
    if (now - lastKeyDownRef.current < PAGE_LOADING_THRESHOLD) return;
    lastKeyDownRef.current = now;

    setIsPageLoading(true);
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.NAVIGATE_PAGE,
      payload: { action: PageNavigationAction.GOTO, url: pageUrlToLoad },
    } as RuntimeMessage;
    sendRuntimeMessage(message);
  };
  const handleGoBack = async () => {
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.NAVIGATE_PAGE,
      payload: { action: PageNavigationAction.GO_BACK },
    } as RuntimeMessage;
    await sendRuntimeMessage(message);
    setTimeout(() => {
      setIsPageLoading(false);
    }, RESETTING_PAGE_LOADING);
  };
  const handleGoForward = async () => {
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.NAVIGATE_PAGE,
      payload: { action: PageNavigationAction.GO_FORWARD },
    } as RuntimeMessage;
    await sendRuntimeMessage(message);
    setTimeout(() => {
      setIsPageLoading(false);
    }, RESETTING_PAGE_LOADING);
  };
  const handleReload = () => {
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.NAVIGATE_PAGE,
      payload: { action: PageNavigationAction.RELOAD },
    } as RuntimeMessage;
    sendRuntimeMessage(message);
  };

  const handleKillBrowser = () => {
    setTabs([]);
    setPageUrlToLoad(undefined);
    clearHistory();
    props.killBrowser();
  };

  const handleDetachFromBrowser = () => {
    clearHistory();
    props.detachFromBrowser();
  };

  const containerReady = containerDimension.width > 0 && containerDimension.height > 0;

  const renderNavigationBar = () => {
    if (props.browserStatus !== RemoteBrowserWindowStatus.READY) return null;

    const remoteControlTooltipTitle = props.remoteControlOn ? 'Disable remote control' : 'Enable remote control';
    return (
      <div
        className="flex-0 mb-4 flex h-10 w-full flex-row items-center justify-center"
        style={{ width: contentDimension.width }}
      >
        <div className="flex-0 mr-4 flex h-full w-fit flex-row items-center justify-center rounded-full bg-black px-2 opacity-50 shadow-2xl shadow-blue-600 backdrop-blur-md">
          <Tooltip title="Back" arrow placement="top" enterDelay={500}>
            <ArrowLeftIcon
              className="mr-1 h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={() => void handleGoBack()}
            />
          </Tooltip>
          <Tooltip title="Forward" arrow placement="top" enterDelay={500}>
            <ArrowRightIcon
              className="mr-1 h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={() => void handleGoForward()}
            />
          </Tooltip>
          <Tooltip title="Reload page" arrow placement="top" enterDelay={500}>
            <ArrowPathIcon
              className="h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={handleReload}
            />
          </Tooltip>
        </div>
        <div className="flex h-full max-w-[50%] flex-1 items-center justify-start rounded-full bg-black px-4 opacity-50 shadow-2xl shadow-blue-600 backdrop-blur-md focus-within:ring-2 focus-within:ring-blue-500">
          <div className="relative flex w-full items-center">
            <input
              type="text"
              value={pageUrlToLoad || tabs.find((tab) => tab.id === activeTabId)?.url}
              onChange={(e) => setPageUrlToLoad(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              className="w-full border-none bg-transparent text-lg text-white outline-none focus:outline-none focus:ring-0"
              placeholder="Enter URL"
            />
            {isPageLoading && (
              <div className="absolute right-2 flex items-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        <div
          className={cx(
            'flex-0 ml-4 flex h-full w-10 items-center justify-center rounded-full opacity-50 shadow-2xl shadow-blue-600 backdrop-blur-md',
            props.remoteControlOn ? 'bg-blue-600' : 'bg-black',
          )}
        >
          <Tooltip title={remoteControlTooltipTitle} arrow placement="top" enterDelay={500}>
            <CursorArrowRaysIcon
              className="h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={() => {
                if (isRewindMode && !props.remoteControlOn) resumeLiveMode();
                props.setRemoteControlOn(!props.remoteControlOn);
              }}
            />
          </Tooltip>
        </div>
        <div className="flex-0 ml-4 flex h-full w-10 items-center justify-center rounded-full bg-black opacity-50 shadow-2xl shadow-blue-600 backdrop-blur-md">
          <Tooltip title="Turn off browser" arrow placement="top" enterDelay={500}>
            <PowerIcon
              className="h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={handleKillBrowser}
            />
          </Tooltip>
        </div>
        <div className="flex-0 ml-4 flex h-full w-10 items-center justify-center rounded-full bg-black opacity-50 shadow-2xl shadow-blue-600 backdrop-blur-md">
          <Tooltip title="Detach from browser" arrow placement="top" enterDelay={500}>
            <SignalSlashIcon
              className="h-8 w-8 rounded-full p-1 text-white hover:cursor-pointer hover:bg-blue-500/30"
              onClick={handleDetachFromBrowser}
            />
          </Tooltip>
        </div>
      </div>
    );
  };

  const renderTabs = () => {
    if (props.browserStatus !== RemoteBrowserWindowStatus.READY) return null;
    return (
      <div className="mr-4 flex w-48 flex-col rounded-xl bg-black/50 p-2 backdrop-blur-md">
        {tabs.map((tab: RemoteBrowserTab) => (
          <div
            key={tab.id}
            className={cx(
              'mb-2 flex items-center justify-between rounded-lg p-2 hover:cursor-pointer hover:bg-blue-500/30',
              tab.id === activeTabId ? 'bg-blue-500/50' : '',
            )}
          >
            <div
              className="mr-1 min-w-0 flex-1"
              onClick={() => {
                props.browserSocket?.emit('switch-tab', { sessionId: props.sessionUUID, tabId: tab.id });
                setActiveTabId(tab.id);
              }}
            >
              <Tooltip title={tab.title} arrow placement="right" enterDelay={500}>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-white">
                  {tab.title ? tab.title : 'New Tab'}
                </div>
              </Tooltip>
            </div>
            {tabs.length > 1 && (
              <button
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white opacity-60 hover:bg-gray-700 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  props.browserSocket?.emit('close-tab', { sessionId: props.sessionUUID, tabId: tab.id });
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRewind = () => {
    if (props.browserStatus !== RemoteBrowserWindowStatus.READY) return null;
    return <BrowserRewind className="mt-2 w-3/5" />;
  };

  return (
    <div
      ref={containerRef}
      className={cx('flex h-full w-full flex-col items-center justify-center', props.classNameContainer)}
    >
      {renderNavigationBar()}
      {containerReady && (
        <div className="flex flex-row">
          {renderTabs()}
          <div className="flex flex-col items-center justify-center">
            <div
              ref={contentRef}
              className={cx('relative aspect-[16/9] overflow-hidden', props.classNameContent)}
              style={{
                width: contentDimension.width,
                height: contentDimension.height,
              }}
            >
              {props.children}
            </div>
            {props.mediaRecorder && (
              <div className="pt-4">
                <LiveAudioVisualizer mediaRecorder={props.mediaRecorder} width={window.innerWidth / 2} height={30} />
              </div>
            )}
          </div>
        </div>
      )}
      {renderRewind()}
    </div>
  );
}
