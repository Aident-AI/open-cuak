import { round } from 'lodash';
import { z } from 'zod';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { MouseMove_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseMove.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition } from '~shared/portal/RemoteBrowserTypes';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class PortalMouseControl_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.PORTAL_MOUSE_CONTROL;

  public static description = `Move the mouse by a specified distance from its current position like human using mouse.`;

  public static requestPayloadSchema = z.object({
    deltaX: z
      .number()
      .optional()
      .describe(
        'The distance to move the mouse in pixels for the X axis. Positive values move the mouse to the right, negative values move the mouse to the left.',
      ),
    deltaY: z
      .number()
      .optional()
      .describe(
        'The distance to move the mouse in pixels for the Y axis. Positive values move the mouse down, negative values move the mouse up.',
      ),
  });

  public static responsePayloadSchema = z.object({ status: z.enum(['moved', 'failed']) });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const tabId = its.getActiveTab().id;
    const mousePositionBroadcastEvent = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };
    const origin = await context.getBroadcastService().fetch<RemoteCursorPosition>(mousePositionBroadcastEvent);
    if (!origin) throw new Error('Failed to get current mouse position');

    const position = { x: round(origin.x + (payload.deltaX ?? 0), 2), y: round(origin.y + (payload.deltaY ?? 0), 2) };
    const result = await MouseMove_ActionConfig.exec(position, context);
    if (!result) return { status: 'failed' };
    return { status: 'moved' };
  }
}

enforceBaseActionConfigStatic(PortalMouseControl_ActionConfig);
