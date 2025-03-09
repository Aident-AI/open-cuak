import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import {
  MouseClick_ActionConfig,
  genBroadcastMouseClickEvent,
} from '~shared/messaging/action-configs/control-actions/MouseClick.ActionConfig';
import { genSetMousePosition } from '~shared/messaging/action-configs/control-actions/MouseMove.ActionConfig';
import { genMouseCurrentPositionOrThrow } from '~shared/messaging/action-configs/portal-actions/PortalMouseControl.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class MouseDrag_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.MOUSE_DRAG;

  public static description = `Drag the mouse from current position to a new position.`;

  public static requestPayloadSchema = z.object({
    x: z.number().describe('The x position to drag to.'),
    y: z.number().describe('The y position to drag to.'),

    button: z.enum(['left']).optional().default('left').describe('The mouse button to click.'), // TODO: support right click
  });

  public static responsePayloadSchema = z.object({ status: z.enum(['dropped']) });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const mouse = its.getPageOrThrow().mouse;
    const tabId = its.getActiveTab().id;
    const sendBroadcastEvent = context.getBroadcastService().send;
    const genMoveMouse = (target: { x: number; y: number }) =>
      genSetMousePosition(context, sendBroadcastEvent, target, tabId);
    const genMouseClick = async (event: 'mousedown' | 'mouseup') =>
      await Promise.all([
        (event === 'mousedown' ? mouse.down : mouse.up)({ button: payload.button }),
        async () => {
          const position = await genMouseCurrentPositionOrThrow(context);
          await genBroadcastMouseClickEvent(context, sendBroadcastEvent, position, event, tabId);
        },
      ]);

    await genMouseClick('mousedown');
    await genMoveMouse({ x: payload.x, y: payload.y });
    await genMouseClick('mouseup');

    return { status: 'dropped' };
  }
}

enforceBaseActionConfigStatic(MouseClick_ActionConfig);
