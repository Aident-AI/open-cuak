import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class FetchInteractableNodeBySnapshotId_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_BY_SNAPSHOT_NANOID;

  public static description = undefined;

  public static requestPayloadSchema = z.object({ snapshotNanoid: z.string() });

  public static responsePayloadSchema = z.object({ iNodeId: z.string() });

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const it = context.getInteractableService().getInteractableOrThrow();
    const target = payload.snapshotNanoid;
    const node = it.getNodeBySnapshotNanoid(target);
    if (!node) throw new Error(`Node with snapshot ID ${target} not found`);
    return { iNodeId: node.iNodeId };
  }
}

enforceBaseActionConfigStatic(FetchInteractableNodeBySnapshotId_ActionConfig);
