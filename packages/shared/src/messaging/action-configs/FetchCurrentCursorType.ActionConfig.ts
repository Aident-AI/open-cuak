import { z } from 'zod';
import { BroadcastEventType } from '~shared/broadcast/types';
import { XYPositionSchema } from '~shared/cursor/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { genResetMouseAtPageCenterArea } from '~shared/messaging/action-configs/control-actions/MouseReset.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition } from '~shared/portal/RemoteBrowserTypes';
import { SupportedRemoteCursorTypes } from '~shared/remote-browser/RemoteCursor';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class FetchCurrentCursorType_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CURRENT_CURSOR_TYPE;

  public static description = 'Fetch the current cursor style.';

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.object({ type: z.string(), position: XYPositionSchema });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const sendBroadcastEvent = context.getBroadcastService().send;
    const tabId = context.getActiveTab().id;
    let mousePosition = await context.getBroadcastService().fetch<RemoteCursorPosition>({
      type: BroadcastEventType.MOUSE_POSITION_UPDATED,
      identifier: tabId,
    });
    if (!mousePosition) mousePosition = await genResetMouseAtPageCenterArea(context, sendBroadcastEvent, tabId);
    const type = SupportedRemoteCursorTypes.has(mousePosition.cursor) ? mousePosition.cursor : 'default';
    return { type, position: { x: mousePosition.x, y: mousePosition.y } };
  }
}

enforceBaseActionConfigStatic(FetchCurrentCursorType_ActionConfig);
