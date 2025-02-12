import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Type_Interaction } from '~shared/interactable/interactions/Type.Interaction';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class KeyboardType_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.KEYBOARD_TYPE;

  public static description = `Use keyboard to type letters or special keys to the active page.`;

  public static requestPayloadSchema = Type_Interaction.configSchema;

  public static responsePayloadSchema = z.object({ status: z.literal('typed') });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const page = its.getPageOrThrow();
    await page.keyboard.type(payload.text, { delay: payload.delay });
    return { status: 'typed' };
  }
}

enforceBaseActionConfigStatic(KeyboardType_ActionConfig);
