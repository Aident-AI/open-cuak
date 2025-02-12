'use client';

import { useEffect } from 'react';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { getExtensionId } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import {
  EXTENSION_API_MESSAGE_KEY,
  ExtensionApiMessageType,
} from '~shared/messaging/extension-api/ExtensionApiMessage';
import { RuntimeMessageSchema } from '~shared/messaging/types';
import { loadConfigJson } from '~src/common/loadConfigJson';
import { BroadcastService } from '~src/common/services/BroadcastService';

export default function ApiPageContent() {
  useEffect(() => {
    const exec = async () => {
      await ALogger.genInit(undefined, ExecutionEnvironment.EXTENSION_API_PAGE);
      await loadConfigJson('../../config.json');

      const handleSandboxEventMessage = async (event: MessageEvent) => {
        if (event?.data?.type !== EXTENSION_API_MESSAGE_KEY) return;

        ALogger.info({ context: 'Received sandbox event message', message: event?.data });
        const eventType = event?.data?.eventType;
        if (!eventType) return;
        const requestId = event?.data?.requestId;
        if (!requestId) throw new Error('requestId is required');

        const sendResponse = (response: unknown, success = true) =>
          event.source?.postMessage({ type: requestId, response, success }, { targetOrigin: event.origin });
        try {
          switch (eventType) {
            case ExtensionApiMessageType.FETCH_EXTENSION_ID: {
              sendResponse(getExtensionId());
              break;
            }
            case ExtensionApiMessageType.FETCH_CHROME_SESSION_STORAGE: {
              const value = await BroadcastService.fetch(event?.data?.payload);
              sendResponse(value);
              break;
            }
            case ExtensionApiMessageType.SEND_RUNTIME_MESSAGE: {
              ALogger.info({ context: 'Received runtime message', message: event?.data?.payload });
              const message = RuntimeMessageSchema.parse(event?.data?.payload);
              const response = await sendRuntimeMessage(message);
              ALogger.info({ context: 'Sent runtime message', response });
              sendResponse(response);

              break;
            }
            default:
              throw new Error(`Unknown event type: ${eventType}`);
          }
        } catch (e) {
          ALogger.error(e);
          sendResponse({ error: e }, false);
        }
      };

      window.addEventListener('message', handleSandboxEventMessage);
      return () => window.removeEventListener('message', handleSandboxEventMessage);
    };
    exec();
  }, []);

  return <main title="extension-api" />;
}
