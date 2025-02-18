import { Page } from 'puppeteer-core';
import { Socket } from 'socket.io';
import { BrowserConnectionData, USER_AGENT } from '~browserless/server/src/ConnectionManager';
import { ScreencastHandler } from '~browserless/server/src/ScreencastHandler';
import { ChromeTab } from '~shared/chrome/Tab';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteBrowserTab } from '~shared/portal/RemoteBrowserTypes';
import { RemoteBrowser } from '~shared/remote-browser/RemoteBrowser';
import { RemoteBrowserConfigs } from '~shared/remote-browser/RemoteBrowserConfigs';

export class RemoteBrowserConnection {
  public async genEnsurePageIsActive(): Promise<Page> {
    if (this.page.isClosed()) {
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(USER_AGENT);
    }
    return this.page;
  }

  public attachSocketToConnection(socket: Socket) {
    this.socket = socket;
  }

  public attachPageListeners(): void {
    this.page.on('framenavigated', async (frame) => {
      if (frame === this.page.mainFrame()) {
        this.socket?.emit('page-navigated', {
          sessionId: this.sessionId,
          url: frame.url(),
        });

        const loadEventPromise = new Promise<void>((resolve) => {
          this.page.once('load', () => {
            console.log('Load event fired after main frame navigation');
            resolve();
          });
        });

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('Load event did not fire within timeout after navigation.');
            resolve();
          }, 5000);
        });

        await Promise.race([loadEventPromise, timeoutPromise]);

        this.socket?.emit('page-loaded');
        const tabId = this.getActiveTabId();
        this.socket?.emit('tab-title-updated', {
          tabId,
          newTitle: await this.page.title(),
          url: this.page.url(),
        });
      }
    });
  }

  public attachPuppeteerListeners(): void {
    this.browser.puppeteerBrowser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (!page) return;
      await this.browser.genSetupNewPage(page, { viewport: RemoteBrowserConfigs.defaultViewport });
      const tabId = await this.genAddTab(page);
      this.switchTab(tabId);
      this.socket?.emit('all-tabs', { tabs: await this.getAllTabs() });
      this.socket?.emit('active-tab-id', { tabId });
    });
  }

  public detachSocketFromConnection() {
    this.socket = null;
  }

  public getTabId(page: Page): number | undefined {
    return this.pageToTabIdMap.get(page);
  }

  public getPageByTabId(tabId: number): Page | undefined {
    return Array.from(this.pageToTabIdMap.entries()).find(([_, id]) => id === tabId)?.[0];
  }

  public async genAddTab(page: Page): Promise<number> {
    const rsp = await this.browser.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_CURRENT_TAB,
    });
    if (!rsp || !rsp.success) throw new Error('Failed to get current tab');

    const tab = rsp.data as ChromeTab;
    this.pageToTabIdMap.set(page, tab.id);
    return tab.id;
  }

  public async removeTabAndSwitchToNext(tabId: number): Promise<number | undefined> {
    const page = this.getPageByTabId(tabId);
    if (!page) return;

    const allTabs = Array.from(this.pageToTabIdMap.entries());
    const currentIndex = allTabs.findIndex(([p]) => p === page);

    this.pageToTabIdMap.delete(page);
    await page.close();

    const remainingTabs = Array.from(this.pageToTabIdMap.entries());

    if (remainingTabs.length > 0) {
      const nextIndex = currentIndex >= remainingTabs.length ? remainingTabs.length - 1 : currentIndex;
      const [_, nextTabId] = remainingTabs[nextIndex];
      this.switchTab(nextTabId);
      return nextTabId;
    }
    return undefined;
  }

  public async getAllTabs(): Promise<RemoteBrowserTab[]> {
    const pages = Array.from(this.pageToTabIdMap.keys());
    const pagesWithTitles = await Promise.all(
      pages.map(async (page) => ({
        page,
        title: await page.title(),
      })),
    );
    return pagesWithTitles
      .filter(({ title }) => title !== '[AidentAI] Extension API Page')
      .map(({ page, title }) => ({
        id: this.getTabId(page)!,
        url: page.url(),
        title,
      }));
  }

  public switchTab(tabId: number) {
    const page = this.getPageByTabId(tabId);
    if (!page) return;
    this.page = page;
    this.page.bringToFront();
    this.attachPageListeners();
    ScreencastHandler.genStartScreencast(this);
  }

  public getActiveTabId(): number {
    return this.pageToTabIdMap.get(this.page)!;
  }

  public browser: RemoteBrowser;
  public enableInteractionEvents = false;
  public keepAlive: boolean;
  public page: Page;
  public sessionId: string;
  public socket: Socket | null = null;
  public userId: string;

  private pageToTabIdMap = new Map<Page, number>();

  constructor(browser: RemoteBrowser, page: Page, config: BrowserConnectionData, tabId: number, userId: string) {
    this.browser = browser;
    this.keepAlive = config.keepAlive ?? false;
    this.page = page;
    this.sessionId = config.sessionId;
    this.userId = userId;

    this.attachPuppeteerListeners();
    this.pageToTabIdMap.set(page, tabId);
  }
}
