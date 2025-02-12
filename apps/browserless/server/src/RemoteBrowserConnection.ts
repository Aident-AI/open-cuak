import { Page } from 'puppeteer-core';
import { Socket } from 'socket.io';
import { v4 as UUID } from 'uuid';
import { BrowserConnectionData, USER_AGENT } from '~browserless/server/src/ConnectionManager';
import { ScreencastHandler } from '~browserless/server/src/ScreencastHandler';
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
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame()) {
        this.socket?.emit('page-navigated', {
          sessionId: this.sessionId,
          url: frame.url(),
        });
      }
    });

    this.page.on('load', async () => {
      this.socket?.emit('page-loaded');
      const tabId = this.getActiveTabId();
      this.socket?.emit('tab-title-updated', {
        tabId,
        newTitle: await this.page.title(),
        url: this.page.url(),
      });
    });
  }

  public attachPuppeteerListeners(): void {
    this.browser.puppeteerBrowser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (!page) return;
      await this.browser.genSetupNewPage(page, { viewport: RemoteBrowserConfigs.defaultViewport });
      const tabId = this.addTab(page);
      this.switchTab(tabId);
      this.socket?.emit('all-tabs', { tabs: await this.getAllTabs() });
      this.socket?.emit('active-tab-id', { tabId });
    });
  }

  public detachSocketFromConnection() {
    this.socket = null;
  }

  public getTabId(page: Page): string | undefined {
    return this.pageToTabIdMap.get(page);
  }

  public getPageByTabId(tabId: string): Page | undefined {
    return Array.from(this.pageToTabIdMap.entries()).find(([_, id]) => id === tabId)?.[0];
  }

  public addTab(page: Page): string {
    const tabId = UUID();
    this.pageToTabIdMap.set(page, tabId);
    return tabId;
  }

  public async removeTabAndSwitchToNext(tabId: string): Promise<string | undefined> {
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

  public switchTab(tabId: string) {
    const page = this.getPageByTabId(tabId);
    if (!page) return;
    this.page = page;
    this.page.bringToFront();
    this.attachPageListeners();
    ScreencastHandler.genStartScreencast(this);
  }

  public getActiveTabId(): string {
    return this.pageToTabIdMap.get(this.page)!;
  }

  public browser: RemoteBrowser;
  public enableInteractionEvents = false;
  public keepAlive: boolean;
  public page: Page;
  public sessionId: string;
  public socket: Socket | null = null;
  public tabId: number;
  public userId: string;
  private pageToTabIdMap = new Map<Page, string>();

  constructor(browser: RemoteBrowser, page: Page, config: BrowserConnectionData, tabId: number, userId: string) {
    this.browser = browser;
    this.keepAlive = config.keepAlive ?? false;
    this.page = page;
    this.sessionId = config.sessionId;
    this.tabId = tabId;
    this.userId = userId;
    this.pageToTabIdMap.set(page, UUID());

    this.attachPuppeteerListeners();
  }
}
