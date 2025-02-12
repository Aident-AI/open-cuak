export const EXTENSION_API_MESSAGE_KEY = 'sandbox-event-message';

export enum ExtensionApiMessageType {
  FETCH_CHROME_SESSION_STORAGE = 'fetch-chrome-session-storage',
  FETCH_EXTENSION_ID = 'fetch-extension-id',
  SEND_RUNTIME_MESSAGE = 'send-runtime-message',
}
