import { BroadcastEvent, BroadcastEventType } from '~shared/broadcast/types';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ITabInjectionServiceStatic } from '~shared/services/ITabInjectionServiceStatic';
import { enforceStatic } from '~shared/utils/EnforceStatic';
import { BroadcastService } from '~src/common/services/BroadcastService';

export class TabLifecycleInjectionService {
  public static async start(): Promise<void> {
    throw new Error('TabLifecycleInjectionService does not support start in service worker');
  }

  public static async inject(): Promise<void> {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_CURRENT_TAB,
    });
    if (!rsp || !rsp.success) throw new Error('Failed to get current tab');
    if (!rsp.data?.id) throw new Error('Invalid tab');
    this.#instance = new TabLifecycleInjectionService(rsp.data.id);
  }

  public static get instance(): TabLifecycleInjectionService {
    if (!this.#instance) throw new Error('TabLifecycleInjectionService not injected');
    return this.#instance;
  }

  public static async updateStatus(status: TabLifecycleStatus): Promise<void> {
    if (this.instance.#status === status) return;

    this.instance.#status = status;
    await BroadcastService.send(this.getBroadcastEvent(), status);
  }

  public static getCurrentTabId(): number {
    return this.instance.#currentTabId;
  }

  public static getStatus(): TabLifecycleStatus {
    return this.instance.#status;
  }

  public static async fetchStatusForTab(tabId?: number): Promise<TabLifecycleStatus> {
    const status = await BroadcastService.fetch<TabLifecycleStatus>(this.getBroadcastEvent(tabId));
    if (!status) return TabLifecycleStatus.UNLOADED;
    return status;
  }

  public static subscribeStatus(callback: (status: TabLifecycleStatus) => void): void {
    this.instance.#statusCallbacks.push(callback);
  }

  public static getBroadcastEvent(tabId?: number): BroadcastEvent {
    return { type: this.broadcastType, identifier: tabId ?? this.instance.#currentTabId };
  }

  static readonly broadcastType = BroadcastEventType.TAB_INJECTION_STATUS;

  static #instance: TabLifecycleInjectionService;

  private constructor(tabId: number) {
    this.#currentTabId = tabId;

    BroadcastService.subscribe<TabLifecycleStatus>(
      TabLifecycleInjectionService.getBroadcastEvent(tabId),
      async (value) => {
        if (!value) throw new Error('Invalid tab injection status');
        this.#status = value;

        const callbacks = this.#statusCallbacks.map((cb) => async () => await cb(this.#status));
        await Promise.all(callbacks.map(async (fn) => await fn()));
      },
    );
  }

  readonly #currentTabId: number;
  #status: TabLifecycleStatus = TabLifecycleStatus.UNLOADED;
  #statusCallbacks: ((status: TabLifecycleStatus) => void | Promise<void>)[] = [];
}

enforceStatic<ITabInjectionServiceStatic>(TabLifecycleInjectionService);
