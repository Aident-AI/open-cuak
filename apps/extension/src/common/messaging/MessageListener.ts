import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { RuntimeMessage, RuntimeMessageResponse, RuntimeMessageSchema } from '~shared/messaging/types';

type MessageSender = chrome.runtime.MessageSender;
export type MessageResponder = {
  success: (data?: unknown) => void;
  failure: (error?: Error) => void;
};
export type MessageRequestHandler<T> = (
  msg: T,
  sender: MessageSender,
  sendResponse: MessageResponder,
) => void | Promise<void>;
export type MessageResponseHandler<T> = (
  sendResponse: (response: RuntimeMessageResponse) => void,
  msg: T,
  sender: MessageSender,
) => MessageResponder;

export class MessageListener<T extends RuntimeMessage> {
  constructor(
    private readonly receiver: RuntimeMessageReceiver,
    private readonly requestHandler: MessageRequestHandler<T>,
    private readonly responseHandler?: MessageResponseHandler<T>,
  ) {}

  start() {
    if (!chrome.runtime) throw new Error('chrome.runtime is not available');

    const handler = (msg: unknown, sender: MessageSender, respond: (response: object) => void) => {
      const result = RuntimeMessageSchema.safeParse(msg);
      if (!result.success) {
        ALogger.info({ context: 'Invalid message received', message: msg, error: result.error });
        throw new Error('Invalid message received: ' + JSON.stringify(msg));
      }
      const message = result.data as T;
      if ((message.receiver ?? RuntimeMessageReceiver.SERVICE_WORKER) !== this.receiver) return;

      const sendResponse = (this.responseHandler ?? this.#defaultMessageResponder)(respond, message, sender);
      try {
        this.requestHandler(message as T, sender, sendResponse);
      } catch (e) {
        ALogger.error({ context: 'Error handling message', error: e });
        sendResponse.failure(e as Error);
      }

      return true; // By returning true, you tell Chrome that the response will be sent asynchronously
    };

    if (!chrome.runtime.onMessage && !chrome.runtime.onMessageExternal)
      throw new Error('chrome.runtime.onMessage is not available');
    chrome.runtime.onMessage?.addListener(handler);
    chrome.runtime.onMessageExternal?.addListener(handler);
  }

  #defaultMessageResponder: MessageResponseHandler<T> = (sendResponse) => ({
    success: <T>(data?: T) => {
      const rsp = { success: true, data } as RuntimeMessageResponse;
      // eslint-disable-next-line no-console
      console.debug('[DefaultMessageResponder] Sending response=', rsp);
      sendResponse(rsp);
    },
    failure: (error?: Error) => sendResponse({ success: false, error: error?.message ?? 'unknown error' }),
  });
}
