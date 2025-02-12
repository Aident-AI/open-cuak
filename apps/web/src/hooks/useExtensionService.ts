import { useEffect, useRef } from 'react';
import { BroadcastEventMessage, BroadcastEventMessageSchema } from '~shared/broadcast/types';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { RuntimeMessage, RuntimeMessageResponseSchema } from '~shared/messaging/types';
import { RetryResponse, WaitUtils } from '~shared/utils/WaitUtils';

export interface BroadcastMessageHandler {
  (
    message: BroadcastEventMessage,
    sender?: chrome.runtime.MessageSender,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendResponse?: <T>(response?: any) => Promise<RetryResponse<T>>,
  ): Promise<void>;
}

interface ExtensionServiceHookReturn {
  getExtensionId: () => string | null;
  sendRuntimeMessage: <T>(message: RuntimeMessage) => Promise<RetryResponse<T>>;
  sendRuntimeMessageWithRetry: <T>(
    message: RuntimeMessage,
    retry?: boolean,
    maxRetry?: number,
    unretryableErrors?: Set<string>,
  ) => Promise<RetryResponse<T>>;
  addBroadcastListener: (handler: BroadcastMessageHandler) => void;
}

// TODO: move all services to be a context for better performance (singleton)
export function useExtensionService(): ExtensionServiceHookReturn {
  const extensionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // TODO: this works only for side-panel or popup contained iframes. Need to find a way to get extension ID for raw pages
    window.addEventListener('message', (event) => {
      if (!event?.data?.type) return;
      if (event.data.type !== 'aident-extension-id') return;
      extensionIdRef.current = event.data.payload;
    });
    window.parent.postMessage({ type: 'fetch-extension-id' }, '*');
  }, []);

  const getExtensionId = () => extensionIdRef.current;

  const sendRuntimeMessage = async <T>(message: RuntimeMessage): Promise<RetryResponse<T>> => {
    const { action, payload: data, receiver } = message;

    let payload;
    if (receiver === RuntimeMessageReceiver.SERVICE_WORKER) {
      const requestSchema = RuntimeMessage.RequestPayload.Schema[action];
      const result = requestSchema.safeParse(data);
      if (!result.success) {
        ALogger.error({ context: 'invalid request for service-worker message', action, data, result });
        throw new Error(`Invalid request payload for action: ${action}`);
      }
      payload = result.data;
    } else {
      payload = data;
    }

    if (!getExtensionId())
      await WaitUtils.waitUntil(() => !!getExtensionId(), {
        timeout: 1000,
        interval: 100,
        timeoutCallback: () => {
          throw new Error('Failed to get extension ID');
        },
      });
    const rsp = await chrome.runtime?.sendMessage(getExtensionId(), { receiver, action, payload });
    if (chrome.runtime.lastError)
      ALogger.error({ context: 'Message sending failed:', error: chrome.runtime.lastError });
    const response = RuntimeMessageResponseSchema.parse(rsp);
    if (!response.success) return { success: false, error: response.error };
    if (receiver !== RuntimeMessageReceiver.SERVICE_WORKER) {
      return { success: true, data: response.data as T };
    }

    const responseSchema = RuntimeMessage.ResponsePayload.Schema[action];
    if (!responseSchema) throw new Error(`No response schema found for action: ${action}`);
    const dataParseResult = responseSchema.safeParse(response.data);
    if (!dataParseResult.success) {
      ALogger.error({ context: 'invalid response schema', action, response, dataParseResult });
      throw new Error(`Invalid response payload for action: ${action}`);
    }
    return { success: true, data: dataParseResult.data as T };
  };

  const sendRuntimeMessageWithRetry = async <T>(
    message: RuntimeMessage,
    retry?: boolean,
    maxRetry?: number,
    unretryableErrorTypes?: Set<string>,
  ): Promise<RetryResponse<T>> => {
    const execSendingMessage = async <T>(message: RuntimeMessage): Promise<RetryResponse<T>> => {
      try {
        const payload = await sendRuntimeMessage(message);
        return { success: true, data: payload as T };
      } catch (error) {
        ALogger.warn({ context: 'failed to sendRuntimeMessage but gonna retry', error });
        return { success: false, error: error as string };
      }
    };

    if (!retry) return await execSendingMessage(message);
    const handle = async () => await execSendingMessage<T>(message);
    return await WaitUtils.waitUntilRetry(handle, 200, maxRetry ?? 50, unretryableErrorTypes);
  };

  const addBroadcastListener = (handler: BroadcastMessageHandler) => {
    // TODO: make this event listener to be singleton
    window.addEventListener('message', (event) => {
      if (!event?.data?.type || event.data.type !== 'aident-broadcast-forward') return;
      const eventMessage = BroadcastEventMessageSchema.parse(event.data.message);
      handler(eventMessage);
    });
  };

  return {
    getExtensionId,
    sendRuntimeMessage,
    sendRuntimeMessageWithRetry,
    addBroadcastListener,
  };
}
