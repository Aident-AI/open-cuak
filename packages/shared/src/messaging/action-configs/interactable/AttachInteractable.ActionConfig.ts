import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class AttachInteractable_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.ATTACH_INTERACTABLE;

  public static description = 'Attach to interactable service.';

  public static requestPayloadSchema = z.any(); // TODO: make this to be z.undefined() if no payload is needed

  public static responsePayloadSchema = z.void();

  public static override async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    await context.getInteractableService().attach();
  }
}

enforceBaseActionConfigStatic(AttachInteractable_ActionConfig);
