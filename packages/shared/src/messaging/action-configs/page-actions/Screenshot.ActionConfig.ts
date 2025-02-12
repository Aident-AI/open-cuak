import { oneLine } from 'common-tags';
import { round } from 'lodash';
import { z } from 'zod';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { getHost } from '~shared/env/environment';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { genResetMouseAtPageCenterArea } from '~shared/messaging/action-configs/control-actions/MouseReset.ActionConfig';
import { addCross } from '~shared/messaging/action-configs/page-actions/addCross.js';
import { drawInteractableBoundingBoxes } from '~shared/messaging/action-configs/page-actions/boudingbox.js';
import { TargetNodeIdSchema } from '~shared/messaging/action-configs/page-actions/mixins';
import { PageScreenshotAction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition } from '~shared/portal/RemoteBrowserTypes';
import { SupportedRemoteCursorTypes } from '~shared/remote-browser/RemoteCursor';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export type BoundingBoxInfo = {
  labelCounter: number;
  identifier: string;
  x: number;
  y: number;
};

export class Screenshot_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.SCREENSHOT;

  public static description = `Take a screenshot on the page.`;

  public static requestPayloadSchema = z.object({
    action: z.nativeEnum(PageScreenshotAction),
    config: z
      .object({
        targetNodeId: TargetNodeIdSchema.optional(),
        fullPage: z.boolean().optional().default(false).describe(oneLine`
          Whether to take a screenshot for the full page. Default to false.
        `),
        path: z.string().optional().describe(oneLine`
          The file path to save the screenshot to. The screenshot type will be inferred from the file extension. If path
          is a relative path, then it is resolved relative to current working directory. If no path is provided, the image
          won't be saved to the disk.
        `),
        withCursor: z.boolean().optional().default(false).describe(oneLine`
          Whether to overlay the cursor on the screenshot. Default to false.
        `),
        useBoundingBoxOverlay: z.boolean().optional().default(false).describe(oneLine`
          Whether to overlay the bounding boxes on the screenshot. Default to false.
        `),
        useBoundingBoxCoordinates: z.boolean().optional().default(false).describe(oneLine`
          Whether to return the bounding box coordinates. Default to false.
        `),
        useCross: z.boolean().optional().default(false).describe(oneLine`
          Whether to overlay the cross on the screenshot. Default to false.
        `),
      })
      .optional(),
  });

  public static responsePayloadSchema = z.object({
    base64: z
      .string()
      .optional()
      .describe(oneLine`The base64 encoded screenshot.`),
    boundingBoxCoordinates: z
      .string()
      .optional()
      .describe(oneLine`The bounding box coordinates.`),
  });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const page = its.getPageOrThrow();
    const sendBroadcastEvent = context.getBroadcastService().send;

    const { action, config } = payload;
    let screenshot: Buffer | null = null;
    let boundingBoxCoordinates: BoundingBoxInfo[] = [];
    switch (action) {
      case PageScreenshotAction.PDF:
        screenshot = Buffer.from(await page.pdf({ path: config?.path }));
        break;
      case PageScreenshotAction.SCREENSHOT: {
        const { targetNodeId, ...options } = config ?? {};
        if (!targetNodeId || targetNodeId.length < 1) {
          const cdp = its.getCdpSessionOrThrow();
          const tabId = context.getActiveTab().id;
          let mousePosition = undefined;
          if (config?.useBoundingBoxOverlay) {
            boundingBoxCoordinates = await page.evaluate(drawInteractableBoundingBoxes);
          }
          if (config?.useCross) {
            const event = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };
            mousePosition = await context.getBroadcastService().fetch<RemoteCursorPosition>(event);
            if (mousePosition) await page.evaluate(addCross, mousePosition.x, mousePosition.y);
          }

          const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 100 });
          if (!config?.withCursor) return { base64: data };

          if (config?.useBoundingBoxOverlay)
            await page.evaluate(() => {
              const boxes = document.querySelectorAll('.aident-bounding-box');
              boxes.forEach((box) => box.remove());
            });
          if (config?.useCross)
            await page.evaluate(() => {
              const cross = document.querySelector('.aident-cross');
              if (cross) cross.remove();
            });
          if (!config?.useCross) {
            const event = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };
            mousePosition = await context.getBroadcastService().fetch<RemoteCursorPosition>(event);
          }
          if (!mousePosition) mousePosition = await genResetMouseAtPageCenterArea(context, sendBroadcastEvent, tabId);

          const cursorType = SupportedRemoteCursorTypes.has(mousePosition.cursor) ? mousePosition.cursor : 'default';
          const overlayOffset = { x: round(mousePosition.x), y: round(mousePosition.y) };
          const response = await fetch(getHost() + '/api/utils/sharp', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({ backgroundBase64: data, overlayOffset, cursorType }),
          });
          if (!response.ok) throw new Error(`Failed to overlay mouse cursor on screenshot: ${response.statusText}`);

          const json = await response.json();
          if (!config?.useBoundingBoxCoordinates) {
            return { base64: json.base64 };
          }
          return {
            base64: json.base64,
            boundingBoxCoordinates: JSON.stringify(boundingBoxCoordinates),
          };
        }

        const node = its.getInteractableOrThrow().getNodeById(targetNodeId.toString());
        if (!node) throw new Error(`Node with id ${targetNodeId} not found in the interactable tree.`);
        const handle = await node.fetchHandleOrThrow();
        const buffer = await handle.screenshot({ encoding: 'binary', ...options });
        screenshot = buffer as Buffer;
        break;
      }
      default:
        throw new Error(`Invalid action ${action}`);
    }

    return { base64: screenshot?.toString('base64') };
  }
}

enforceBaseActionConfigStatic(Screenshot_ActionConfig);
