import { z } from 'zod';
import { BroadcastEvent, BroadcastEventType } from '~shared/broadcast/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition, RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export const genSetMousePosition = async (
  context: IActionConfigExecContext,
  sendBroadcastEvent: <T>(event: BroadcastEvent, value?: T) => Promise<void>,
  position: { x: number; y: number },
  tabId: number,
): Promise<RemoteCursorPosition> => {
  const its = context.getInteractableService();
  const page = its.getPageOrThrow();
  const cdp = its.getCdpSessionOrThrow();

  // TODO: make page's mouse-move call and event broadcasting parallel
  await page.mouse.move(position.x, position.y);

  const { result } = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(position) {
        const hoveredElement = document.elementFromPoint(position.x, position.y);
        if (!hoveredElement) return 'default';
        return window.getComputedStyle(hoveredElement).cursor;
      })(${JSON.stringify(position)})
    `,
    returnByValue: true, // Ensures the result is returned as JSON
  });
  const cursor = result.value as string;
  if (!cursor) throw new Error('Failed to get cursor style');

  const eventPayload = { x: position.x, y: position.y, cursor, ts: Date.now(), tabId, event: 'mousemove' };
  const cursorPosition = RemoteCursorPositionSchema.parse(eventPayload);

  const mousePositionBroadcastEvent = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };
  await sendBroadcastEvent(mousePositionBroadcastEvent, cursorPosition);

  return cursorPosition;
};

export class MouseMove_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.MOUSE_MOVE;

  public static description = `Move the mouse to a target position (x, y) relative to the top-left of the screen to simulate human interaction.`;

  public static requestPayloadSchema = z.object({
    x: z.number().describe('Target x-coordinate (default 0).').optional().default(0),
    y: z.number().describe('Target y-coordinate (default 0).').optional().default(0),
  });

  public static responsePayloadSchema = z.object({ status: z.literal('moved') });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const tabId = context.getInteractableService().getActiveTab().id;
    const sendBroadcastEvent = context.getBroadcastService().send;
    await genSetMousePosition(context, sendBroadcastEvent, payload, tabId);
    return { status: 'moved' };
  }
}

enforceBaseActionConfigStatic(MouseMove_ActionConfig);
