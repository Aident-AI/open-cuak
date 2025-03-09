import { Page } from 'puppeteer-core';
import { MouseHandler } from '~browserless/server/src/MouseHandler';
import { RemoteBrowserConnection } from '~browserless/server/src/RemoteBrowserConnection';
import { AuthenticatedSocket } from '~browserless/server/websocket-server';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteBrowser } from '~shared/remote-browser/RemoteBrowser';
import { RemoteBrowserConfigs } from '~shared/remote-browser/RemoteBrowserConfigs';

export interface BrowserConnectionData {
  keepAlive?: boolean;
  resumeOnly?: boolean;
  sessionId: string;
}

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const BROWSERLESS_URL = 'ws://localhost:3000';

export class ConnectionManager {
  public async genConnectBrowser(socket: AuthenticatedSocket, config: BrowserConnectionData): Promise<void> {
    const { sessionId } = config;
    const browser = await RemoteBrowser.connect({ execSessionId: sessionId, timeout: 0, endpoint: BROWSERLESS_URL });
    const viewport = RemoteBrowserConfigs.defaultViewport;
    const [_, page] = await Promise.all([browser.genSetCookies(socket.user?.id!), browser.newPage({ viewport })]);
    await page.setUserAgent(USER_AGENT);

    const rsp = await browser.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_ACTIVE_TAB,
    });
    if (!rsp.success) throw new Error('Failed to get active tab');
    const tabId = rsp.data?.id;
    if (!tabId) throw new Error('No tab id found');

    const connection = new RemoteBrowserConnection(browser, page, config, tabId, socket.user?.id!);
    connection.attachSocketToConnection(socket);
    connection.attachPageListeners();
    this.connections[sessionId] = connection;

    const getConnection = () => {
      const connection = this.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      return connection;
    };
    await MouseHandler.genSetupMousePositionListener(getConnection);
  }

  public async genCloseConnection(sessionId: string): Promise<void> {
    const connection = this.connections[sessionId];
    if (!connection) return;
    await this.genCacheCookie(connection);
    await connection.browser.close();
    delete this.connections[sessionId];
  }

  public async genEnsurePageIsActive(sessionId: string): Promise<Page> {
    const connection = this.getConnectionBySessionId(sessionId);
    if (!connection) throw new Error('Connection not found');
    return await connection.genEnsurePageIsActive();
  }

  public getConnectionBySessionId(sessionId: string): RemoteBrowserConnection | undefined {
    return this.connections[sessionId];
  }

  public getConnectionBySocket(socket: AuthenticatedSocket): RemoteBrowserConnection | null {
    const allConnections = Object.values(this.connections);
    return allConnections.find((i) => i.socket?.id === socket.id) ?? null;
  }

  public getAllSessionIds(): string[] {
    return Object.keys(this.connections);
  }

  private async genCacheCookie(connection: RemoteBrowserConnection): Promise<void> {
    const rsp = await connection.browser.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.CACHE_COOKIES,
      payload: connection.userId,
    });
    if (!rsp.success) {
      ALogger.error({ context: `Failed to cache cookies for user ${connection.userId}` });
    } else {
      ALogger.info({ context: `Successfully cached cookies for user ${connection.userId}` });
    }
  }

  private connections: Record<string, RemoteBrowserConnection> = {};
}
