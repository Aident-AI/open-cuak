import { CDPSession, Page } from 'puppeteer-core';
import { isChromeInternalPageTab } from '~shared/chrome/Tab';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ContentInjectionMessageAction } from '~shared/messaging/content-injection/types';
import { ServiceWorkerMessageSchema } from '~shared/messaging/service-worker/types';
import { PuppeteerEmptyPageReason } from '~shared/puppeteer/types';
import { enforceStatic } from '~shared/utils/EnforceStatic';
import { EnumUtils } from '~shared/utils/EnumUtils';
import { ErrorTransformation } from '~shared/utils/ErrorTransformation';
import { WaitUtilConfig, WaitUtils } from '~shared/utils/WaitUtils';
import {
  AssertAttachedInteractable,
  AvailableInInterpreter,
  AvailableInInterpreterWithOriginalName,
} from '~src/common/decorators';
import { Interactable } from '~src/common/interactable/Interactable';
import { ManagedTab } from '~src/common/puppeteer/ManagedTab';
import { ManagedWindow } from '~src/common/puppeteer/ManagedWindow';
import { TransportManager } from '~src/common/puppeteer/override/transport/TransportManager';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { ServiceWorkerMessageHandler } from '~src/scripts/service-worker/message/ServiceWorkerMessageHandler';

import type { serializedNodeWithId } from 'rrweb-snapshot/typings/types';
import type { ChromeTab } from '~shared/chrome/Tab';
import type { IInteractable } from '~shared/interactable/IInteractable';
import type { IInteractableServiceStatic } from '~shared/interactable/IInteractableServiceStatic';
import type { ServiceWorkerMessage } from '~shared/messaging/service-worker/types';
import type { PuppeteerPageCreationResult } from '~shared/puppeteer/types';

@AvailableInInterpreterWithOriginalName('InteractableService')
export class InteractableService {
  // ================================================================================================================
  // Public Static
  // ================================================================================================================

  public static async start(): Promise<void> {
    if (this._instance) return;

    this._instance = new InteractableService();

    ActiveTabService.subscribe(async (activeTab: ChromeTab) => {
      if (!InteractableService.isAttached() || activeTab.status !== 'complete') return;
      if (!ManagedWindow.isManagedWindowId(activeTab.windowId)) return;

      await InteractableService.createInteractableForActiveTabOrThrow();
    });
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static async createInteractableForActiveTabOrThrow(): Promise<PuppeteerPageCreationResult> {
    if (!this.isInteractableReady()) ALogger.warn({ context: 'page is not ready, should skip, but noop for now.' });

    this._getInstance().#ready = false;

    try {
      const tab = this.getActiveTab();
      if (!tab) throw new Error('invalid tab');
      if (this.activeTabIsChromePage()) {
        ALogger.warn('Tab is chrome internal page, skip');
        throw new Error(PuppeteerEmptyPageReason.CHROME_INTERNAL_PAGE);
      }

      const managedTab = await ManagedTab.fetchForTab(tab);
      const interactable = await this.fetchInteractable();
      this._getInstance().#update(managedTab, interactable);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const reason =
        EnumUtils.getEnumValue(PuppeteerEmptyPageReason, errorMessage) ??
        (errorMessage?.includes('Receiving end does not exist')
          ? PuppeteerEmptyPageReason.RECEIVING_END_NOT_EXISTING
          : PuppeteerEmptyPageReason.UNKNOWN_ERROR);
      if (reason !== PuppeteerEmptyPageReason.CHROME_INTERNAL_PAGE) {
        const e = ErrorTransformation.convertErrorToObject(error as Error);
        ALogger.error({ context: 'Failed to create interactable for active tab', error: e });
      }
      this._getInstance().#reset(reason);
    }

    this._getInstance().#ready = true;
    return this.getPageCreationResult();
  }

  @AvailableInInterpreter
  public static async buildFromSnapshot(snapshot: serializedNodeWithId): Promise<IInteractable.Dom> {
    return await Interactable.Dom.createForDummy(snapshot);
  }

  @AvailableInInterpreter
  public static async fetchSnapshot(): Promise<serializedNodeWithId> {
    const action = ContentInjectionMessageAction.RRWEB_FETCH_SNAPSHOT;
    const rsp = await sendRuntimeMessage({ receiver: RuntimeMessageReceiver.CONTENT_INJECTION, action });
    if (!rsp || !rsp.success) throw rsp?.error ?? new Error('Failed to fetch snapshot');

    return rsp.data.snapshot;
  }

  @AvailableInInterpreter
  public static async fetchInteractable(): Promise<Interactable.Dom> {
    const snapshot = await this.fetchSnapshot();
    return await Interactable.Dom.createForActiveTab(snapshot);
  }

  @AvailableInInterpreter
  public static async attach(): Promise<void> {
    if (this.isAttached()) return;

    await TransportManager.attach();
    await this.createInteractableForActiveTabOrThrow();
  }

  @AvailableInInterpreter
  public static async detach(): Promise<void> {
    if (!this.isAttached()) return;

    await TransportManager.detach();
    this._getInstance().#reset(PuppeteerEmptyPageReason.PAGE_DESTROYED);
  }

  @AvailableInInterpreter
  public static isAttached(): boolean {
    return TransportManager.isAttached();
  }

  @AvailableInInterpreter
  public static async refresh(): Promise<void> {
    if (!this.isAttached()) await this.attach();
    if (!this.isInteractableReady()) {
      ALogger.warn('page is not ready, skip');
      return;
    }

    this._getInstance().#ready = false;
    await this.getInteractableOrThrow().refresh();
    this._getInstance().#ready = true;
  }

  @AvailableInInterpreter
  public static async sendCdpCommand(method: string, params?: unknown) {
    if (!this.isAttached()) await this.attach();

    const session = this.getCdpSessionOrThrow();
    if (!session) throw new Error('cdp session not found');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await session.send(method as any, params); // TODO: not sure how to type Commands here. figure it out later
  }

  @AvailableInInterpreter
  public static async sendServiceWorkerMessage(message: ServiceWorkerMessage) {
    // TODO: debug why `sendRuntimeMessage` does not work in interpreter. now, hack it to call ServiceWorkerMessageHandler directly
    const m = ServiceWorkerMessageSchema.parse(message);
    const response = await ServiceWorkerMessageHandler.processMessage(m);
    if (!response || !response.success) {
      ALogger.error({ context: 'Failed to send runtime message', message, response });
      throw response?.error ?? new Error('Failed to send runtime message');
    }
    return response.data;
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static isInteractableReady(): boolean {
    return this._getInstance().#ready;
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getInteractableOrThrow(): Interactable.Dom {
    const emptyReason = this.getEmptyPageReason();
    if (emptyReason) throw new Error(emptyReason);

    const it = this._getInstance().#interactable;
    if (!it) throw new Error('invalid state - `Interactable.Page` not found while no empty page reason');
    return it;
  }

  public static async waitUntilInteractableReady(config?: WaitUtilConfig): Promise<void> {
    await WaitUtils.waitUntil(
      () => this.isInteractableReady(),
      config ?? {
        timeout: 5_000,
        interval: 200,
        timeoutCallback: () => {
          throw new Error('Interactable service is not ready after timeout');
        },
      },
    );
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getPageOrThrow(): Page {
    const managedTab = this._getInstance().#managedTab;
    if (managedTab) return managedTab.get() as unknown as Page;
    const emptyReason = this.getEmptyPageReason();
    if (emptyReason) throw new Error(emptyReason);
    throw new Error('invalid state - `Page` not found while no empty page reason');
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getCdpSessionOrThrow(): CDPSession {
    const session = this._getInstance().#managedTab?.getCdpSession();
    if (session) return session;
    ALogger.error('getCdpSessionOrThrow - CDPSession not found');
    throw new Error('invalid state - CDPSession not found');
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getEmptyPageReason(): PuppeteerEmptyPageReason | null {
    return this._getInstance().#emptyPageReason;
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getActiveTab(): ChromeTab {
    return ActiveTabService.getInServiceWorker();
  }

  @AvailableInInterpreter
  @AssertAttachedInteractable
  public static getPageCreationResult(): PuppeteerPageCreationResult {
    const tab = this.getActiveTab();
    const emptyReason = this.getEmptyPageReason();
    if (emptyReason) return { success: false, reason: emptyReason, tab };
    if (!this._getInstance().#interactable)
      throw new Error('invalid state - interactable not found while no empty page reason');
    const managedTab = this._getInstance().#managedTab;
    if (!managedTab) throw new Error('invalid state - chrome page not found while no empty page reason');

    return {
      success: true,
      page: managedTab.get() as unknown as Page,
      session: managedTab.getCdpSession(),
      interactable: this.getInteractableOrThrow(),
      tab,
    };
  }

  @AvailableInInterpreter
  public static activeTabIsChromePage(): boolean {
    return isChromeInternalPageTab(this.getActiveTab());
  }

  // ================================================================================================================
  // Private Static
  // ================================================================================================================

  private static _getInstance(): InteractableService {
    if (!this._instance) throw new Error('InteractableService is not initialized');
    return this._instance;
  }

  private static _instance: InteractableService;

  // ================================================================================================================
  // Private Instance
  // ================================================================================================================

  private constructor() {}

  #ready = false;
  #emptyPageReason: PuppeteerEmptyPageReason | null = null;
  #interactable: Interactable.Dom | null = null;
  #managedTab: ManagedTab | null = null;

  #update(tab: ManagedTab, interactable: Interactable.Dom) {
    this.#managedTab = tab;
    this.#emptyPageReason = null;
    this.#interactable = interactable;
  }

  #reset(reason: PuppeteerEmptyPageReason = PuppeteerEmptyPageReason.UNKNOWN_ERROR) {
    this.#managedTab = null;
    this.#emptyPageReason = reason;
    this.#interactable = null;
  }
}

enforceStatic<IInteractableServiceStatic>(InteractableService);
