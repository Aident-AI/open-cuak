'use client';

import { useEffect, useState } from 'react';
import {
  InteractableRefreshedValue,
  InteractableRefreshedValueSchema,
} from '~shared/broadcast/InteractableRefreshedValueSchema';
import { BroadcastEventMessage, BroadcastEventType } from '~shared/broadcast/types';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ServiceWorkerMessage } from '~shared/messaging/service-worker/types';
import { KnownRuntimeMessageErrors, RuntimeMessage } from '~shared/messaging/types';
import { useExtensionService } from '~src/hooks/useExtensionService';

export type Node = { id?: string; role?: string; parentId?: string; childIds?: string[]; name?: string }; // TODO: merge with Companion Extension's `Interactable.Node`

// TODO: move all services to be a context for better performance (singleton)
export function useInteractable(tabId?: number) {
  const { sendRuntimeMessageWithRetry, addBroadcastListener } = useExtensionService();
  const [nodeDict, setNodeDict] = useState<Record<string, Node> | null>(null);
  const [interactableRefreshedValue, setInteractableRefreshedValue] = useState<InteractableRefreshedValue | null>(null);

  useEffect(() => {
    if (!tabId) return;

    const fetchInteractable = async () => {
      const message = {
        receiver: RuntimeMessageReceiver.SERVICE_WORKER,
        action: ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_DICT,
        payload: { tabId },
      } as ServiceWorkerMessage;
      const response = await sendRuntimeMessageWithRetry(message, true, 20, KnownRuntimeMessageErrors);
      if (!response || !response.success) {
        if (!KnownRuntimeMessageErrors.has(response.error))
          throw new Error('Failed to fetch interactable', response.error);
        ALogger.warn({ context: 'Failed to fetch interactable', error: response.error });
        return;
      }
      type payloadType = RuntimeMessage.ResponsePayload.Type[ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_DICT];
      const { nodeDict } = response.data as payloadType;
      setNodeDict(nodeDict as Record<string, Node>);
    };

    const handler = async (message: BroadcastEventMessage) => {
      const { event, value } = message;
      const refreshedValue = InteractableRefreshedValueSchema.parse(value);
      if (event.type !== BroadcastEventType.INTERACTABLE_REFRESHED) return;
      if (event.identifier?.toString() !== tabId.toString()) return;

      setInteractableRefreshedValue(refreshedValue);
      await fetchInteractable();
    };

    addBroadcastListener(handler);
    if (!nodeDict || !interactableRefreshedValue?.updatedAt) fetchInteractable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  if (!tabId) return {};
  return { nodeDict, tabId, updatedAt: interactableRefreshedValue?.updatedAt, uuid: interactableRefreshedValue?.uuid };
}
