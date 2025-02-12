import { z } from 'zod';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class BuildInteractableForSnapshot_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.BUILD_INTERACTABLE_FOR_SNAPSHOT;

  public static description = 'Build interactable node-tree for a rrweb-snapshot.';

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = InteractableObject.TreeNodeSchema;

  public static override async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const it = await context.getInteractableService().buildFromSnapshot(payload);
    const tree = await it.fetchViewTree();
    return tree as InteractableObject.TreeNode;
  }
}

enforceBaseActionConfigStatic(BuildInteractableForSnapshot_ActionConfig);
