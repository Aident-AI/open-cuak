import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class StopShadowMode_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.STOP_SHADOW_MODE;

  public static description = 'Stop Shadow Mode.';

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.void();

  public static override async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    await context.getShadowModeService().stopShadowMode();
  }
}

enforceBaseActionConfigStatic(StopShadowMode_ActionConfig);
