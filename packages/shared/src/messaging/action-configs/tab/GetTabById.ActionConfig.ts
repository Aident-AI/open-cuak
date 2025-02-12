import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class GetTabById_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.GET_TAB_BY_ID;

  public static description = 'Get tab by id.';

  public static requestPayloadSchema = z.object({ tabId: z.number() });

  public static responsePayloadSchema = ChromeTabSchema;

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    _context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!chrome.tabs) throw new Error('chrome.tabs is not available');

    const tab = await chrome.tabs.get(payload.tabId);
    if (!tab) throw new Error('Tab not found');
    if (!tab.id) throw new Error('Tab id not found');
    return tab;
  }
}

enforceBaseActionConfigStatic(GetTabById_ActionConfig);
