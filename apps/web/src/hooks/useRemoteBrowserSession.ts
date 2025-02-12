import { useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { BroadcastEvent } from '~shared/broadcast/types';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage } from '~shared/messaging/types';
import { RemoteBrowserInteractionEventSchema } from '~shared/remote-browser/RemoteBrowserInteractionEvent';
import { RemoteBrowserSocket } from '~shared/remote-browser/RemoteBrowserSocket';
import { UserSessionContext } from '~src/contexts/UserSessionContext';
import { useInteractionEventContext } from '~src/hooks/useInteractionEventContext';
import { useRemoteBrowserMessaging } from '~src/hooks/useRemoteBrowserMessaging';

interface Props {
  keepAlive: boolean;

  teachModeOn?: boolean;

  onBrowserSession?: (data: unknown) => void;
  onConnect?: () => void;
  onConnectError?: (error: string) => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: string) => void;
  onSessionIdChange?: (sessionId: string) => void;
}

export type RemoteBrowserSession = {
  browserStatus: RemoteBrowserWindowStatus;
  isConnected: boolean;
  isInteractionEventsEnabled: boolean;
  sessionId: string | undefined;
  socket: Socket | null;

  attachToSessionId: (sessionId: string) => void;
  detach: () => void;
  disableInteractionEvents: () => void;
  emitEvent: (event: string, data?: object) => void;
  enableInteractionEvents: () => void;
  killSession: () => void;
  sendBroadcastEvent: <T>(event: BroadcastEvent, value: unknown) => Promise<T>;
  sendRuntimeMessage: <T>(message: RuntimeMessage) => Promise<T>;
};

export enum RemoteBrowserWindowStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  READY = 'ready',
  STOPPED = 'stopped',
}

export const useRemoteBrowserSession = (props: Props): RemoteBrowserSession => {
  const { addEvent, clearEvents } = useInteractionEventContext();
  const { session } = useContext(UserSessionContext);

  const [browserStatus, setBrowserStatus] = useState<RemoteBrowserWindowStatus>(RemoteBrowserWindowStatus.PENDING);
  const [isInteractionEventsEnabled, setIsInteractionEventsEnabled] = useState(false);
  const [remoteBrowserSessionId, setRemoteBrowserSessionId] = useState<string | undefined>(undefined);
  const [socket, setSocket] = useState<Socket | null>(null);
  const remoteBrowserMessaging = useRemoteBrowserMessaging({ remoteBrowserSessionId: remoteBrowserSessionId });

  useEffect(() => {
    if (!props.teachModeOn) clearEvents();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.teachModeOn]);

  const attachToSessionId = (sessionId: string) => {
    setBrowserStatus(RemoteBrowserWindowStatus.LOADING);
    setRemoteBrowserSessionId(sessionId);
    if (props?.onSessionIdChange) props.onSessionIdChange(sessionId ?? '');

    const newSocket = RemoteBrowserSocket.getSocketConnection({ userSession: session });
    newSocket.on('connect', () => {
      ALogger.info('Connected to WebSocket server');
      newSocket.emit('connect-browser', {
        sessionId,
        keepAlive: props.keepAlive,
      });
    });
    newSocket.on('connect_error', (error) => {
      ALogger.error('Socket connection error:', error.message);

      detach();
      if (props?.onConnectError) props.onConnectError(error.message);
    });
    newSocket.on('browser-session', (data: unknown) => {
      setSocket(newSocket);
      setBrowserStatus(RemoteBrowserWindowStatus.READY);

      if (props?.onBrowserSession) props.onBrowserSession(data);
    });
    newSocket.on('error', (error) => {
      ALogger.error('WebSocket Error:', error.message);
      if (props?.onError) props.onError(error.message);
    });
    newSocket.on('disconnect', (reason: string) => {
      ALogger.info('WebSocket Disconnected:', reason);
      detach();
      if (props?.onDisconnect) props.onDisconnect(reason);
    });
    newSocket.on('interaction-event', (event: object) => {
      const e = RemoteBrowserInteractionEventSchema.parse(event);
      addEvent(e);
    });
  };

  const detach = () => {
    socket?.disconnect();

    setSocket(null);
    setBrowserStatus(RemoteBrowserWindowStatus.STOPPED);
    setRemoteBrowserSessionId(undefined);
  };

  const killSession = () => {
    if (!socket) return;

    emitEvent('close-browser');
    detach();
  };

  const emitEvent = (event: string, data?: object) => {
    if (!socket) throw new Error('Socket is not connected');
    if (!remoteBrowserSessionId) throw new Error('Session ID is not set');

    socket.emit(event, { sessionId: remoteBrowserSessionId, ...data });
  };

  const sendBroadcastEvent = async <T>(event: BroadcastEvent, value: unknown) => {
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_SEND,
      payload: { event, value },
    } as RuntimeMessage;
    return await remoteBrowserMessaging.sendRuntimeMessage<T>(message);
  };

  const enableInteractionEvents = () => {
    if (!socket) return;
    emitEvent('enable-interaction-events');
    setIsInteractionEventsEnabled(true);
  };
  const disableInteractionEvents = () => {
    if (!socket) return;
    emitEvent('disable-interaction-events');
    setIsInteractionEventsEnabled(false);
  };

  return {
    browserStatus,
    isConnected: !!socket,
    isInteractionEventsEnabled,
    sessionId: remoteBrowserSessionId,
    socket,

    attachToSessionId,
    detach,
    disableInteractionEvents,
    emitEvent,
    enableInteractionEvents,
    killSession,
    sendBroadcastEvent,
    sendRuntimeMessage: remoteBrowserMessaging.sendRuntimeMessage,
  };
};
