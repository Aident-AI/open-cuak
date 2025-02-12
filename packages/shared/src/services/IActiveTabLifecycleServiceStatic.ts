import { type TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { IBaseServiceStatic } from '~shared/services/IBaseServiceStatic';

export interface IActiveTabLifecycleServiceStatic extends IBaseServiceStatic {
  getStatus(): TabLifecycleStatus;
  onStatusUpdate(callback: (status: TabLifecycleStatus) => void): void;
  waitUntilStatus(status: TabLifecycleStatus, callback: () => void | Promise<void>): void;
  updateStatus(status: TabLifecycleStatus): Promise<void>;
}
