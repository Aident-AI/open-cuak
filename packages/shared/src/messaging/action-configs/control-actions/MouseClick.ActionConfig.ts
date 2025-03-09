import { z } from 'zod';
import { BroadcastEvent, BroadcastEventType } from '~shared/broadcast/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { genMouseCurrentPositionOrThrow } from '~shared/messaging/action-configs/portal-actions/PortalMouseControl.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition, RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';
import { WaitUtils } from '~shared/utils/WaitUtils';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export const genBroadcastMouseClickEvent = async (
  context: IActionConfigExecContext,
  sendBroadcastEvent: <T>(event: BroadcastEvent, value?: T) => Promise<void>,
  position: { x: number; y: number },
  event: 'mousedown' | 'mouseup',
  tabId: number,
): Promise<RemoteCursorPosition> => {
  const cdp = context.getInteractableService().getCdpSessionOrThrow();
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

  const eventPayload = { x: position.x, y: position.y, cursor, ts: Date.now(), tabId, event };
  const cursorPosition = RemoteCursorPositionSchema.parse(eventPayload);

  const mousePositionBroadcastEvent = { type: BroadcastEventType.MOUSE_POSITION_UPDATED };
  await sendBroadcastEvent(mousePositionBroadcastEvent, cursorPosition);

  return cursorPosition;
};

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
    const tabId = context.getInteractableService().getActiveTab().id;
    const sendBroadcastEvent = context.getBroadcastService().send;
    const genSendClickEvent = async (event: 'mousedown' | 'mouseup') => {
      const position = await genMouseCurrentPositionOrThrow(context);
      await genBroadcastMouseClickEvent(context, sendBroadcastEvent, position, event, tabId);
    };
    const genMouseClick = async (event: 'mousedown' | 'mouseup') =>
      await Promise.all([
        event === 'mousedown' ? page.mouse.down({ button: payload.button }) : page.mouse.up({ button: payload.button }),
        genSendClickEvent(event),
      ]);

    await genMouseClick('mousedown');
    if (payload.doubleClick) {
      await genMouseClick('mouseup');
      await genMouseClick('mousedown');
    }

    const randomWaitTime = Math.floor(Math.random() * 300) + 100;
    await WaitUtils.wait(randomWaitTime);

    await genMouseClick('mouseup');
    return { status: payload.doubleClick ? 'double-clicked' : 'clicked' };
  }
}

enforceBaseActionConfigStatic(MouseClick_ActionConfig);
