import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class CheckCurrentTabIsActive_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CHECK_CURRENT_TAB_IS_ACTIVE;

  public static description = 'Check whether current tab is active.';

  public static requestPayloadSchema = z.any(); // TODO: modify service-message-handler to support more specific type of undefined

  public static responsePayloadSchema = z.boolean();

  public static async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
    sender: chrome.runtime.MessageSender,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const senderTab = sender.tab;
    if (!senderTab || !senderTab.id) throw new Error('Sender tab is not available');
    const activeTab = context.getActiveTab();
    if (!activeTab || !activeTab.id) throw new Error('Active tab is not available');

    return senderTab.id === activeTab.id;
  }
}

enforceBaseActionConfigStatic(CheckCurrentTabIsActive_ActionConfig);
