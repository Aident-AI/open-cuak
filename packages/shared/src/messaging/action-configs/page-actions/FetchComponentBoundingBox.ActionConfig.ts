import { z } from 'zod';
import { ComponentBoundingBoxSchema } from '~shared/agent/ComponentBoundingBox';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class FetchComponentBoundingBox_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_COMPONENT_BOUNDING_BOX;

  public static description = `Fetch the bounding box of the target component on the page using xpath.`;

  public static requestPayloadSchema = z.object({ xpath: z.string().describe(`The xpath of the target component.`) });

  public static responsePayloadSchema = z.object({
    found: z.boolean().describe('Whether the target component is found.'),
    boundingBox: ComponentBoundingBoxSchema.optional().describe('The bounding box of the target component.'),
  });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const page = context.getInteractableService().getPageOrThrow();
    const elementHandle = await page.$('xpath=' + payload.xpath);
    if (!elementHandle) return { found: false };

    const boundingBox = await elementHandle.boundingBox();
    if (!boundingBox) return { found: false };

    return { found: true, boundingBox };
  }
}

enforceBaseActionConfigStatic(FetchComponentBoundingBox_ActionConfig);
