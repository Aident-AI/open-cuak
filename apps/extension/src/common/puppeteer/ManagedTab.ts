import { CDPSession, CdpPage, CdpTarget, ChromeTargetManager, Connection, Protocol } from '@patched/puppeteer-core';
import { CDPSession as OriginalCDPSession } from 'puppeteer-core';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeTab, isChromeInternalPageTab } from '~shared/chrome/Tab';
import { ALogger } from '~shared/logging/ALogger';
import { CONNECTION_DUMMY_URL } from '~shared/puppeteer/constants';
import { getTargetInfoByTabId } from '~src/common/chrome/getAllTargetInfo';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { ChromeExtensionTransport } from '~src/common/puppeteer/override/transport/ChromeExtensionTransport';
import { TransportManager } from '~src/common/puppeteer/override/transport/TransportManager';
import { BroadcastService } from '~src/common/services/BroadcastService';

export type TargetInfo = Protocol.Target.TargetInfo;

export class ManagedTab {
  public static async fetchForTab(tab: ChromeTab): Promise<ManagedTab> {
    if (!this.#cache) this.#startCache();

    const cached = this.#cache.get(tab.id);
    if (cached) return cached;

    try {
      // build transport
      const transport = await TransportManager.fetchTransportForTab(tab.id);
      const sessionId = transport.sessionId;

      // create session
      if (!isChromeInternalPageTab(tab)) await transport.connect();
      const connection = new Connection(CONNECTION_DUMMY_URL, transport);
      const tabTarget = await getTargetInfoByTabId(tab.id);
      if (!tabTarget) throw new Error('Tab target not found');
      const targetInfo = { ...tabTarget, targetId: tabTarget.id, canAccessOpener: false } as TargetInfo;
      const attachedMessage = { id: 0, method: 'Target.attachedToTarget', params: { sessionId, targetInfo } };
      await connection.triggerOnMessage(JSON.stringify(attachedMessage));
      const session = connection.session(sessionId) as CDPSession | null;
      if (!session) throw new Error('Session not created');

      // create cdp page
      const targetFactory = (targetInfo: TargetInfo, session?: CDPSession) =>
        new CdpTarget(targetInfo, session, undefined, targetManager, undefined);
      const targetManager = new ChromeTargetManager(connection, targetFactory);
      const cdpTarget = targetFactory(targetInfo, session);
      const page = await CdpPage._create(session, cdpTarget, false, null);

      const instance = new ManagedTab(tab, page, transport, session as unknown as OriginalCDPSession);
      void this.#cache.set(tab.id, instance);
      return instance;
    } catch (error) {
      if (TransportManager.hasTabId(tab.id)) (await TransportManager.fetchTransportForTab(tab.id)).close();
      ALogger.error({ context: 'Error creating page for tab', tab, error });
      throw error;
    }
  }

  static #startCache(): void {
    this.#cache = new Map<number, ManagedTab>();
    BroadcastService.subscribe<{ attached: boolean }>(
      { type: BroadcastEventType.INTERACTABLE_SERVICE_ATTACHED },
      ({ attached }) => {
        if (!attached) this.#cache.clear();
      },
    );
    BroadcastService.subscribe<number[]>({ type: BroadcastEventType.MANAGED_WINDOWS_UPDATED }, (value) => {
      const managedWindows = new Set(value);
      Array.from(this.#cache.keys()).forEach((tabId) => {
        const tab = this.#cache.get(tabId);
        if (!tab) {
          this.#cache.delete(tabId);
          return;
        }
        if (!managedWindows.has(tab.getTab().windowId)) tab.destroy();
      });
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      if (!this.#cache) return;
      this.#cache.delete(tabId);
    });
  }

  static #cache: Map<number, ManagedTab>;

  private constructor(tab: ChromeTab, page: CdpPage, transport: ChromeExtensionTransport, session: OriginalCDPSession) {
    this.#tab = tab;
    this.#page = page;
    this.#transport = transport;
    this.#session = session;
  }

  public get(): CdpPage {
    return this.#page;
  }

  public getTab(): ChromeTab {
    return this.#tab;
  }

  public getCdpSession(): OriginalCDPSession {
    return this.#session;
  }

  public getTransport(): ChromeExtensionTransport {
    return this.#transport;
  }

  public async updateTab(newTab: ChromeTab): Promise<void> {
    const oldTab = this.#tab;
    if (newTab.id !== oldTab.id) throw new Error('Different tab. Cannot update. Create a new page instead.');

    const newTabIsChromeInternal = isChromeInternalPageTab(newTab);
    if (newTabIsChromeInternal) this.#transport.close();
    else {
      await this.#transport.connect();
    }

    this.#tab = newTab;
  }

  public destroy(): void {
    if (!InteractableService.isAttached()) this.#transport.close();
    ManagedTab.#cache?.delete(this.#tab.id);
  }

  #tab: ChromeTab;
  #page: CdpPage;
  #session: OriginalCDPSession;
  #transport: ChromeExtensionTransport;
}
