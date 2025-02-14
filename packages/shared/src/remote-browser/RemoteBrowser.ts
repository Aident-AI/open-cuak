import puppeteer, { Browser, Page, Protocol, Target } from 'puppeteer-core';
import { v4 as UUID } from 'uuid';
import { z } from 'zod';
import { BroadcastEvent, BroadcastEventType } from '~shared/broadcast/types';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import {
  EXTENSION_API_MESSAGE_KEY,
  ExtensionApiMessageType,
} from '~shared/messaging/extension-api/ExtensionApiMessage';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { RemoteBrowserConfigs } from '~shared/remote-browser/RemoteBrowserConfigs';
import { WaitUtils } from '~shared/utils/WaitUtils';

export interface RemoteBrowserOptions {
  endpoint: string;

  defaultViewport?: { width: number; height: number };
  execSessionId?: string;
  loadExtension?: boolean;
  maxRetries?: number; // default is 10
  timeout?: number; // default is 3 minutes. 0 means no timeout
}

export interface RemoteBrowserNewPageOptions {
  gotoUrl?: string;
  cookies?: Protocol.Network.CookieParam[];
  viewport?: {
    width: number;
    height: number;
  };
}

export interface RemoteBrowserTarget extends Target {
  _targetId: string;
}

export const RemoteBrowserSessionInfoSchema = z.object({
  browserId: z.string(),
  endpoint: z.string(),
  execSessionId: z.string(),
  extensionId: z.string(),
  browserlessSessionInfo: z.array(z.any()),
});
export type RemoteBrowserSessionInfo = z.infer<typeof RemoteBrowserSessionInfoSchema>;

const DOWNLOAD_PATH = '/app/browserless/data';

export class RemoteBrowser {
  // =============
  // Public Static
  // =============
  public static async connect(options?: RemoteBrowserOptions): Promise<RemoteBrowser> {
    const execSessionId = options?.execSessionId ?? UUID();
    const defaultViewport = options?.defaultViewport ?? RemoteBrowserConfigs.defaultViewport;
    const endpoint = options?.endpoint ?? 'ws://localhost:11976';
    const args = this.#buildBrowserArgs({ endpoint, ...options, execSessionId, defaultViewport });
    const launchParams = JSON.stringify({ headless: false, args });
    const wsEndpoint = `${endpoint}/?token=${this.#getBrowserlessToken()}&launch=${launchParams}`;

    const start0 = Date.now();
    ALogger.info({ stack: 'RemoteBrowser', context: 'Generated WebSocket URL', wsEndpoint, start: start0 });
    const reportStepCompletion = (step: string, stepInMs: number): number => {
      ALogger.info({ stack: 'RemoteBrowser', context: step, stepInMs, execSessionId });
      return Date.now();
    };

    // Step 1: Connect to the remote browser
    const protocolTimeout = options?.timeout ?? 180_000;
    const connectionTimeout = 2_000;
    const maxRetries = options?.maxRetries ?? 10;
    const connectWithTimeout = async (attempt: number = 1): Promise<Browser> => {
      try {
        process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';
        const connectionPromise = puppeteer.connect({
          browserWSEndpoint: wsEndpoint,
          protocolTimeout,
          defaultViewport: null, // Explicitly setting viewport to null
        });
        const timeoutPromise = async () => {
          await WaitUtils.wait(connectionTimeout);
          throw new Error(`Browser connection timed out after ${connectionTimeout} ms`);
        };
        return await Promise.race<Browser>([connectionPromise, timeoutPromise()]);
      } catch (e) {
        const error = e as Error;
        if (attempt >= maxRetries) throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);

        const logLine = `Connection attempt ${attempt} failed, retrying...`;
        ALogger.warn({ stack: 'RemoteBrowser', context: logLine, execSessionId, error });
        await WaitUtils.wait(100 * attempt * attempt); // exponential backoff

        // Check if connection was actually established at the endpoint
        const session = await RemoteBrowser.genFetchRemoteBrowserSessionByExecSessionId(endpoint, execSessionId);
        if (session) {
          ALogger.info({ stack: 'RemoteBrowser', context: 'Zombie session found. Killing...', execSessionId });
          const success = await this.genKillSession(endpoint, execSessionId);
          if (!success) ALogger.warn({ stack: 'RemoteBrowser', context: 'Failed to kill session.', execSessionId });
          else ALogger.info({ stack: 'RemoteBrowser', context: 'Zombie session killed.', execSessionId });
        }

        ALogger.info({ stack: 'RemoteBrowser', context: 'Retrying connection...', execSessionId });
        return connectWithTimeout(attempt + 1);
      }
    };
    const browser = await connectWithTimeout();
    const start1 = reportStepCompletion('Connected to remote browser through puppeteer', Date.now() - start0);

    // Step 2: Wait until the service worker is available
    const { browserId, extensionId } = await RemoteBrowser.#waitUntilServiceWorkerAvailable(endpoint, execSessionId);
    const start2 = reportStepCompletion('Service worker is available', Date.now() - start1);

    // Step 3: Open the extension API page
    const extensionApiPage = await browser.newPage();
    await extensionApiPage.goto(`chrome-extension://${extensionId}/app/api.html`, { waitUntil: 'networkidle0' });
    const start3 = reportStepCompletion('Extension API page opened', Date.now() - start2);

    // Step 4: Wait until the service worker is ready
    const rbConfig = { browser, browserId, defaultViewport, endpoint, execSessionId, extensionApiPage, extensionId };
    const remoteBrowser = new RemoteBrowser(rbConfig);
    await RemoteBrowser.#waitUntilServiceWorkerReady(remoteBrowser);
    void reportStepCompletion('Service worker is ready', Date.now() - start3);

    // Step 5: Broadcast and cache exec-session-id
    await Promise.all([
      remoteBrowser.genFetchAndCacheRemoteBrowserSessionInfo(),
      remoteBrowser.genSendBroadcastEvent({ type: BroadcastEventType.EXEC_SESSION_ID }, execSessionId),
    ]);

    const totalInMs = Date.now() - start0;
    ALogger.info({ stack: 'RemoteBrowser', context: 'RemoteBrowser connected', execSessionId, totalInMs });
    return remoteBrowser;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static async fetchAllSessionsOnHost(endpoint: string): Promise<any[]> {
    const host = new URL(endpoint).host;
    const url = `http://${host}/sessions?token=${this.#getBrowserlessToken()}`;
    const rsp = await fetch(url);
    if (!rsp.ok) throw new Error(`Failed to fetch host sessions. URL: ${url}, status: ${rsp.status}`);
    const data = await rsp.json();
    if (!Array.isArray(data)) throw new Error('Invalid host sessions');
    return data;
  }

  public static async genFetchRemoteBrowserSessionByExecSessionId(
    endpoint: string,
    execSessionId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const allSessions = await this.fetchAllSessionsOnHost(endpoint);
    const browserSession = allSessions
      .filter((session) => session.type === 'browser')
      .find((session) =>
        ((session.launchOptions?.args as string[]) ?? []).includes(this.#getBrowserExecSessionIdArg(execSessionId)),
      );
    if (!browserSession) return null;
    return browserSession;
  }

  public static async genKillSession(endpoint: string, execSessionId: string): Promise<boolean> {
    try {
      const session = await this.genFetchRemoteBrowserSessionByExecSessionId(endpoint, execSessionId);
      if (!session) return true;

      const hostname = new URL(endpoint).hostname;
      const rsp = await fetch(`http://${hostname}:11975/kill-process`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ execSessionId, token: this.#getBrowserlessToken() }),
      });
      if (!rsp.ok) throw new Error('Failed to kill process');
      const data = await rsp.json();
      if (!data.success) throw new Error('Failed to kill process');
      return true;
    } catch (error) {
      ALogger.error({ stack: 'RemoteBrowser', context: 'Failed to kill process', error });
      return false;
    }
  }

  // ==============
  // Private Static
  // ==============
  static async #waitUntilServiceWorkerAvailable(
    endpoint: string,
    execSessionId: string,
  ): Promise<{ browserId: string; extensionId: string }> {
    const rsp = {} as { browserId?: string; extensionId?: string };

    const checkServiceWorkerReadiness = async (): Promise<boolean> => {
      // get the browser id from the browserless host's /sessions endpoint
      const allSessions = await this.fetchAllSessionsOnHost(endpoint);
      const browserId = allSessions
        .filter((session) => session.type === 'browser')
        .find((session) =>
          ((session.launchOptions?.args as string[]) ?? []).includes(this.#getBrowserExecSessionIdArg(execSessionId)),
        )?.id as string;
      if (!browserId) return false;
      rsp.browserId = browserId;

      // fetch extension id
      const extensionSessionInfo = allSessions.find(
        (session) => session.browserId === browserId && session.type === 'service_worker',
      );
      if (!extensionSessionInfo) return false;
      const extensionId = extensionSessionInfo.url.replace('chrome-extension://', '').split('/')[0];
      if (!extensionId || extensionId.length < 1) throw new Error('Invalid extension id: ' + extensionId);
      rsp.extensionId = extensionId;

      return true;
    };
    await WaitUtils.waitUntil(checkServiceWorkerReadiness, {
      timeout: 15_000,
      interval: 200,
      timeoutCallback: () => {
        throw new Error('Service worker target is not available after 15s');
      },
    });

    if (!rsp.browserId || !rsp.extensionId) throw new Error('Service worker target is not available');
    return rsp as { browserId: string; extensionId: string };
  }

  static async #waitUntilServiceWorkerReady(remoteBrowser: RemoteBrowser): Promise<void> {
    const checkServiceWorkerReadiness = async (): Promise<boolean> =>
      await remoteBrowser.genFetchExtensionBroadcastEvent({ type: BroadcastEventType.SERVICE_WORKER_READY });
    await WaitUtils.waitUntil(checkServiceWorkerReadiness, {
      timeout: 30_000,
      interval: 500,
      timeoutCallback: () => {
        throw new Error('Service worker target is not available after 30s');
      },
    });
  }

  static #getBrowserlessToken(): string {
    return process.env.BROWSERLESS_AUTH_TOKEN ?? 'null';
  }

  static #getBrowserExecSessionIdArg(execSessionId: string): string {
    return `--exec-session-id=${execSessionId}`;
  }

  static #buildBrowserArgs(options: RemoteBrowserOptions): string[] {
    const args: string[] = [];

    // Window size
    const defaultViewport = options?.defaultViewport ?? RemoteBrowserConfigs.defaultViewport;
    const initWindowSize = this.#getInitWindowSize(defaultViewport);
    args.push(`--window-size=${initWindowSize.width},${initWindowSize.height}`);

    // Extension
    const loadExtension = options?.loadExtension ?? true;
    if (loadExtension) {
      const extensionPath = '/app/extension';
      args.push(`--disable-extensions-except=${extensionPath}`);
      args.push(`--load-extension=${extensionPath}`);
    }

    // Session ID
    if (options?.execSessionId) args.push(this.#getBrowserExecSessionIdArg(options.execSessionId));

    // Bypass bot detection
    args.push('--disable-blink-features=AutomationControlled');
    return args;
  }

  static #getInitWindowSize(viewport: { width: number; height: number }) {
    return {
      width: viewport.width + RemoteBrowserConfigs.defaultWindowWithhold.width,
      height: viewport.height + RemoteBrowserConfigs.defaultWindowWithhold.height,
    };
  }

  // =========================
  // Public Instance (Getters)
  // =========================
  public get puppeteerBrowser(): Browser {
    return this.#browser;
  }

  public get endpoint(): string {
    return this.#endpoint;
  }

  public get execSessionId(): string {
    return this.#execSessionId;
  }

  public get extensionApiPage(): Page {
    return this.#extensionApiPage;
  }

  public get extensionId(): string {
    return this.#extensionId;
  }

  public get hasLoadedExtension(): boolean {
    return !!this.#extensionId;
  }

  // =========================
  // Public Instance (Actions)
  // =========================
  public async genFetchExtensionBroadcastEvent<T>(eventType: BroadcastEvent): Promise<T> {
    return await this.sendExtensionApiMessage(ExtensionApiMessageType.FETCH_CHROME_SESSION_STORAGE, eventType);
  }

  public async sendRuntimeMessageToExtension(message: RuntimeMessage): Promise<RuntimeMessageResponse> {
    try {
      return await this.sendExtensionApiMessage<RuntimeMessageResponse>(
        ExtensionApiMessageType.SEND_RUNTIME_MESSAGE,
        message,
      );
    } catch (err) {
      ALogger.error({ context: 'Error sending runtime message to extension', error: err });
      return { success: false, error: (err as Error).message };
    }
  }

  public async genSendBroadcastEvent(event: BroadcastEvent, value: unknown): Promise<void> {
    await this.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_SEND,
      payload: { event, value },
    });
  }

  public async sendExtensionApiMessage<T>(type: ExtensionApiMessageType, payload: unknown): Promise<T> {
    if (!this.hasLoadedExtension) throw new Error('Extension not loaded');

    const apiMessage = { type: EXTENSION_API_MESSAGE_KEY, eventType: type, payload, requestId: UUID() };
    const response = await this.extensionApiPage.evaluate(
      async (message) =>
        new Promise((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseHandler = (event: any): void => {
            if (event?.data?.type !== message.requestId) return;
            if (!event.data?.success) reject(event.data?.error);

            window.removeEventListener('message', responseHandler);
            resolve(event.data?.response);
          };
          window.addEventListener('message', responseHandler);
          window.postMessage(message, '*');
        }),
      apiMessage,
    );

    return response as T;
  }

  public getBrowserTargets(): RemoteBrowserTarget[] {
    return this.puppeteerBrowser.targets() as RemoteBrowserTarget[];
  }

  public getServiceWorkerTargetOrThrow(): RemoteBrowserTarget | undefined {
    const targets = this.getBrowserTargets().filter((target) => target.type() === 'service_worker');
    if (targets.length < 1) throw new Error('Service worker target not found');
    if (targets.length > 1) throw new Error('Unexpected multiple service worker targets found');
    return targets[0];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async genFetchAndCacheRemoteBrowserSessionInfo(): Promise<any[]> {
    const allSessions = await RemoteBrowser.fetchAllSessionsOnHost(this.#endpoint);
    const browserlessSessionInfo = allSessions.filter((session) => session.browserId === this.#browserId);
    if (browserlessSessionInfo.length < 1) throw new Error('Session info not found');
    return browserlessSessionInfo;
  }

  // Overrides
  public async newPage(options?: RemoteBrowserNewPageOptions): Promise<Page> {
    const page = await this.puppeteerBrowser.newPage();
    this.genSetupNewPage(page, options);
    return page;
  }

  public async genSetupNewPage(page: Page, options?: RemoteBrowserNewPageOptions): Promise<void> {
    if (options?.viewport) {
      if (options.viewport.width > this.#defaultViewport.width)
        throw new Error('Page width cannot be greater than the default viewport width (which is window size)');
      if (options.viewport.height < this.#defaultViewport.height)
        throw new Error('Page height cannot be less than the default viewport height (which is window size)');

      await page.setViewport({
        ...options.viewport,
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false,
      });
    }

    // Set download behavior for the new page
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_PATH,
    });

    // TODO: fix this to use `remote_browser_cookies` to set cookies domains
    // const url = 'https://github.com';
    // const domain = new URL(url).hostname;
    // const cookies = await supabase
    //   .from('remote_browser_cookies')
    //   .select('cookies')
    //   .eq('domain', domain)
    //   .eq('user_id', user.id);
    // if (!cookies || typeof cookies !== 'object' || !Array.isArray(cookies)) throw new Error('Invalid cookies');
    // await this.#browser.setCookie(...cookies);

    if (options?.gotoUrl) await page.goto(options.gotoUrl);
    ALogger.info({ context: 'New page opened with cookies set', url: page.url() });
  }

  public async close(): Promise<void> {
    ALogger.info({ context: 'Closing remote browser', execSessionId: this.execSessionId });
    await this.sendRuntimeMessageToExtension({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.CLOSE,
    });
    ALogger.info({ context: 'Service worker closed', execSessionId: this.execSessionId });
    await this.puppeteerBrowser.close();
    ALogger.info({ context: 'Remote browser closed', execSessionId: this.execSessionId });
  }

  // ================
  // Private Instance
  // ================
  private constructor(config: {
    browser: Browser;
    browserId: string;
    defaultViewport: { width: number; height: number };
    endpoint: string;
    execSessionId: string;
    extensionApiPage: Page;
    extensionId: string;
  }) {
    this.#browser = config.browser;
    this.#browserId = config.browserId;
    this.#defaultViewport = config.defaultViewport ?? RemoteBrowserConfigs.defaultViewport;
    this.#endpoint = config.endpoint;
    this.#execSessionId = config.execSessionId;
    this.#extensionApiPage = config.extensionApiPage;
    this.#extensionId = config.extensionId;
  }

  readonly #browser: Browser;
  readonly #browserId: string;
  readonly #defaultViewport: { width: number; height: number };
  readonly #endpoint: string;
  readonly #execSessionId: string;
  readonly #extensionApiPage: Page;
  readonly #extensionId: string;
}
