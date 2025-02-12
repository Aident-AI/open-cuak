import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ShadowModeEventMetaSchema } from '~shared/shadow-mode/ShadowModeEvent';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class FetchShadowEvents_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_SHADOW_EVENTS;

  public static description = 'Fetch Shadow events for the current session.';

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.object({ events: z.array(ShadowModeEventMetaSchema) });

  public static override async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const events = context.getShadowModeService().getEvents();
    return { events: events.map((e) => e.data) };
  }
}

enforceBaseActionConfigStatic(FetchShadowEvents_ActionConfig);
