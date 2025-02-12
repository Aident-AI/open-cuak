import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { FetchBackendNodeIdForDomTree_ActionConfig } from '~shared/messaging/action-configs/FetchBackendNodeIdForDomTree.ActionConfig';
import { IActiveTabLifecycleServiceStatic } from '~shared/services/IActiveTabLifecycleServiceStatic';
import { enforceStatic } from '~shared/utils/EnforceStatic';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { TabLifecycleInjectionService } from '~src/common/services/tab/TabLifecycleInjectionService';

export class ActiveTabLifecycleWorkerService {
  public static async start(): Promise<void> {
    this.#instance = new ActiveTabLifecycleWorkerServiceInstance();
  }

  public static async inject(): Promise<void> {
    throw new Error('ActiveTabLifecycleWorkerService does not support inject in content script');
  }

  public static get instance(): ActiveTabLifecycleWorkerServiceInstance {
    if (!this.#instance) throw new Error('ActiveTabLifecycleWorkerService not started');
    return this.#instance;
  }

  public static getStatus(): TabLifecycleStatus {
    return this.instance.status;
  }

  public static onStatusUpdate(callback: (status: TabLifecycleStatus) => void): void {
    this.instance.addStatusOnUpdateCallback(callback);
  }

  public static waitUntilStatus(status: TabLifecycleStatus, callback: () => void | Promise<void>): void {
    this.instance.addWaitUntilStatusTrigger(status, callback);
  }

  public static async updateStatus(status: TabLifecycleStatus): Promise<void> {
    await BroadcastService.send(TabLifecycleInjectionService.getBroadcastEvent(this.instance.tabId), status);
  }

  static #instance: ActiveTabLifecycleWorkerServiceInstance | null = null;
}

// TODO: remove this as we have migrated to live recorder based on rrweb
class ActiveTabLifecycleWorkerServiceInstance {
  constructor() {
    this.#tabId = ActiveTabService.getInServiceWorker().id;

    ActiveTabService.subscribe(async (tab) => {
      this.#tabId = tab.id;
      this.#status = await TabLifecycleInjectionService.fetchStatusForTab(this.#tabId);
      FetchBackendNodeIdForDomTree_ActionConfig.resetRunningStatus();
    });
    BroadcastService.subscribeType<TabLifecycleStatus>(
      TabLifecycleInjectionService.broadcastType,
      async (identifier, value) => {
        if (Number(identifier) !== this.#tabId) return;
        if (!value) throw new Error('Invalid tab injection status');

        this.#status = value;
        const callbacks = this.#statusOnUpdateCallbacks.map((cb) => async () => await cb(this.#status));
        const triggers = (this.#waitUntilStatusTriggers.get(this.#status) ?? []).map((cb) => async () => await cb());
        this.#waitUntilStatusTriggers.delete(this.#status);
        await Promise.all([...callbacks, ...triggers].map((fn) => fn()));
      },
    );
  }

  public get tabId(): number {
    return this.#tabId;
  }

  public get status(): TabLifecycleStatus {
    return this.#status;
  }

  public addStatusOnUpdateCallback(callback: (status: TabLifecycleStatus) => void | Promise<void>): void {
    this.#statusOnUpdateCallbacks.push(callback);
  }

  public addWaitUntilStatusTrigger(status: TabLifecycleStatus, callback: () => void | Promise<void>): void {
    if (!this.#waitUntilStatusTriggers.has(status)) this.#waitUntilStatusTriggers.set(status, []);
    this.#waitUntilStatusTriggers.get(status)!.push(callback);
  }

  #tabId: number;
  #status: TabLifecycleStatus = TabLifecycleStatus.UNLOADED;
  #statusOnUpdateCallbacks: ((status: TabLifecycleStatus) => void | Promise<void>)[] = [];
  #waitUntilStatusTriggers: Map<TabLifecycleStatus, (() => void | Promise<void>)[]> = new Map();
}

enforceStatic<IActiveTabLifecycleServiceStatic>(ActiveTabLifecycleWorkerService);
