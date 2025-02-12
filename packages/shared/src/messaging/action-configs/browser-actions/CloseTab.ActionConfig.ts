import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class CloseTab_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CLOSE_TAB;

  public static description = undefined;

  public static requestPayloadSchema = z.object({
    tabId: z.number().optional().describe('The target tab to close. If not provided, close the current tab.'),
  });

  public static responsePayloadSchema = z.void();

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!chrome?.tabs) throw new Error('chrome.tabs is not available');

    const targetTab = payload.tabId
      ? await chrome.tabs.get(payload.tabId)
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!targetTab) throw new Error(`No tab found with payload: ${payload}`);
    if (!targetTab.id) throw new Error(`Tab id is not available for tab: ${JSON.stringify(targetTab)}`);

    void (await chrome.tabs.remove(targetTab.id));
  }
}

enforceBaseActionConfigStatic(CloseTab_ActionConfig);
