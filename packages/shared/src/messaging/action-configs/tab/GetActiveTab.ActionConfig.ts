import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class GetActiveTab_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.GET_ACTIVE_TAB;

  public static description = 'Get active tab.';

  public static requestPayloadSchema = z.any(); // TODO: modify service-message-handler to support more specific type of undefined

  public static responsePayloadSchema = ChromeTabSchema;

  public static async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    return context.getActiveTab();
  }
}

enforceBaseActionConfigStatic(GetActiveTab_ActionConfig);
