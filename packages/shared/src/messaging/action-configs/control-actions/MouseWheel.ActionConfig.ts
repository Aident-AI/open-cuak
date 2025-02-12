import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class MouseWheel_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.MOUSE_WHEEL;

  public static description = `Scroll the mouse wheel.`;

  public static requestPayloadSchema = z.object({
    deltaX: z.number().optional().default(0).describe('The horizontal scroll amount.'),
    deltaY: z.number().optional().default(0).describe('The vertical scroll amount.'),
  });

  public static responsePayloadSchema = z.object({ status: z.literal('scrolled') });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const page = its.getPageOrThrow();
    await page.mouse.wheel({ deltaX: payload.deltaX, deltaY: payload.deltaY });
    return { status: 'scrolled' };
  }
}

enforceBaseActionConfigStatic(MouseWheel_ActionConfig);
