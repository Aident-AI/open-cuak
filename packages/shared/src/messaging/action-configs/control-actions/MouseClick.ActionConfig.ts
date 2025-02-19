import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { WaitUtils } from '~shared/utils/WaitUtils';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class MouseClick_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.MOUSE_CLICK;

  public static description = `Click the mouse button.`;

  public static requestPayloadSchema = z.object({
    button: z.enum(['left']).optional().default('left').describe('The mouse button to click.'),
    doubleClick: z.boolean().optional().default(false).describe('Whether to double click.'),
  });

  public static responsePayloadSchema = z.object({ status: z.enum(['clicked', 'double-clicked']) });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const page = its.getPageOrThrow();
    await page.mouse.down({ button: payload.button });
    if (payload.doubleClick) {
      await page.mouse.up({ button: payload.button });
      await page.mouse.down({ button: payload.button });
    }

    const randomWaitTime = Math.floor(Math.random() * 300) + 100;
    await WaitUtils.wait(randomWaitTime);

    await page.mouse.up({ button: payload.button });
    return { status: payload.doubleClick ? 'double-clicked' : 'clicked' };
  }
}

enforceBaseActionConfigStatic(MouseClick_ActionConfig);
