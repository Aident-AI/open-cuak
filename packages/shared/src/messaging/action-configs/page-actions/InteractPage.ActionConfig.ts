import { oneLine } from 'common-tags';
import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import {
  IncludeTreeAfterwards,
  SimplifiedTreeResponse,
  TargetNodeIdSchema,
} from '~shared/messaging/action-configs/page-actions/mixins';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class InteractPage_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.INTERACT_PAGE;

  public static description = `Interact with the current page using allowed actions.`;

  public static requestPayloadSchema = z.object({
    interaction: z.nativeEnum(InteractableInteraction),
    targetNodeId: TargetNodeIdSchema,
    config: z.record(z.string(), z.any()).optional().describe(oneLine`
      Each interaction has different required config fields (some might need none).
    `),
    ...IncludeTreeAfterwards,
  });

  public static responsePayloadSchema = z.object({ ...SimplifiedTreeResponse });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const it = context.getInteractableService().getInteractableOrThrow();
    const { interaction, targetNodeId, config, includeTreeAfterwards } = payload;
    const node = targetNodeId.length < 1 ? it.getRoot() : it.getNodeBySnapshotNanoid(targetNodeId);
    if (!node) throw new Error(`Node with id ${targetNodeId} not found in the interactable tree.`);

    await node.performInteraction(interaction, config);
    if (!includeTreeAfterwards) return {};
    return { tree: await it.fetchNodeTree() };
  }
}

enforceBaseActionConfigStatic(InteractPage_ActionConfig);
