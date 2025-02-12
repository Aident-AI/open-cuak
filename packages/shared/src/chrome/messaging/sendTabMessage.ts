import { ContentWorkerMessage } from '~shared/injection/ContentWorkerMessage';
import { SandboxMessage } from '~shared/messaging/sandbox/types';

export enum TabMessageType {
  CONTENT = 'content',
  SANDBOX = 'sandbox',
}
export type TabMessage = ContentWorkerMessage | SandboxMessage;

export async function sendTabMessage<T>(tabId: number, message: TabMessage): Promise<T> {
  if (!chrome?.tabs?.sendMessage) throw new Error('chrome.tabs.sendMessage is not available');

  const response = await chrome.tabs.sendMessage(tabId, message);
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return response;
  }
  return response as T;
}

export async function sendSandboxMessage<T>(tabId: number, message: SandboxMessage): Promise<T> {
  return await sendTabMessage(tabId, message);
}

export async function sendContentMessage<T>(tabId: number, message: ContentWorkerMessage): Promise<T> {
  return await sendTabMessage(tabId, message);
}
