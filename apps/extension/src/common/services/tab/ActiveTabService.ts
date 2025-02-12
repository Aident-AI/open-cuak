import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeTab, ChromeTabSchema } from '~shared/chrome/Tab';
import { getTabByIdInServiceWorker } from '~src/common/chrome/getTabById';
import { ManagedWindow } from '~src/common/puppeteer/ManagedWindow';
import { TransportManager } from '~src/common/puppeteer/override/transport/TransportManager';
import { BroadcastService } from '~src/common/services/BroadcastService';

export class ActiveTabService {
  public static async start() {
    this.#instance = new ActiveTabService();
    await this.#getInstance().#fetchFromChrome();
  }

  public static async fetch(): Promise<ChromeTab> {
    const activeTab = await BroadcastService.fetch<ChromeTab>(this.BroadcastEvent);
    if (!activeTab) throw new Error('Invalid active tab');
    return activeTab;
  }

  public static getInServiceWorker(): ChromeTab {
    const tab = this.#getInstance().#activeTab;
    if (!tab) throw new Error('Invalid active tab');
    return tab;
  }

  public static subscribe(callback: (tab: ChromeTab) => Promise<void> | void): void {
    BroadcastService.subscribe<number>(this.BroadcastEvent, async (value: unknown) => {
      if (!value) throw new Error('Invalid active tab');
      await callback(ChromeTabSchema.parse(value) as ChromeTab);
    });
  }

  public static BroadcastEvent = { type: BroadcastEventType.ACTIVE_TAB_UPDATED };

  static #instance: ActiveTabService | null = null;

  static #getInstance(): ActiveTabService {
    if (!this.#instance) throw new Error('ActiveTabService not started');
    return this.#instance;
  }

  constructor() {
    if (!chrome.tabs) throw new Error('chrome.tabs is not available');

    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
      const activeTab = await getTabByIdInServiceWorker(tabId);
      if (activeTab) await this.#updateActiveTab(activeTab);
    });
    chrome.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      await this.#updateActiveTab({ ...tab, id: tabId } as ChromeTab);
    });
    chrome.windows.onFocusChanged.addListener(async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length < 1) return;
      const tab = tabs[0];
      if (!tab || !tab.id) return;

      await this.#updateActiveTab(tab as ChromeTab);
    });
  }

  #activeTab: ChromeTab | null = null;

  async #fetchFromChrome(): Promise<void> {
    if (!chrome.tabs) throw new Error('chrome.tabs is not available');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error('No active tab found');
    const tab = tabs[0];
    if (!tab || !tab.id) throw new Error('Invalid active tab');

    await this.#updateActiveTab(tab as ChromeTab);
  }

  async #updateActiveTab(tab: ChromeTab): Promise<void> {
    if (!tab || !tab.id) throw new Error('Invalid active tab');
    this.#activeTab = tab;

    await BroadcastService.send(ActiveTabService.BroadcastEvent, this.#activeTab);
    const isManagedWindow = ManagedWindow.isManagedWindowId(tab.windowId);
    await chrome.action.setBadgeText({ text: isManagedWindow ? 'on' : '', tabId: tab.id });

    const isAttached = TransportManager.isAttached();
    if (isManagedWindow && !isAttached) await TransportManager.attach();
    if (!isManagedWindow && isAttached) await TransportManager.detach();
  }
}
