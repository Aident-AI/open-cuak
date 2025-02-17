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
    if (!this.getActivePage().isClosed()) return this.getActivePage();

    const newPage = await this.browser.newPage();
    await newPage.setUserAgent(USER_AGENT);
    void this.genAddTabByPage(newPage);
    return newPage;
  }

  public attachSocketToConnection(socket: Socket) {
    this.socket = socket;
  }

  public attachPageListeners(): void {
    this.getActivePage().on('framenavigated', async (frame) => {
      if (frame === this.getActivePage().mainFrame()) {
        this.socket?.emit('page-navigated', {
          sessionId: this.sessionId,
          url: frame.url(),
        });

        const loadEventPromise = new Promise<void>((resolve) => {
          this.getActivePage().once('load', () => {
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
        this.socket?.emit('tab-title-updated', {
          tabId: this.getActiveTabId(),
          newTitle: await this.getActivePage().title(),
          url: this.getActivePage().url(),
        });
      }
    });
  }

  public attachPuppeteerListeners(): void {
    this.browser.puppeteerBrowser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (!page) return;
      await this.browser.genSetupNewPage(page, { viewport: RemoteBrowserConfigs.defaultViewport });
      const tabId = await this.genAddTabByPage(page);
      this.switchTab(tabId);
      this.socket?.emit('all-tabs', { tabs: await this.genAllTabs() });
      this.socket?.emit('active-tab-id', { tabId });
    });
  }

  public detachSocketFromConnection() {
    this.socket = null;
  }

  public getPageByTabId(tabId: number): Page | undefined {
    return this.tabIdToPageMap.get(tabId);
  }

  public async genAddTabByPage(page: Page): Promise<number> {
    // TODO: we currently assume the new page is always the active tab. support for adding background tabs
    const rsp = await this.browser.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_ACTIVE_TAB,
    });
    if (!rsp || !rsp.success) throw new Error('Failed to get current tab');

    const tab = rsp.data as ChromeTab;
    this.tabIdToPageMap.set(tab.id, page);
    return tab.id;
  }

  public async removeTabAndSwitchToNext(tabId: number): Promise<number | undefined> {
    const page = this.getPageByTabId(tabId);
    if (!page) return;

    const allTabIds = Array.from(this.tabIdToPageMap.keys());
    const currentIndex = allTabIds.findIndex((id) => id === tabId);

    await page.close();
    this.tabIdToPageMap.delete(tabId);
    const remainingTabCount = this.tabIdToPageMap.size;
    if (remainingTabCount < 1) return undefined;

    const nextIndex = currentIndex >= remainingTabCount ? remainingTabCount - 1 : currentIndex;
    const nextTabId = Array.from(this.tabIdToPageMap.keys())[nextIndex];
    this.switchTab(nextTabId);
    return nextTabId;
  }

  public async genAllTabs(): Promise<RemoteBrowserTab[]> {
    const pages = Array.from(this.tabIdToPageMap.entries()).map(([tabId, page]) => ({ id: tabId, page }));
    const pagesWithTitles = await Promise.all(
      pages.map(async ({ id, page }) => ({ id, url: page.url(), title: await page.title() })),
    );
    console.log('pagesWithTitles=', JSON.stringify(pagesWithTitles));
    return pagesWithTitles.filter(({ title }) => title !== '[AidentAI] Extension API Page');
  }

  public switchTab(tabId: number) {
    this.activeTabId = tabId;
    this.attachPageListeners();
    void this.getActivePage().bringToFront();
    void ScreencastHandler.genStartScreencast(this);
  }

  public getActiveTabId(): number {
    return this.activeTabId;
  }

  public getActivePage(): Page {
    return this.tabIdToPageMap.get(this.activeTabId)!;
  }

  public activeTabId: number;
  public browser: RemoteBrowser;
  public enableInteractionEvents = false;
  public keepAlive: boolean;
  public sessionId: string;
  public socket: Socket | null = null;
  public userId: string;

  private tabIdToPageMap = new Map<number, Page>();

  constructor(browser: RemoteBrowser, page: Page, config: BrowserConnectionData, tabId: number, userId: string) {
    this.activeTabId = tabId;
    this.browser = browser;
    this.keepAlive = config.keepAlive ?? false;
    this.sessionId = config.sessionId;
    this.userId = userId;
    this.tabIdToPageMap.set(tabId, page);

    this.attachPuppeteerListeners();
  }
}
