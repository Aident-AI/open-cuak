import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class GetCurrentTab_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.GET_CURRENT_TAB;

  public static description = 'Get current tab.';

  public static requestPayloadSchema = z.any(); // TODO: modify service-message-handler to support more specific type of undefined

  public static responsePayloadSchema = ChromeTabSchema;

  public static async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    _context: IActionConfigExecContext,
    sender: chrome.runtime.MessageSender,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const tab = sender.tab;
    if (!tab) throw new Error('Sender tab not found');
    const tabId = tab.id;
    if (!tabId) throw new Error('Sender tab id not found');
    return { ...tab, id: tabId };
  }
}

enforceBaseActionConfigStatic(GetCurrentTab_ActionConfig);
