import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ContentInjectionMessage, ContentInjectionMessageAction } from '~shared/messaging/content-injection/types';
import { RRSnapshot } from '~shared/shadow-mode/RRSnapshot';
import { MessageListener, MessageRequestHandler } from '~src/common/messaging/MessageListener';
import { DebuggerToolInjection } from '~src/scripts/content-injection/DebuggerToolInjection';

export class ContentInjectionMessageService {
  public static async inject(): Promise<void> {
    const handler: MessageRequestHandler<ContentInjectionMessage> = async (message, _sender, sendResponse) => {
      switch (message.action) {
        case ContentInjectionMessageAction.DEBUGGER_COPY_NANOID_TO_CLIPBOARD: {
          const nanoids = DebuggerToolInjection.getHoveredElementNanoids();
          const text = nanoids[0] ?? '';
          navigator.clipboard
            .writeText(text)
            .then(() => ALogger.info({ context: 'Value copied to clipboard!', nanoid: text }))
            .catch((error) => ALogger.error({ context: 'Failed to copy', error }));
          sendResponse.success();
          break;
        }
        case ContentInjectionMessageAction.PING: {
          sendResponse.success({ data: 'pong' });
          break;
        }
        case ContentInjectionMessageAction.RRWEB_FETCH_SNAPSHOT: {
          sendResponse.success({ snapshot: RRSnapshot.buildFullPageSnapshot(document) });
          break;
        }
        default:
          throw new Error(`Unknown action: ${message.action}`);
      }
    };

    const listener = new MessageListener<ContentInjectionMessage>(RuntimeMessageReceiver.CONTENT_INJECTION, handler);
    listener.start();
  }
}
