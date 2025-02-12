import { BroadcastEvent } from '~shared/broadcast/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { BroadcastMessageHandler, useExtensionService } from '~src/hooks/useExtensionService';

// TODO: move all services to be a context for better performance (singleton)
export function useBroadcastService() {
  const { sendRuntimeMessageWithRetry, addBroadcastListener } = useExtensionService();

  const send = async (event: BroadcastEvent, value: unknown): Promise<void> => {
    await sendRuntimeMessageWithRetry({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_SEND,
      payload: { event, value },
    });
  };

  const fetch = async <T>(event: BroadcastEvent): Promise<T | undefined> => {
    const response = await sendRuntimeMessageWithRetry({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_FETCH,
      payload: { event },
    });
    if (!response || !response.success) return;
    const message = response.data as { success: boolean; data: T } | undefined;
    if (!message || !message.success) return;
    return message.data as T;
  };

  const subscribe = <T>(event: BroadcastEvent, callback: (value: T, oldValue: T) => Promise<void> | void) => {
    const handler: BroadcastMessageHandler = async (message) => {
      const { event: messageEvent, value, oldValue } = message;
      if (messageEvent.type !== event.type) return;
      if (!!event.identifier && messageEvent.identifier?.toString() !== event.identifier?.toString()) return;
      await callback(value, oldValue);
    };
    addBroadcastListener(handler);
  };

  return { send, fetch, subscribe };
}
