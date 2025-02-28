import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { getTabByIdInServiceWorker } from '~src/common/chrome/getTabById';
import { BroadcastService } from '~src/common/services/BroadcastService';

const CHAT_GPT_URL_PREFIX = 'https://chat.openai.com/';
const CHAT_GPT_3_5_QUERY = '?model=text-davinci-002-render-sha';

export class ChatgptTabService {
  public static async start() {
    this.#instance = new ChatgptTabService();
  }

  public static async open(): Promise<ChromeTab> {
    const instance = this._instance;

    const newTab = await chrome.tabs.create({ url: CHAT_GPT_URL_PREFIX + CHAT_GPT_3_5_QUERY, active: false });
    const newTabId = newTab?.id;
    if (!newTab || !newTabId) throw new Error('Failed to get the new tab ID');

    function waitForTabToLoad(tabId: number): Promise<void> {
      return new Promise((resolve) => {
        const checkStatus = async () => {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status === 'complete') resolve();
          else setTimeout(checkStatus, 100);
        };
        checkStatus();
      });
    }
    await waitForTabToLoad(newTabId);

    const isValid = instance.#isChatGPTTab(newTabId);
    if (!isValid) throw new Error('New tab is not a valid ChatGPT tab');

    await BroadcastService.send(this.broadcastEvent, newTabId);
    instance.#tab = newTab as ChromeTab;
    return instance.#tab;
  }

  public static async fetch(): Promise<ChromeTab | null> {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_CHATGPT_TAB_ID,
    });
    if (!rsp.success) throw new Error(rsp.error);
    if (!rsp.data) return null;

    const payload = { tabId: rsp.data };
    const tabRsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_TAB_BY_ID,
      payload,
    });
    if (!tabRsp.success) throw new Error(tabRsp.error);
    return tabRsp.data ? (tabRsp.data as ChromeTab) : null;
  }

  public static getInServiceWorker(): ChromeTab | null {
    return this._instance.#tab;
  }

  public static subscribe(callback: (chatgptTabId: number | null) => Promise<void> | void): void {
    BroadcastService.subscribe<number>(this.broadcastEvent, async (chatgptTabId) => {
      await callback(chatgptTabId);
    });
  }

  public static broadcastEvent = { type: BroadcastEventType.CHATGPT_TAB_OPENED };

  private static get _instance() {
    if (!this.#instance) throw new Error('ChatgptTabService is not initialized');
    return this.#instance;
  }

  static #instance: ChatgptTabService;

  private constructor() {
    const handleOnRemoved = async (tabId: number) => {
      if (tabId !== this.#tab?.id) return;
      await this.#tabClosed();
      ALogger.info({ stack: 'ChatgptTabService', chatgptTab: this.#tab });
    };
    const handleOnUpdated = async (tabId: number) => {
      if (tabId !== this.#tab?.id) return;

      const isValidChatGPTTab = await this.#isChatGPTTab();
      if (isValidChatGPTTab) return;
      await this.#tabClosed();
      ALogger.info({ stack: 'ChatgptTabService', chatgptTab: this.#tab });
    };

    chrome.tabs.onRemoved.addListener(handleOnRemoved);
    chrome.tabs.onUpdated.addListener(handleOnUpdated);
    chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
      await handleOnRemoved(removedTabId);
      await this.#tabAdded(addedTabId);
    });
  }

  #tab: ChromeTab | null = null;

  async #isChatGPTTab(tabId?: number) {
    const target = tabId || this.#tab?.id;
    if (!target) return false;

    const isValidChatGPTTab = () => {
      const textarea = document.querySelector('textarea');
      if (!textarea) return false;
      const sendButton = document.querySelector('button[data-testid="send-button"]');
      if (!sendButton) return false;
      return true;
    };
    const results = await chrome.scripting.executeScript({ target: { tabId: target }, func: isValidChatGPTTab });
    const { result } = (results ?? [])[0] ?? { result: false };
    return result;
  }

  async #tabClosed() {
    await BroadcastService.send(ChatgptTabService.broadcastEvent, -1);
    this.#tab = null;
  }

  async #tabAdded(tabId: number) {
    const isValidChatGPTTab = await this.#isChatGPTTab(tabId);
    if (!isValidChatGPTTab) return;
    await BroadcastService.send(ChatgptTabService.broadcastEvent, tabId);
    this.#tab = await getTabByIdInServiceWorker(tabId);
  }
}
