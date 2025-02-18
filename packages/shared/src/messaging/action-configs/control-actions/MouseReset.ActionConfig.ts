import { stripIndents } from 'common-tags';
import { round } from 'lodash';
import { z } from 'zod';
import { BroadcastEvent } from '~shared/broadcast/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { genSetMousePosition } from '~shared/messaging/action-configs/control-actions/MouseMove.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition, RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';
import { RemoteBrowserConfigs } from '~shared/remote-browser/RemoteBrowserConfigs';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export const genResetMouseAtPageCenterArea = async (
  context: IActionConfigExecContext,
  sendBroadcastEvent: <T>(event: BroadcastEvent, value?: T) => Promise<void>,
  tabId: number,
): Promise<RemoteCursorPosition> => {
  const getRandomInMiddle = (total: number) => round(total / 4 + (Math.random() * total) / 2, 2);
  const x = getRandomInMiddle(RemoteBrowserConfigs.defaultViewport.width);
  const y = getRandomInMiddle(RemoteBrowserConfigs.defaultViewport.height);
  return await genSetMousePosition(context, sendBroadcastEvent, { x, y }, tabId);
};

export class MouseReset_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.MOUSE_RESET;

  public static description = `Reset the mouse to be around the center area of the page (cancelling held clicks as well).`;

  // TODO: update `BaseEndpointApiSpec.getFunctionCallDefinition` to support empty request payload
  public static requestPayloadSchema = z.object({}).describe(
    stripIndents(`
      Reset the mouse pointer to be around the center area of the page. Use this if you cannot find the mouse pointer, so that you
      can find it around the center of the page.
    `),
  );

  public static responsePayloadSchema = z.object({ success: z.boolean(), position: RemoteCursorPositionSchema });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const tabId = its.getActiveTab().id;
    const sendBroadcastEvent = context.getBroadcastService().send;

    await its.getPageOrThrow().mouse.reset();
    const position = await genResetMouseAtPageCenterArea(context, sendBroadcastEvent, tabId);
    return { success: true, position };
  }
}

enforceBaseActionConfigStatic(MouseReset_ActionConfig);
