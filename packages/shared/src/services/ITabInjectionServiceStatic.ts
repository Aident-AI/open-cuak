import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { IBaseServiceStatic } from '~shared/services/IBaseServiceStatic';

export interface ITabInjectionServiceStatic extends IBaseServiceStatic {
  updateStatus(status: TabLifecycleStatus): Promise<void>;
  getCurrentTabId(): number;
  getStatus(): TabLifecycleStatus;
  fetchStatusForTab(tabId?: number): Promise<TabLifecycleStatus>;
  subscribeStatus(callback: (status: TabLifecycleStatus) => void | Promise<void>): void;
}
