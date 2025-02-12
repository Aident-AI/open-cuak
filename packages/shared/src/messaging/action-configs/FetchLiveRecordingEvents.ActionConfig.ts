import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RREventWithNanoIdSchema } from '~shared/shadow-mode/RREvent';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class FetchLiveRecordingEvents_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_LIVE_RECORDING_EVENTS;

  public static description = undefined;

  public static requestPayloadSchema = z.object({ cursor: z.string().optional() });

  public static responsePayloadSchema = z.array(RREventWithNanoIdSchema);

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    return context.getRRReplayerWorkerService().getEventsAfterNanoId(payload.cursor);
  }
}

enforceBaseActionConfigStatic(FetchLiveRecordingEvents_ActionConfig);
