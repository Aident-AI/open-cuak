import { v4 as UUID } from 'uuid';
import { BroadcastEventType } from '~shared/broadcast/types';
import { Debuggee } from '~shared/chrome/Debuggee';
import { ChromeTab, isChromeInternalPageTab } from '~shared/chrome/Tab';
import { ALogger } from '~shared/logging/ALogger';
import { ChromeExtensionTransport } from '~src/common/puppeteer/override/transport/ChromeExtensionTransport';
import { BroadcastService } from '~src/common/services/BroadcastService';

type OnDetachListener = (source: Partial<Debuggee>, reason: string) => Promise<void> | void;
type OnEventListener = (source: Partial<Debuggee>, method: string, params: unknown) => Promise<void> | void;

export class TransportManager {
  public static async fetchTransportForTab(tabId: number): Promise<ChromeExtensionTransport> {
    const cached = this.#cache.get(tabId);
    if (cached) {
      if (cached.isConnected()) await cached.disconnect();
      this.#cache.delete(tabId);
    }

    const sessionId = UUID();
    const transport = new ChromeExtensionTransport(tabId, sessionId);
    this.#cache.set(tabId, transport);
    return transport;
  }

  public static async attach(): Promise<void> {
    if (this.isAttached()) return;
    if (!chrome.tabs) throw new Error('chrome.tabs API not available');
    if (!chrome.debugger) throw new Error('chrome.debugger API not available');

    const activeTab = await this.#fetchCurrentTab();
    const transport = await this.fetchTransportForTab(activeTab.id);
    if (!isChromeInternalPageTab(activeTab as ChromeTab)) await transport.connect();

    chrome.debugger.onEvent.addListener(this.#onEventListener);
    chrome.debugger.onDetach.addListener(this.#onDetachListener);
    this.#attached = true;
    await BroadcastService.send({ type: BroadcastEventType.INTERACTABLE_SERVICE_ATTACHED }, { attached: true });
  }

  public static async detach(): Promise<void> {
    if (!this.isAttached()) return;
    if (!chrome.debugger) throw new Error('chrome.debugger API not available');

    for (const tabId of this.#cache.keys()) {
      const transport = this.#cache.get(tabId);
      if (!transport) return;

      transport.close();
      this.#cache.delete(tabId);
    }

    chrome.debugger.onEvent.removeListener(this.#onEventListener);
    chrome.debugger.onDetach.removeListener(this.#onDetachListener);
    this.#attached = false;
    await BroadcastService.send({ type: BroadcastEventType.INTERACTABLE_SERVICE_ATTACHED }, { attached: false });
  }

  public static isAttached(): boolean {
    return this.#attached;
  }

  public static hasTabId(tabId: number): boolean {
    return this.#cache.has(tabId);
  }

  static #attached = false;
  static #cache = new Map<number, ChromeExtensionTransport>();

  static #onDetachListener: OnDetachListener = (source, reason) => {
    ALogger.info({ context: 'onDetach', stack: 'ChromeExtensionTransport', source, reason });
    for (const key of this.#cache.keys()) {
      const transport = this.#cache.get(key);
      if (!transport || !transport.onclose) return;

      transport.onclose.call(null);
    }
  };

  static #onEventListener: OnEventListener = (source, method, params) => {
    // eslint-disable-next-line no-console
    console.debug('[ChromeExtensionTransport] onEvent', source, method, params);
    for (const key of this.#cache.keys()) {
      const transport = this.#cache.get(key);
      if (!transport || !transport.onmessage) return;

      const message = { source, method, params, sessionId: transport.sessionId };
      transport.onmessage.call(null, JSON.stringify(message));
    }
  };

  static async #fetchCurrentTab(): Promise<ChromeTab> {
    // fetch active tab from chrome.tabs to avoid circular dependency with ActiveTabService
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) throw new Error('No active tab found');

    return activeTab as ChromeTab;
  }
}
