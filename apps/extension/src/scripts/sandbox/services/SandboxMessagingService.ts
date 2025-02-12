import { v4 as UUID } from 'uuid';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { sendTabMessage } from '~shared/chrome/messaging/sendTabMessage';
import { ContentWorkerMessage } from '~shared/injection/ContentWorkerMessage';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import {
  SandboxEventType,
  SandboxOutboundTarget,
  SandboxWindowEvent,
  SandboxWindowEventSchema,
  SandboxWindowEventSource,
} from '~shared/messaging/sandbox/SandboxEventTypes';
import {
  SandboxMessage,
  SandboxMessageResponse,
  SandboxMessageSchema,
  SandboxMessageType,
} from '~shared/messaging/sandbox/types';
import { RuntimeMessage } from '~shared/messaging/types';
import { AnyFunction } from '~shared/utils/Function';
import { SandboxPageInjection } from '~src/scripts/sandbox/SandboxPageInjection';
import { SandboxEvalService } from '~src/scripts/sandbox/services/SandboxEvalService';

export class SandboxMessagingService {
  // Send a message to the sandbox
  public static async postMessage(event: SandboxWindowEvent) {
    const target = SandboxPageInjection.target.contentWindow;
    if (!target) throw new Error('Failed to get sandbox target');
    target.postMessage({ source: SandboxWindowEventSource, ...event }, '*');
  }

  public static initForwarderInContentScript(pendingMessages: Map<string, unknown>) {
    window.addEventListener('message', async (e) => {
      if (!e.data) return;
      if (e.data.source !== SandboxWindowEventSource) return;

      const event = SandboxWindowEventSchema.parse(e.data);

      switch (event.type) {
        case SandboxEventType.INBOUND:
          // do nothing here
          return;
        case SandboxEventType.INBOUND_RESPONSE: {
          const sendResponse = pendingMessages.get(event.id);
          if (!sendResponse || typeof sendResponse !== 'function') return;

          sendResponse(event.response);
          pendingMessages.delete(event.id);
          return;
        }
        case SandboxEventType.OUTBOUND: {
          const { target, message, id } = event;
          let outboundResponse;
          switch (target) {
            case SandboxOutboundTarget.SERVICE:
              outboundResponse = await sendRuntimeMessage(message);
              break;
            case SandboxOutboundTarget.CONTENT:
              outboundResponse = await sendTabMessage(event.tabId, message);
              break;
            default:
              throw new Error('unknown sandbox outbound event type');
          }
          const responseEvent = { id, type: SandboxEventType.OUTBOUND_RESPONSE as const, response: outboundResponse };
          await SandboxMessagingService.postMessage(responseEvent);
          return;
        }
        case SandboxEventType.OUTBOUND_RESPONSE:
          // do nothing here
          return;
        default:
          throw new Error('unknown sandbox event type');
      }
    });

    const handleSandboxMessages = (
      message: SandboxMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      const handleAsync = async () => {
        if (message.receiver !== RuntimeMessageReceiver.SANDBOX) return;

        const eventId = UUID();
        const event = { id: eventId, type: SandboxEventType.INBOUND as const, message, sender };
        await SandboxMessagingService.postMessage(event);
        pendingMessages.set(eventId, sendResponse);
      };

      handleAsync();
      return true; // By returning true, you tell Chrome that the response will be sent asynchronously
    };
    chrome.runtime?.onMessage?.addListener(handleSandboxMessages);
    chrome.runtime?.onMessageExternal?.addListener(handleSandboxMessages);
  }

  public static initForwarderInSandbox() {
    window.addEventListener('message', (e) => {
      const eventParse = SandboxWindowEventSchema.safeParse(e.data);
      if (!eventParse.success || !eventParse.data) return;

      const event = eventParse.data;
      const { id, type } = event;
      switch (type) {
        case SandboxEventType.INBOUND: {
          const { message } = event;
          const { action, payload } = SandboxMessageSchema.parse(message);

          const _sendResponse = (response: SandboxMessageResponse) =>
            SandboxMessagingService._instance._sendWindowEvent({
              id,
              type: SandboxEventType.INBOUND_RESPONSE,
              response,
            });
          const _sendSuccessResponse = (data: unknown) => _sendResponse({ success: true, data });
          const _sendFailureResponse = (error: string) => _sendResponse({ success: false, error });

          switch (action) {
            case SandboxMessageType.CREATE_FUNCTION: {
              try {
                const data = SandboxEvalService.createFunction(payload.functionValue);
                _sendSuccessResponse(data);
              } catch (error: unknown) {
                _sendFailureResponse((error as Error).message);
              }
              return;
            }
            case SandboxMessageType.INVOKE_FUNCTION: {
              try {
                const { id, args } = payload;
                const data = SandboxEvalService.invokeFunction(id, args);
                _sendSuccessResponse(data);
              } catch (error: unknown) {
                _sendFailureResponse((error as Error).message);
              }
              return;
            }

            default:
              _sendFailureResponse('unknown sandbox message action');
              return;
          }
        }
        case SandboxEventType.INBOUND_RESPONSE:
          // do nothing here
          return;
        case SandboxEventType.OUTBOUND:
          // do nothing here
          return;
        case SandboxEventType.OUTBOUND_RESPONSE: {
          const callback = SandboxMessagingService._instance.#pendingCallbacks.get(id);
          if (!callback || !callback.resolve) return;
          if (event.response.success) {
            (callback.resolve as AnyFunction)(event.response.data);
          } else {
            (callback.reject as AnyFunction)(event.response.error);
          }
          SandboxMessagingService._instance.#pendingCallbacks.delete(id);
          return;
        }
        default:
          throw new Error('unknown sandbox event type');
      }
    });
  }

  public static async sendRuntimeMessage<T>(message: RuntimeMessage) {
    return await SandboxMessagingService._instance._sendWindowEvent<T>({
      id: UUID(),
      type: SandboxEventType.OUTBOUND,
      target: SandboxOutboundTarget.SERVICE,
      message,
    });
  }

  public static async sendContentMessage<T>(tabId: number, message: ContentWorkerMessage) {
    return await SandboxMessagingService._instance._sendWindowEvent<T>({
      id: UUID(),
      type: SandboxEventType.OUTBOUND,
      target: SandboxOutboundTarget.CONTENT,
      tabId,
      message,
    });
  }

  static #instance: SandboxMessagingService;

  protected static get _instance() {
    if (!this.#instance) this.#instance = new SandboxMessagingService();
    return this.#instance;
  }

  private constructor() {}

  #pendingCallbacks: Map<string, { resolve: unknown; reject: unknown }> = new Map();

  private _sendWindowEvent<T>(event: SandboxWindowEvent): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = event.id;

      window.parent.postMessage({ source: SandboxWindowEventSource, ...event }, '*');
      this.#pendingCallbacks.set(id, { resolve, reject });
    });
  }
}
