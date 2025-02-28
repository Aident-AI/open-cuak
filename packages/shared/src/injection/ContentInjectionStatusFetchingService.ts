import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { EnumUtils } from '~shared/utils/EnumUtils';
import { WaitUtilConfig, WaitUtils } from '~shared/utils/WaitUtils';

export const CONTENT_INJECTION_STATUS_LABEL_ID = 'content-injection-status-label';

export class ContentInjectionStatusFetchingService {
  public static async fetch(tabId: number): Promise<TabLifecycleStatus> {
    if (!chrome?.scripting) throw new Error('chrome.scripting is not available');
    if (!tabId) throw new Error('Invalid tab id');

    return new Promise((resolve) =>
      chrome.scripting
        .executeScript({
          target: { tabId },
          func: (id: string) => {
            const divContent = document.querySelector('#' + id);
            return (divContent as HTMLDivElement)?.innerText;
          },
          args: [CONTENT_INJECTION_STATUS_LABEL_ID],
        })
        .then((results) => {
          const statusValue = EnumUtils.getEnumValue(TabLifecycleStatus, results[0].result);
          resolve(statusValue || TabLifecycleStatus.UNLOADED);
        }),
    );
  }

  public static async waitUntilStatus(
    tabId: number,
    targetStatus: TabLifecycleStatus,
    waitUntilConfig?: WaitUtilConfig,
  ): Promise<void> {
    await WaitUtils.waitUntil(
      async () => {
        const status = await this.fetch(tabId);
        return status === targetStatus;
      },
      waitUntilConfig ?? {
        timeout: 5_000,
        interval: 200,
        timeoutCallback: () => {
          throw new Error('Timeout waiting for status');
        },
      },
    );
  }
}
