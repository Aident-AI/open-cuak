import { oneLine } from 'common-tags';
import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { InteractableNodeTreeConfig } from '~shared/interactable/types';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export type ReadScreenResponse = z.infer<typeof ReadScreen_ActionConfig.responsePayloadSchema>;

export class ReadScreen_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.READ_SCREEN;

  public static description = oneLine`
    Read the page content on the screen (e.g. in the viewport). This will fetch an Interactable Node Tree for the current
    view. Use this preferable than 'FetchFullPage', because this action reads content view by view.
  `;

  public static requestPayloadSchema = z.object({
    hideBoundingBoxes: z.boolean().optional().default(false).describe(oneLine`
      Whether to skip bounding boxes for all nodes, defaulting to false. Bounding boxes are rectangles encompassing
      visible content of an element (unit in pixel). Leaf elements might not have bounding boxes (e.g. undefined).
    `),
    includeTabInfo: z.boolean().optional().default(false).describe(oneLine`
      Include tab info in the response. Defaulting to false.
    `),
  });

  public static responsePayloadSchema = z.object({
    tree: z.any().optional().describe(oneLine`
        The \`Interactable\` tree object of the page from the root node (page root if no root is set). This represents the
        structure and content of the page. Based on the config, some nodes may be collapsed and some attributes may be
        paginated to fit the response size.
      `),
    tabInfo: ChromeTabSchema.optional().describe(`The tab info of the current page.`),
    emptyReason: z.string().optional().describe(oneLine`
      If the tree is empty, this field will be set to the reason why it is empty.
    `),
  });

  @ActionConfigAutoAttachesToInteractable // TODO: separate interactable-service attachment and fetching snapshot
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const it = context.getInteractableService().getInteractableOrThrow();
    await it.refresh();
    const { includeTabInfo, ...config } = payload;
    const fetchConfig = { ...config, onlyInView: true };
    const tree = await it.fetchNodeTree(undefined, fetchConfig as InteractableNodeTreeConfig);
    return includeTabInfo ? { tree, tabInfo: context.getActiveTab() } : { tree };
  }
}

enforceBaseActionConfigStatic(ReadScreen_ActionConfig);
